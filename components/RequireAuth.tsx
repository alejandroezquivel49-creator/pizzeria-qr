'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
      if (!data.session) router.push('/login')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) router.push('/login')
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  if (cargando) return <div style={{ padding: 40 }}>Verificando acceso...</div>
  if (!session) return null

  return <>{children}</>
}