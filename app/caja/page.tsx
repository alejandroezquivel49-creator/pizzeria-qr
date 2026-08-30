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

export default function CajaPage() {
  const [pendientes, setPendientes] = useState<Pedido[]>([])
  const [pagadosHoy, setPagadosHoy] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarDatos = async () => {
    const inicioDelDia = new Date()
    inicioDelDia.setHours(0, 0, 0, 0)

    const { data: entregados } = await supabase
      .from('pedidos')
      .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre))')
      .eq('estado', 'entregado')
      .order('creado_en', { ascending: true })

    const { data: pagados } = await supabase
      .from('pedidos')
      .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre))')
      .eq('estado', 'pagado')
      .gte('creado_en', inicioDelDia.toISOString())
      .order('creado_en', { ascending: false })

    setPendientes((entregados as any) || [])
    setPagadosHoy((pagados as any) || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
    const channel = supabase
      .channel('caja-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarDatos())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const marcarPagado = async (id: number) => {
    await supabase.from('pedidos').update({ estado: 'pagado' }).eq('id', id)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const totalDelDia = pagadosHoy.reduce((s, p) => s + Number(p.total), 0)

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando caja...
      </div>
    )

  return (
    <RequireAuth>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Caja</h1>
            </div>
            <button onClick={cerrarSesion} className="text-cream/40 hover:text-tomato transition-colors text-sm">
              Salir
            </button>
          </div>

          <div className="bg-carbon-light border border-line-dark rounded-xl p-6 mb-10 text-center">
            <p className="text-cream/40 text-xs uppercase tracking-widest mb-2">Total cobrado hoy</p>
            <p className="font-mono text-5xl text-wheat">
              ${totalDelDia.toLocaleString('es-AR')}
            </p>
          </div>

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
                  <span className="font-mono text-wheat">${Number(p.total).toLocaleString('es-AR')}</span>
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
            Cobrados hoy ({pagadosHoy.length})
          </h3>
          {pagadosHoy.length === 0 ? (
            <p className="text-cream/30 text-sm">Todavía no se cobró ningún pedido hoy.</p>
          ) : (
            <div className="space-y-1">
              {pagadosHoy.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm py-2 border-b border-line-dark text-cream/60"
                >
                  <span>
                    Mesa {p.mesas?.numero} · <span className="font-mono">#{p.id}</span>
                  </span>
                  <span className="font-mono">${Number(p.total).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}