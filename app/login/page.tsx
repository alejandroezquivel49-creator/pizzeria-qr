'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

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

    if (next !== '/admin') {
      router.push(next)
      return
    }

    // Si no venía de un link específico, redirigir según el rol
    const { data: userData } = await supabase.auth.getUser()
    const rol = userData.user?.user_metadata?.role
    if (rol === 'cocina') router.push('/cocina')
    else if (rol === 'caja') router.push('/caja')
    else router.push('/admin')
}
  return (

    <div className="min-h-screen bg-carbon flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-1">
  <Image src="/pizza.jpg" alt="Pizza" width={28} height={28} className="rounded-full object-cover" />
  <p className="font-display italic text-tomato text-lg">Napoli</p>
</div>
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
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-carbon" />}>
      <LoginContent />
    </Suspense>
  )
}