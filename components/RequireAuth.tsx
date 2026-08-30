'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

type Props = {
  children: React.ReactNode
  roles?: string[] // roles permitidos para esta página; si no se pasa, cualquier usuario logueado entra
}

export default function RequireAuth({ children, roles }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [permitido, setPermitido] = useState(false)

  const chequearAcceso = (s: Session | null) => {
    if (!s) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    const rol = s.user.user_metadata?.role
    if (roles && !roles.includes(rol)) {
      setPermitido(false)
      return
    }
    setPermitido(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
      chequearAcceso(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      chequearAcceso(s)
    })

    return () => listener.subscription.unsubscribe()
  }, [router, pathname])

  if (cargando) return <div style={{ padding: 40 }}>Verificando acceso...</div>
  if (!session) return null

  if (!permitido) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2>Acceso restringido</h2>
        <p style={{ color: '#888' }}>Tu usuario no tiene permiso para ver esta sección.</p>
        <a href="/login" style={{ color: '#c1401c' }}>
          Volver a ingresar
        </a>
      </div>
    )
  }

  return <>{children}</>
}