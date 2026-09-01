'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

type Item = {
  id: number
  cantidad: number
  productos: { nombre: string } | null
}

type Pedido = {
  id: number
  estado: string
  total: number
  creado_en: string
  mesas: { numero: number } | null
  pedido_items: Item[]
}

type Turno = {
  id: number
  abierto_en: string
  cerrado_en: string | null
  monto_apertura: number
  monto_esperado: number | null
  monto_declarado: number | null
  diferencia: number | null
}

export default function CajaPage() {
  const [turno, setTurno] = useState<Turno | null>(null)
  const [pendientes, setPendientes] = useState<Pedido[]>([])
  const [pagadosTurno, setPagadosTurno] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  const [montoApertura, setMontoApertura] = useState('')
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [montoDeclarado, setMontoDeclarado] = useState('')
  const [resultadoCierre, setResultadoCierre] = useState<Turno | null>(null)

  const cargarTurnoActivo = async () => {
    const { data } = await supabase
      .from('turnos_caja')
      .select('*')
      .is('cerrado_en', null)
      .order('abierto_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    setTurno(data)
    return data
  }

  const cargarPedidos = async (turnoActual: Turno | null) => {
    const { data: entregados } = await supabase
      .from('pedidos')
      .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre))')
      .eq('estado', 'entregado')
      .order('creado_en', { ascending: true })
    setPendientes((entregados as any) || [])

    if (turnoActual) {
      const { data: pagados } = await supabase
        .from('pedidos')
        .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre))')
        .eq('estado', 'pagado')
        .eq('turno_id', turnoActual.id)
        .order('creado_en', { ascending: false })
      setPagadosTurno((pagados as any) || [])
    } else {
      setPagadosTurno([])
    }
  }

  const cargarTodo = async () => {
    const t = await cargarTurnoActivo()
    await cargarPedidos(t)
    setCargando(false)
  }

  useEffect(() => {
    cargarTodo()
    const channel = supabase
      .channel('caja-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarTodo())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const abrirTurno = async () => {
    const monto = parseFloat(montoApertura)
    if (isNaN(monto) || monto < 0) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('turnos_caja').insert({
      monto_apertura: monto,
      usuario_email: userData.user?.email || null,
    })
    setMontoApertura('')
    cargarTodo()
  }

  const marcarPagado = async (id: number) => {
    if (!turno) return
    await supabase.from('pedidos').update({ estado: 'pagado', turno_id: turno.id }).eq('id', id)
  }

  const totalVentasTurno = pagadosTurno.reduce((s, p) => s + Number(p.total), 0)
  const montoEsperado = turno ? Number(turno.monto_apertura) + totalVentasTurno : 0

  const confirmarCierre = async () => {
    if (!turno) return
    const declarado = parseFloat(montoDeclarado)
    if (isNaN(declarado)) return
    const diferencia = declarado - montoEsperado

    const { data } = await supabase
      .from('turnos_caja')
      .update({
        cerrado_en: new Date().toISOString(),
        monto_esperado: montoEsperado,
        monto_declarado: declarado,
        diferencia,
      })
      .eq('id', turno.id)
      .select()
      .single()

    setResultadoCierre(data)
    setMostrarCierre(false)
    setMontoDeclarado('')
    cargarTodo()
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando caja...
      </div>
    )

  // Pantalla de resumen post-cierre
  if (resultadoCierre) {
    const dif = Number(resultadoCierre.diferencia)
    return (
      <RequireAuth roles={['admin', 'caja']}>
        <div className="min-h-screen bg-carbon flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-carbon-light border border-line-dark rounded-xl p-6 text-center">
            <h2 className="font-display text-2xl text-cream mb-6">Turno cerrado</h2>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex justify-between text-cream/60">
                <span>Apertura</span>
                <span className="font-mono">Gs. {Number(resultadoCierre.monto_apertura).toLocaleString('es-PY')}</span>
              </div>
              <div className="flex justify-between text-cream/60">
                <span>Esperado</span>
                <span className="font-mono">Gs. {Number(resultadoCierre.monto_esperado).toLocaleString('es-PY')}</span>
              </div>
              <div className="flex justify-between text-cream/60">
                <span>Contado</span>
                <span className="font-mono">Gs. {Number(resultadoCierre.monto_declarado).toLocaleString('es-PY')}</span>
              </div>
              <div
                className={`flex justify-between pt-2 border-t border-line-dark font-medium ${
                  dif === 0 ? 'text-basil' : dif > 0 ? 'text-wheat' : 'text-tomato'
                }`}
              >
                <span>Diferencia</span>
                <span className="font-mono">
                  {dif > 0 ? '+' : ''}
                  Gs. {dif.toLocaleString('es-PY')}
                </span>
              </div>
            </div>
            <p className="text-cream/40 text-xs mb-4">
              {dif === 0
                ? 'Cuadró perfecto.'
                : dif > 0
                ? 'Sobró dinero respecto a lo esperado.'
                : 'Faltó dinero respecto a lo esperado.'}
            </p>
            <button
              onClick={() => setResultadoCierre(null)}
              className="w-full bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg py-2.5"
            >
              Abrir nuevo turno
            </button>
          </div>
        </div>
      </RequireAuth>
    )
  }

  // Pantalla de apertura de turno
  if (!turno) {
    return (
      <RequireAuth roles={['admin', 'caja']}>
        <div className="min-h-screen bg-carbon flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-carbon-light border border-line-dark rounded-xl p-6">
            <h2 className="font-display text-2xl text-cream mb-2 text-center">Abrir turno de caja</h2>
            <p className="text-cream/40 text-sm mb-6 text-center">
              Ingresá el monto de caja chica que recibís para el vuelto.
            </p>
            <input
              placeholder="Monto de apertura (Gs.)"
              type="number"
              value={montoApertura}
              onChange={(e) => setMontoApertura(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && abrirTurno()}
              className="w-full bg-carbon border border-line-dark rounded-lg px-4 py-3 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors mb-4"
            />
            <button
              onClick={abrirTurno}
              className="w-full bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg py-3"
            >
              Abrir turno
            </button>
          </div>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth roles={['admin', 'caja']}>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Caja</h1>
            </div>
            <button onClick={cerrarSesion} className="text-cream/40 hover:text-tomato transition-colors text-sm">
              Salir
            </button>
          </div>
          <p className="text-cream/30 text-xs mb-6">
            Turno abierto {new Date(turno.abierto_en).toLocaleString('es-PY')}
          </p>

          <div className="bg-carbon-light border border-line-dark rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center mb-4">
              <div>
                <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">Apertura</p>
                <p className="font-mono text-xl text-cream/70">
                  Gs. {Number(turno.monto_apertura).toLocaleString('es-PY')}
                </p>
              </div>
              <div>
                <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">Ventas del turno</p>
                <p className="font-mono text-xl text-wheat">Gs. {totalVentasTurno.toLocaleString('es-PY')}</p>
              </div>
            </div>
            <div className="border-t border-line-dark pt-4 text-center">
              <p className="text-cream/40 text-xs uppercase tracking-widest mb-1">Esperado en caja</p>
              <p className="font-mono text-3xl text-cream">Gs. {montoEsperado.toLocaleString('es-PY')}</p>
            </div>
          </div>

          {!mostrarCierre ? (
            <button
              onClick={() => setMostrarCierre(true)}
              className="w-full bg-cream/10 hover:bg-cream/15 transition-colors text-cream font-medium rounded-lg py-3 mb-10"
            >
              Cerrar turno
            </button>
          ) : (
            <div className="bg-carbon-light border border-tomato rounded-xl p-5 mb-10">
              <h3 className="text-cream font-medium mb-3 text-sm uppercase tracking-wide">
                Contá el dinero en caja
              </h3>
              <input
                placeholder="Monto contado (Gs.)"
                type="number"
                value={montoDeclarado}
                onChange={(e) => setMontoDeclarado(e.target.value)}
                className="w-full bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={confirmarCierre}
                  className="flex-1 bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg py-2.5"
                >
                  Confirmar cierre
                </button>
                <button
                  onClick={() => setMostrarCierre(false)}
                  className="flex-1 bg-cream/10 text-cream/60 rounded-lg py-2.5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <h3 className="text-cream/50 text-xs uppercase tracking-widest mb-3">
            Pendientes de cobro ({pendientes.length})
          </h3>
          {pendientes.length === 0 ? (
            <p className="text-cream/30 text-sm mb-10">No hay pedidos esperando pago.</p>
          ) : (
            <div className="space-y-2 mb-10">
              {pendientes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-carbon-light border border-line-dark rounded-lg px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-cream text-sm">
                      Mesa {p.mesas?.numero} · <span className="font-mono">#{p.id}</span>
                    </p>
                    <p className="text-cream/40 text-xs mt-0.5">
                      {p.pedido_items.map((it) => `${it.cantidad}× ${it.productos?.nombre}`).join(', ')}
                    </p>
                  </div>
                  <span className="font-mono text-wheat">Gs. {Number(p.total).toLocaleString('es-PY')}</span>
                  <button
                    onClick={() => marcarPagado(p.id)}
                    className="bg-basil/20 hover:bg-basil/30 text-basil transition-colors text-xs px-3 py-2 rounded-md font-medium"
                  >
                    Marcar pagado
                  </button>
                </div>
              ))}
            </div>
          )}

          <h3 className="text-cream/50 text-xs uppercase tracking-widest mb-3">
            Cobrados en este turno ({pagadosTurno.length})
          </h3>
          {pagadosTurno.length === 0 ? (
            <p className="text-cream/30 text-sm">Todavía no se cobró ningún pedido en este turno.</p>
          ) : (
            <div className="space-y-1">
              {pagadosTurno.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm py-2 border-b border-line-dark text-cream/60"
                >
                  <span>
                    Mesa {p.mesas?.numero} · <span className="font-mono">#{p.id}</span>
                  </span>
                  <span className="font-mono">Gs. {Number(p.total).toLocaleString('es-PY')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}