'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

const ESTADOS = ['recibido', 'preparando', 'listo']
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

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)

  const cargarPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, estado, total, creado_en, mesas(numero), pedido_items(id, cantidad, productos(nombre,requiere_preparacion))')
            .in('estado', ['recibido', 'preparando', 	'listo'])
      .order('creado_en', { ascending: false })

    setPedidos((data as any) || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarPedidos()

    // Suscripción en tiempo real: cualquier cambio en pedidos refresca la lista
    const channel = supabase
      .channel('cocina-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => cargarPedidos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const avanzarEstado = async (pedido: Pedido) => {
    const siguiente = SIGUIENTE[pedido.estado]
    if (!siguiente) return
    await supabase.from('pedidos').update({ estado: siguiente }).eq('id', pedido.id)
    // No hace falta llamar cargarPedidos() acá: la suscripción realtime lo hace sola
  }

  if (cargando) return <div style={{ padding: 40 }}>Cargando pedidos...</div>

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Pedidos en curso</h1>
      <p style={{ color: '#888', fontSize: 13 }}>{pedidos.length} pedidos activos</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}
      >
        {pedidos.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>
                Mesa {p.mesas?.numero} · #{p.id}
              </strong>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background:
                    p.estado === 'recibido' ? '#fde2e2' : p.estado === 'preparando' ? '#fdf0c8' : '#dbf0c9',
                }}
              >
                {p.estado}
              </span>
            </div>
                     {p.pedido_items
              .filter((it) => it.productos?.requiere_preparacion)
              .map((it) => (
                <div key={it.id} style={{ fontSize: 13 }}>
                  {it.cantidad}x {it.productos?.nombre}
                </div>
              ))}
            {p.pedido_items.some((it) => !it.productos?.requiere_preparacion) && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 6, borderTop: '1px dashed #ddd', paddingTop: 6 }}>
                También llevar:{' '}
                {p.pedido_items
                  .filter((it) => !it.productos?.requiere_preparacion)
                  .map((it) => `${it.cantidad}x ${it.productos?.nombre}`)
                  .join(', ')}
              </div>
            )}
            <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>Total: ${p.total}</p>
                  <button onClick={() => avanzarEstado(p)} style={{ width: '100%', padding: 8 }}>
              {LABEL_BOTON[p.estado]}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}