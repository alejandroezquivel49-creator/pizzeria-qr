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

  if (cargando) return <div style={{ padding: 40 }}>Cargando caja...</div>

  return (
    <RequireAuth>
      <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Caja</h1>
          <button onClick={cerrarSesion} style={{ fontSize: 13 }}>
            Cerrar sesión
          </button>
        </div>

        <div
          style={{
            background: '#2A2320',
            color: '#fff',
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Total cobrado hoy</span>
          <strong>${totalDelDia.toLocaleString('es-AR')}</strong>
        </div>

        <h3>Pendientes de cobro ({pendientes.length})</h3>
        {pendientes.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>No hay pedidos esperando pago.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
            {pendientes.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    Mesa {p.mesas?.numero} · #{p.id}
                  </strong>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {p.pedido_items.map((it) => `${it.cantidad}x ${it.productos?.nombre}`).join(', ')}
                  </div>
                </div>
                <span style={{ fontWeight: 600 }}>${Number(p.total).toLocaleString('es-AR')}</span>
                <button onClick={() => marcarPagado(p.id)} style={{ padding: '8px 16px' }}>
                  Marcar pagado
                </button>
              </div>
            ))}
          </div>
        )}

        <h3>Cobrados hoy ({pagadosHoy.length})</h3>
        {pagadosHoy.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13 }}>Todavía no se cobró ningún pedido hoy.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pagadosHoy.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  padding: '6px 0',
                  borderBottom: '1px solid #eee',
                }}
              >
                <span>
                  Mesa {p.mesas?.numero} · #{p.id}
                </span>
                <span>${Number(p.total).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireAuth>
  )
}