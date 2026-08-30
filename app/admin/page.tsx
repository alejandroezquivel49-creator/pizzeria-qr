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
  const [cargando, setCargando] = useState(true)

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

  const agregarProducto = async () => {
    if (!nombre || !precio || !categoriaId) return
    await supabase.from('productos').insert({
      nombre,
      precio: parseFloat(precio),
      categoria_id: parseInt(categoriaId),
      disponible: true,
      requiere_preparacion: requierePrep,
    })
    setNombre('')
    setPrecio('')
    setCategoriaId('')
    cargarDatos()
  }

  const toggleDisponible = async (p: Producto) => {
    await supabase.from('productos').update({ disponible: !p.disponible }).eq('id', p.id)
    cargarDatos()
  }

  const eliminarProducto = async (id: number) => {
    await supabase.from('productos').delete().eq('id', id)
    cargarDatos()
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (cargando) return <div style={{ padding: 40 }}>Cargando...</div>

  return (
    <RequireAuth>
      <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Administrar productos</h1>
          <div>
            <a href="/admin/qr" style={{ fontSize: 14, marginRight: 12 }}>
              Generar códigos QR →
            </a>
            <button onClick={cerrarSesion} style={{ fontSize: 13 }}>
              Cerrar sesión
            </button>
          </div>
        </div>

        <div style={{ margin: '20px 0', padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Nuevo producto</h3>
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ display: 'block', marginBottom: 8, padding: 6, width: '100%' }}
          />
          <input
            placeholder="Precio"
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            style={{ display: 'block', marginBottom: 8, padding: 6, width: '100%' }}
          />
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            style={{ display: 'block', marginBottom: 8, padding: 6, width: '100%' }}
          >
            <option value="">Elegí una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={requierePrep}
              onChange={(e) => setRequierePrep(e.target.checked)}
            />{' '}
            Requiere preparación (destildar para bebidas)
          </label>
          <button onClick={agregarProducto} style={{ padding: '8px 16px' }}>
            Agregar
          </button>
        </div>

        <h3>Productos existentes</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {productos.map((p) => (
            <li
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
              <button onClick={() => toggleDisponible(p)}>
                {p.disponible ? 'Disponible' : 'Sin stock'}
              </button>
              <button onClick={() => eliminarProducto(p.id)} style={{ color: 'red' }}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </RequireAuth>
  )
}