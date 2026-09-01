'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

type Mesa = {
  id: number
  numero: number
  nombre: string | null
  activa: boolean
}

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [numero, setNumero] = useState('')
  const [cargando, setCargando] = useState(true)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [numeroEditado, setNumeroEditado] = useState('')

  const cargarMesas = async () => {
    const { data } = await supabase.from('mesas').select('*').order('numero')
    setMesas(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarMesas()
  }, [])

  const agregarMesa = async () => {
    if (!numero) return
    const num = parseInt(numero)
    const yaExiste = mesas.some((m) => m.numero === num)
    if (yaExiste) {
      alert('Ya existe una mesa con ese número')
      return
    }
    await supabase.from('mesas').insert({ numero: num, activa: true })
    setNumero('')
    cargarMesas()
  }

  const toggleActiva = async (m: Mesa) => {
    await supabase.from('mesas').update({ activa: !m.activa }).eq('id', m.id)
    cargarMesas()
  }

  const eliminarMesa = async (id: number) => {
    await supabase.from('mesas').delete().eq('id', id)
    cargarMesas()
  }

  const empezarEdicion = (m: Mesa) => {
    setEditandoId(m.id)
    setNumeroEditado(String(m.numero))
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNumeroEditado('')
  }

  const guardarEdicion = async (m: Mesa) => {
    const nuevoNumero = parseInt(numeroEditado)
    if (!nuevoNumero || nuevoNumero === m.numero) {
      cancelarEdicion()
      return
    }
    const yaExiste = mesas.some((x) => x.numero === nuevoNumero && x.id !== m.id)
    if (yaExiste) {
      alert('Ya existe otra mesa con ese número')
      return
    }
    await supabase.from('mesas').update({ numero: nuevoNumero }).eq('id', m.id)
    cancelarEdicion()
    cargarMesas()
  }

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando mesas...
      </div>
    )

  return (
    <RequireAuth roles={['admin']}>
      <div className="min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Mesas</h1>
            </div>
            <a href="/admin" className="text-cream/60 hover:text-wheat transition-colors text-sm">
              ← Volver a productos
            </a>
          </div>

          <div className="bg-carbon-light border border-line-dark rounded-xl p-5 mb-8">
            <h3 className="text-cream font-medium mb-4 text-sm uppercase tracking-wide">Nueva mesa</h3>
            <div className="flex gap-2">
              <input
                placeholder="Número de mesa"
                type="number"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarMesa()}
                className="flex-1 bg-carbon border border-line-dark rounded-lg px-4 py-2.5 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
              />
              <button
                onClick={agregarMesa}
                className="bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg px-5"
              >
                Agregar
              </button>
            </div>
          </div>

          <h3 className="text-cream/50 text-xs uppercase tracking-widest mb-3">
            Mesas existentes ({mesas.length})
          </h3>
          <div className="space-y-2">
            {mesas.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-carbon-light border border-line-dark rounded-lg px-4 py-3"
              >
                {editandoId === m.id ? (
                  <>
                    <input
                      type="number"
                      value={numeroEditado}
                      onChange={(e) => setNumeroEditado(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && guardarEdicion(m)}
                      autoFocus
                      className="flex-1 bg-carbon border border-tomato rounded-lg px-3 py-1.5 text-cream font-mono outline-none"
                    />
                    <button
                      onClick={() => guardarEdicion(m)}
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
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-cream font-mono">Mesa {m.numero}</span>
                    <button
                      onClick={() => empezarEdicion(m)}
                      className="text-xs px-3 py-1.5 rounded-md bg-cream/10 text-cream/60 hover:text-cream transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActiva(m)}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        m.activa ? 'bg-basil/20 text-basil' : 'bg-tomato/20 text-tomato'
                      }`}
                    >
                      {m.activa ? 'Activa' : 'Inactiva'}
                    </button>
                    <button
                      onClick={() => eliminarMesa(m.id)}
                      className="text-cream/30 hover:text-tomato transition-colors text-xs px-2"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </RequireAuth>
  )
}