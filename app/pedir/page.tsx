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
  imagen_url: string | null
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

const PASOS = ['recibido', 'preparando', 'listo']
const LABEL_PASO: Record<string, string> = {
  recibido: 'Recibido',
  preparando: 'Preparando',
  listo: 'Listo',
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

  if (cargando)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center text-carbon/40 text-sm">
        Cargando menú...
      </div>
    )

  // Vista: pedido enviado, seguimiento en vivo
  if (pedido) {
    const idx = PASOS.indexOf(pedido.estado)
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="text-carbon/40 text-xs uppercase tracking-widest text-center mb-1">
            Mesa {numeroMesa} · #{pedido.id}
          </p>
          <h2 className="font-display italic text-3xl text-carbon text-center mb-8">
            {pedido.estado === 'listo'
              ? '¡Tu pedido está listo!'
              : pedido.estado === 'preparando'
              ? 'Preparando tu pedido'
              : 'Pedido recibido'}
          </h2>

          <div className="flex items-center mb-10">
            {PASOS.map((paso, i) => (
              <div key={paso} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-colors ${
                      i <= idx ? 'bg-tomato text-cream' : 'bg-carbon/10 text-carbon/30'
                    }`}
                  >
                    {i <= idx ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[11px] mt-2 ${i === idx ? 'text-carbon font-medium' : 'text-carbon/40'}`}
                  >
                    {LABEL_PASO[paso]}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 mx-1 ${i < idx ? 'bg-tomato' : 'bg-carbon/10'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-carbon/10 pt-4">
            <p className="text-carbon/40 text-xs uppercase tracking-widest mb-2">Tu pedido</p>
           <p className="font-mono text-lg text-carbon">Gs. {pedido.total.toLocaleString('es-PY')}</p>
            <p className="text-carbon/40 text-xs mt-4 text-center">
              Pagás en caja al retirar o cuando te lo traigan
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Vista: menú + carrito
  return (
    <div className="min-h-screen bg-cream pb-32">
      <div className="max-w-lg mx-auto px-6 pt-10">
        <p className="text-tomato text-xs uppercase tracking-widest mb-1">Mesa {numeroMesa}</p>
        <h1 className="font-display italic text-4xl text-carbon mb-8">Menú</h1>

        {categorias.map((cat) => (
          <div key={cat.id} className="mb-8">
            <h3 className="text-carbon/40 text-xs uppercase tracking-widest mb-3">{cat.nombre}</h3>
            <div className="space-y-2">
              {productos
                .filter((p) => p.categoria_id === cat.id)
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 bg-white/60 border border-carbon/10 rounded-xl px-4 py-3"
                  >
                    
		                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-carbon/5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-carbon font-medium">{p.nombre}</p>
                      <p className="font-mono text-carbon/50 text-sm">Gs. {p.precio.toLocaleString('es-PY')}</p>
                    </div>
                    {cart[p.id] ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => removeItem(p.id)}
                          className="w-7 h-7 rounded-full border border-carbon/20 text-carbon flex items-center justify-center hover:bg-carbon/5"
                        >
                          −
                        </button>
                        <span className="font-mono w-4 text-center">{cart[p.id]}</span>
                        <button
                          onClick={() => addItem(p.id)}
                          className="w-7 h-7 rounded-full bg-tomato text-cream flex items-center justify-center hover:bg-tomato-dark"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItem(p.id)}
                        className="text-sm bg-carbon text-cream rounded-lg px-4 py-2 hover:bg-tomato transition-colors"
                      >
                        Agregar
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {cantidad > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-carbon px-6 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <div className="flex-1">
              <p className="text-cream/50 text-xs">{cantidad} items</p>
              <p className="font-mono text-cream text-lg">Gs. {total.toLocaleString('es-PY')}</p>
            </div>
            <button
              onClick={enviarPedido}
              disabled={enviando}
              className="bg-tomato hover:bg-tomato-dark disabled:opacity-50 transition-colors text-cream font-medium rounded-lg px-6 py-3"
            >
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PedirPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center text-carbon/40 text-sm">
          Cargando...
        </div>
      }
    >
      <PedirContent />
    </Suspense>
  )
}