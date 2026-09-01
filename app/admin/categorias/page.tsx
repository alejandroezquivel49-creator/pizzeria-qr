'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

type Categoria = {
  id: number
  nombre: string
  orden: number
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(true)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const cargarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('orden')
    setCategorias(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const agregarCategoria = async () => {
    if (!nombre) return
    const maxOrden = categorias.reduce((max, c) => Math.max(max, c.orden), 0)
    await supabase.from('categorias').insert({ nombre, orden: maxOrden + 1 })
    setNombre('')
    cargarCategorias()
  }

  const empezarEdicion = (c: Categoria) => {
    setEditandoId(c.id)
    setEditNombre(c.nombre)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
  }

  const guardarEdicion = async (id: number) => {
    if (!editNombre) return
    await supabase.from('categorias').update({ nombre: editNombre }).eq('id', id)
    cancelarEdicion()
    cargarCategorias()
  }

  const moverOrden = async (c: Categoria, direccion: -1 | 1) => {
    const idx = categorias.findIndex((x) => x.id === c.id)
    const vecino = categorias[idx + direccion]
    if (!vecino) return
    await supabase.from('categorias').update({ orden: vecino.orden }).eq('id', c.id)
    await supabase.from('categorias').update({ orden: c.orden }).eq('id', vecino.id)
    cargarCategorias()
  }

  const eliminarCategoria = async (id: number) => {
    if (!confirm('¿Seguro? Esto solo funciona si no tiene productos asociados.')) return
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) {
      alert('No se puede eliminar: todavía tiene productos asignados. Movelos a otra categoría primero.')
      return
    }
    cargarCategorias()
  }

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando categorías...
      </div>
    )

  return (
    <RequireAuth roles={['admin']}>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Categorías</h1>
            </div>
            <a href="/admin" className="text-cream/60 hover:text-wheat transition-colors text-sm">
              ← Volver a productos
            </a>
          </div>

          <div className="bg-carbon-light border border-line-dark rounded-xl p-5 mb-8">
            <h3 className="text-cream font-medium mb-4 text-sm uppercase tracking-wide">Nueva categoría</h3>
            <div className="flex gap-2">
              <input
                placeholder="Ej: Postres, Entradas, Combos"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarCategoria()}
                className="flex-1 bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
              />
              <button
                onClick={agregarCategoria}
                className="bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg px-5"
              >
                Agregar
              </button>
            </div>
          </div>

          <h3 className="text-cream/50 text-xs uppercase tracking-widest mb-3">
            Categorías existentes ({categorias.length})
          </h3>
          <p className="text-cream/30 text-xs mb-3">
            El orden acá define el orden en que aparecen en el menú del cliente.
          </p>
          <div className="space-y-2">
            {categorias.map((c, idx) =>
              editandoId === c.id ? (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-carbon-light border border-tomato rounded-lg px-4 py-3"
                >
                  <input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(c.id)}
                    autoFocus
                    className="flex-1 bg-carbon border border-line-dark rounded-lg px-3 py-1.5 text-cream outline-none"
                  />
                  <button
                    onClick={() => guardarEdicion(c.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-basil/20 text-basil"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={cancelarEdicion}
                    className="text-xs px-3 py-1.5 rounded-md bg-cream/10 text-cream/60"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-carbon-light border border-line-dark rounded-lg px-4 py-3"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moverOrden(c, -1)}
                      disabled={idx === 0}
                      className="text-cream/30 hover:text-cream disabled:opacity-20 text-xs leading-none"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moverOrden(c, 1)}
                      disabled={idx === categorias.length - 1}
                      className="text-cream/30 hover:text-cream disabled:opacity-20 text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="flex-1 text-cream">{c.nombre}</span>
                  <button
                    onClick={() => empezarEdicion(c)}
                    className="text-xs px-3 py-1.5 rounded-md bg-cream/10 text-cream/60 hover:text-cream transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminarCategoria(c.id)}
                    className="text-cream/30 hover:text-tomato transition-colors text-xs px-2"
                  >
                    Eliminar
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  )
}