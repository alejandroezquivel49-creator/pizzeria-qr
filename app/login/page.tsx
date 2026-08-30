'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    setCargando(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setCargando(false)
    if (error) {
      setError('Email o contraseña incorrectos')
      return
    }
    router.push('/admin')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ width: 300 }}>
        <h2>Ingresar</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', marginBottom: 8, padding: 8, width: '100%' }}
        />
        <input
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{ display: 'block', marginBottom: 8, padding: 8, width: '100%' }}
        />
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        <button onClick={handleLogin} disabled={cargando} style={{ width: '100%', padding: 10 }}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </div>
  )
}