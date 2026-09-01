'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

type Item = {
  id: number
  cantidad: number
  productos: { nombre: string; requiere_preparacion: boolean } | null
}

type Pedido = {
  id: number
  estado: string
  total: number
  creado_en: string
  mesas: { numero: number } | null
  pedido_items: Item[]
}

const SIGUIENTE: Record<string, string> = {
  recibido: 'preparando',
  preparando: 'listo',
  listo: 'entregado',
}
const LABEL_BOTON: Record<string, string> = {
  recibido: 'Empezar preparación',
  preparando: 'Marcar listo',
  listo: 'Entregado',
}
const COLOR_ESTADO: Record<string, string> = {
  recibido: 'bg-tomato/20 text-tomato',
  preparando: 'bg-wheat/20 text-wheat',
  listo: 'bg-basil/20 text-basil',
}
const ROTACIONES = ['-rotate-1', 'rotate-0', 'rotate-1', '-rotate-[0.5deg]']

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre, requiere_preparacion))')
      .in('estado', ['recibido', 'preparando', 'listo'])
      .order('creado_en', { ascending: false })

    setPedidos((data as any) || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarPedidos()
    const channel = supabase
      .channel('cocina-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => cargarPedidos())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const avanzarEstado = async (pedido: Pedido) => {
    const siguiente = SIGUIENTE[pedido.estado]
    if (!siguiente) return
    await supabase.from('pedidos').update({ estado: siguiente }).eq('id', pedido.id)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando pedidos...
      </div>
    )

  return (
    <RequireAuth roles={['admin', 'cocina']}>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Riel de pedidos</h1>
            </div>
            <button onClick={cerrarSesion} className="text-cream/40 hover:text-tomato transition-colors text-sm">
              Salir
            </button>
          </div>
          <p className="text-cream/40 text-sm mb-8">{pedidos.length} pedidos activos</p>

          {pedidos.length === 0 ? (
            <div className="border border-dashed border-line-dark rounded-xl py-16 text-center text-cream/30 text-sm">
              No hay pedidos en curso. La cocina está tranquila.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pedidos.map((p, i) => (
                <div
                  key={p.id}
                  className={`bg-cream text-carbon rounded-sm p-4 shadow-xl border-2 border-dashed border-carbon/15 ${ROTACIONES[i % ROTACIONES.length]} hover:rotate-0 transition-transform`}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-mono text-2xl font-medium">#{p.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-medium ${COLOR_ESTADO[p.estado]}`}>
                      {p.estado}
                    </span>
                  </div>
                  <p className="text-xs text-carbon/50 mb-3 uppercase tracking-wide">Mesa {p.mesas?.numero}</p>

                  <div className="border-t border-b border-dashed border-carbon/15 py-2 mb-3 space-y-1">
                    {p.pedido_items
                      .filter((it) => it.productos?.requiere_preparacion)
                      .map((it) => (
                        <div key={it.id} className="text-sm font-mono">
                          {it.cantidad}× {it.productos?.nombre}
                        </div>
                      ))}
                  </div>

                  {p.pedido_items.some((it) => !it.productos?.requiere_preparacion) && (
                    <p className="text-xs text-carbon/50 mb-3 italic">
                      También llevar:{' '}
                      {p.pedido_items
                        .filter((it) => !it.productos?.requiere_preparacion)
                        .map((it) => `${it.cantidad}× ${it.productos?.nombre}`)
                        .join(', ')}
                    </p>
                  )}

                  <p className="font-mono text-sm text-carbon/60 mb-3">Total Gs. {p.total.toLocaleString('es-PY')}</p>

                  <button
                    onClick={() => avanzarEstado(p)}
                    className="w-full bg-carbon hover:bg-carbon-light transition-colors text-cream text-sm font-medium rounded-sm py-2"
                  >
                    {LABEL_BOTON[p.estado]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  )
}