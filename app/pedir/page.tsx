'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Producto = {
  id: number
  nombre: string
  precio: number
  disponible: boolean
  categoria_id: number
}

type Categoria = {
  id: number
  nombre: string
}

type Pedido = {
  id: number
  estado: string
  total: number
}

function PedirContent() {
  const searchParams = useSearchParams()
  const numeroMesa = searchParams.get('mesa') || '1'

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cart, setCart] = useState<Record<number, number>>({})
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [pedido, setPedido] = useState<Pedido | null>(null)

  useEffect(() => {
    const cargar = async () => {
      const { data: prods } = await supabase
        .from('productos')
        .select('*')
        .eq('disponible', true)
        .order('id')
      const { data: cats } = await supabase.from('categorias').select('*').order('orden')
      setProductos(prods || [])
      setCategorias(cats || [])
      setCargando(false)
    }
    cargar()
  }, [])

  // Escuchar cambios de estado del pedido en tiempo real
  useEffect(() => {
    if (!pedido) return
    const channel = supabase
      .channel(`pedido-${pedido.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedido.id}` },
        (payload) => {
          setPedido((prev) => (prev ? { ...prev, estado: (payload.new as any).estado } : prev))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pedido?.id])

  const addItem = (id: number) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const removeItem = (id: number) =>
    setCart((c) => {
      const n = { ...c }
      if (n[id] > 1) n[id] -= 1
      else delete n[id]
      return n
    })

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const producto = productos.find((p) => p.id === Number(id))!
    return { producto, qty }
  })
  const total = cartItems.reduce((s, i) => s + i.producto.precio * i.qty, 0)
  const cantidad = cartItems.reduce((s, i) => s + i.qty, 0)

  const enviarPedido = async () => {
    if (cantidad === 0) return
    setEnviando(true)

    // 1. Buscar el id de la mesa a partir del número
    const { data: mesa, error: errorMesa } = await supabase
      .from('mesas')
      .select('id')
      .eq('numero', numeroMesa)
      .single()

    if (errorMesa || !mesa) {
      alert('No se encontró la mesa ' + numeroMesa)
      setEnviando(false)
      return
    }

    // 2. Crear el pedido
    const { data: nuevoPedido, error: errorPedido } = await supabase
      .from('pedidos')
      .insert({ mesa_id: mesa.id, estado: 'recibido', total })
      .select()
      .single()

    if (errorPedido || !nuevoPedido) {
      alert('Error al crear el pedido: ' + errorPedido?.message)
      setEnviando(false)
      return
    }

    // 3. Crear los items del pedido
    const items = cartItems.map((i) => ({
      pedido_id: nuevoPedido.id,
      producto_id: i.producto.id,
      cantidad: i.qty,
      precio_unitario: i.producto.precio,
    }))
    const { error: errorItems } = await supabase.from('pedido_items').insert(items)

    if (errorItems) {
      alert('Error al guardar los productos: ' + errorItems.message)
      setEnviando(false)
      return
    }

    setPedido(nuevoPedido)
    setCart({})
    setEnviando(false)
  }

  if (cargando) return <div style={{ padding: 40 }}>Cargando menú...</div>

  // Vista: pedido ya enviado, mostrando estado en vivo
  if (pedido) {
    const pasos = ['recibido', 'preparando', 'listo']
    const idx = pasos.indexOf(pedido.estado)
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 400 }}>
        <p style={{ color: '#888', fontSize: 13 }}>
          Mesa {numeroMesa} · Pedido #{pedido.id}
        </p>
        <h2>
          {pedido.estado === 'listo'
            ? '¡Tu pedido está listo!'
            : pedido.estado === 'preparando'
            ? 'Tu pedido está en preparación'
            : 'Pedido recibido'}
        </h2>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          {pasos.map((p, i) => (
            <div
              key={p}
              style={{
                flex: 1,
                padding: 8,
                textAlign: 'center',
                borderRadius: 6,
                background: i <= idx ? '#2A2320' : '#eee',
                color: i <= idx ? '#fff' : '#888',
                fontSize: 12,
              }}
            >
              {p}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#888' }}>Total: ${pedido.total}</p>
        <p style={{ fontSize: 12, color: '#888' }}>Pagás en caja al retirar o cuando te lo traigan</p>
      </div>
    )
  }

  // Vista: menú + carrito
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 500 }}>
      <p style={{ color: '#888', fontSize: 13 }}>Mesa {numeroMesa}</p>
      <h1>Menú</h1>

      {categorias.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 24 }}>
          <h3>{cat.nombre}</h3>
          {productos
            .filter((p) => p.categoria_id === cat.id)
            .map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 8,
                  borderBottom: '1px solid #eee',
                }}
              >
                <span style={{ flex: 1 }}>
                  {p.nombre} — ${p.precio}
                </span>
                {cart[p.id] ? (
                  <>
                    <button onClick={() => removeItem(p.id)}>−</button>
                    <span>{cart[p.id]}</span>
                    <button onClick={() => addItem(p.id)}>+</button>
                  </>
                ) : (
                  <button onClick={() => addItem(p.id)}>Agregar</button>
                )}
              </div>
            ))}
        </div>
      ))}

      <div
        style={{
          position: 'sticky',
          bottom: 10,
          background: '#2A2320',
          color: '#fff',
          padding: 16,
          borderRadius: 8,
        }}
      >
        <p style={{ margin: '0 0 8px' }}>
          {cantidad} items — ${total}
        </p>
        <button
          onClick={enviarPedido}
          disabled={cantidad === 0 || enviando}
          style={{ width: '100%', padding: 10 }}
        >
          {enviando ? 'Enviando...' : 'Enviar pedido'}
        </button>
      </div>
    </div>
  )
}

export default function PedirPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Cargando...</div>}>
      <PedirContent />
    </Suspense>
  )
}