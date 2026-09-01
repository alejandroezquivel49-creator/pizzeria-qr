'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

type Producto = {
  id: number
  nombre: string
  precio: number
  disponible: boolean
  categoria_id: number
  requiere_preparacion: boolean
  imagen_url: string | null
}

type Categoria = {
  id: number
  nombre: string
}

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [requierePrep, setRequierePrep] = useState(true)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [cargando, setCargando] = useState(true)

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editRequierePrep, setEditRequierePrep] = useState(true)
  const [editImagenFile, setEditImagenFile] = useState<File | null>(null)
  const [editImagenActual, setEditImagenActual] = useState<string | null>(null)

  const cargarDatos = async () => {
    const { data: prods } = await supabase.from('productos').select('*').order('id')
    const { data: cats } = await supabase.from('categorias').select('*').order('orden')
    setProductos(prods || [])
    setCategorias(cats || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const subirImagen = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('productos').upload(nombreArchivo, file)
    if (error) {
      alert('Error al subir la imagen: ' + error.message)
      return null
    }
    const { data } = supabase.storage.from('productos').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  const agregarProducto = async () => {
    if (!nombre || !precio || !categoriaId) return

    let imagenUrl: string | null = null
    if (imagenFile) {
      setSubiendoImagen(true)
      imagenUrl = await subirImagen(imagenFile)
      setSubiendoImagen(false)
    }

    await supabase.from('productos').insert({
      nombre,
      precio: parseFloat(precio),
      categoria_id: parseInt(categoriaId),
      disponible: true,
      requiere_preparacion: requierePrep,
      imagen_url: imagenUrl,
    })
    setNombre('')
    setPrecio('')
    setCategoriaId('')
    setImagenFile(null)
    cargarDatos()
  }

  const toggleDisponible = async (p: Producto) => {
    await supabase.from('productos').update({ disponible: !p.disponible }).eq('id', p.id)
    cargarDatos()
  }

  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Seguro que querés eliminar este producto?')) return
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        alert(
          'No se puede eliminar: este producto ya tiene pedidos asociados en el historial. Marcalo como "Sin stock" en su lugar.'
        )
      } else {
        alert('Error al eliminar: ' + error.message)
      }
      return
    }
    cargarDatos()
  }

  const empezarEdicion = (p: Producto) => {
    setEditandoId(p.id)
    setEditNombre(p.nombre)
    setEditPrecio(String(p.precio))
    setEditCategoriaId(String(p.categoria_id))
    setEditRequierePrep(p.requiere_preparacion)
    setEditImagenActual(p.imagen_url)
    setEditImagenFile(null)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
  }

  const guardarEdicion = async (id: number) => {
    if (!editNombre || !editPrecio || !editCategoriaId) return

    let imagenUrl = editImagenActual
    if (editImagenFile) {
      setSubiendoImagen(true)
      const nuevaUrl = await subirImagen(editImagenFile)
      setSubiendoImagen(false)
      if (nuevaUrl) imagenUrl = nuevaUrl
    }

    await supabase
      .from('productos')
      .update({
        nombre: editNombre,
        precio: parseFloat(editPrecio),
        categoria_id: parseInt(editCategoriaId),
        requiere_preparacion: editRequierePrep,
        imagen_url: imagenUrl,
      })
      .eq('id', id)
    cancelarEdicion()
    cargarDatos()
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando...
      </div>
    )

  return (
    <RequireAuth roles={['admin']}>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Productos</h1>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a href="/admin/categorias" className="text-cream/60 hover:text-wheat transition-colors">
                Categorías
              </a>
              <a href="/admin/mesas" className="text-cream/60 hover:text-wheat transition-colors">
                Mesas
              </a>
              <a href="/admin/qr" className="text-cream/60 hover:text-wheat transition-colors">
                Generar QR →
              </a>
              <button onClick={cerrarSesion} className="text-cream/40 hover:text-tomato transition-colors">
                Salir
              </button>
            </div>
          </div>

          <div className="bg-carbon-light border border-line-dark rounded-xl p-5 mb-8">
            <h3 className="text-cream font-medium mb-4 text-sm uppercase tracking-wide">Nuevo producto</h3>
            <div className="space-y-3">
              <input
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
              />
              <input
                placeholder="Precio"
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                className="w-full bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
              />
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream outline-none focus:border-tomato transition-colors"
              >
                <option value="">Elegí una categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <div>
                <label className="text-cream/50 text-xs block mb-1.5">Foto del producto (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagenFile(e.target.files?.[0] || null)}
                  className="w-full text-cream/70 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-tomato/20 file:text-tomato file:cursor-pointer"
                />
              </div>
              <label className="flex items-center gap-2 text-cream/70 text-sm">
                <input
                  type="checkbox"
                  checked={requierePrep}
                  onChange={(e) => setRequierePrep(e.target.checked)}
                  className="accent-tomato"
                />
                Requiere preparación (destildar para bebidas)
              </label>
              <button
                onClick={agregarProducto}
                disabled={subiendoImagen}
                className="w-full bg-tomato hover:bg-tomato-dark disabled:opacity-50 transition-colors text-cream font-medium rounded-lg py-2.5"
              >
                {subiendoImagen ? 'Subiendo imagen...' : 'Agregar'}
              </button>
            </div>
          </div>

          <h3 className="text-cream/50 text-xs uppercase tracking-widest mb-3">
            Productos existentes ({productos.length})
          </h3>
          <div className="space-y-2">
            {productos.map((p) =>
              editandoId === p.id ? (
                <div
                  key={p.id}
                  className="bg-carbon-light border border-tomato rounded-lg px-4 py-4 space-y-2"
                >
                  <input
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full bg-carbon border border-line-dark rounded-lg px-3 py-2 text-cream outline-none focus:border-tomato"
                  />
                  <input
                    type="number"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    className="w-full bg-carbon border border-line-dark rounded-lg px-3 py-2 text-cream outline-none focus:border-tomato"
                  />
                  <select
                    value={editCategoriaId}
                    onChange={(e) => setEditCategoriaId(e.target.value)}
                    className="w-full bg-carbon border border-line-dark rounded-lg px-3 py-2 text-cream outline-none focus:border-tomato"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <div>
                    {editImagenActual && (
                      <img
                        src={editImagenActual}
                        alt=""
                        className="w-16 h-16 object-cover rounded-lg mb-2"
                      />
                    )}
                    <label className="text-cream/50 text-xs block mb-1.5">
                      {editImagenActual ? 'Cambiar foto' : 'Agregar foto'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditImagenFile(e.target.files?.[0] || null)}
                      className="w-full text-cream/70 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-tomato/20 file:text-tomato file:cursor-pointer"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-cream/70 text-sm">
                    <input
                      type="checkbox"
                      checked={editRequierePrep}
                      onChange={(e) => setEditRequierePrep(e.target.checked)}
                      className="accent-tomato"
                    />
                    Requiere preparación
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => guardarEdicion(p.id)}
                      disabled={subiendoImagen}
                      className="flex-1 bg-basil/20 text-basil text-sm rounded-md py-2 disabled:opacity-50"
                    >
                      {subiendoImagen ? 'Subiendo...' : 'Guardar'}
                    </button>
                    <button
                      onClick={cancelarEdicion}
                      className="flex-1 bg-cream/10 text-cream/60 text-sm rounded-md py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-carbon-light border border-line-dark rounded-lg px-4 py-3"
                >
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-carbon flex-shrink-0" />
                  )}
                  <span className="flex-1 text-cream">{p.nombre}</span>
                  <span className="font-mono text-wheat text-sm">Gs. {p.precio.toLocaleString('es-PY')}</span>
                  <button
                    onClick={() => empezarEdicion(p)}
                    className="text-xs px-3 py-1.5 rounded-md bg-cream/10 text-cream/60 hover:text-cream transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleDisponible(p)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                      p.disponible ? 'bg-basil/20 text-basil' : 'bg-tomato/20 text-tomato'
                    }`}
                  >
                    {p.disponible ? 'Disponible' : 'Sin stock'}
                  </button>
                  <button
                    onClick={() => eliminarProducto(p.id)}
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