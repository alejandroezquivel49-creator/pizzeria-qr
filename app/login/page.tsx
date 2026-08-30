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
    <div className="min-h-screen bg-carbon flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-display italic text-tomato text-lg mb-1 text-center">🍕 Napoli</p>
        <h2 className="font-display text-2xl text-cream text-center mb-8">Acceso staff</h2>

        <div className="space-y-3">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-carbon-light border border-line-dark rounded-lg px-4 py-3 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
          />
          <input
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-carbon-light border border-line-dark rounded-lg px-4 py-3 text-cream placeholder:text-cream/30 outline-none focus:border-tomato transition-colors"
          />
        </div>

        {error && <p className="text-tomato text-sm mt-3 text-center">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={cargando}
          className="w-full mt-5 bg-tomato hover:bg-tomato-dark disabled:opacity-50 transition-colors text-cream font-medium rounded-lg py-3"
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <Link href="/" className="hidden" />
      </div>
    </div>
  )
}