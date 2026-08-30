'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [logueado, setLogueado] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogueado(!!data.session))
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: 40,
      }}
    >
      <h1>🍕 Pizzería Napoli</h1>
      <p style={{ color: '#888', marginTop: 8 }}>
        Escaneá el código QR de tu mesa para ver el menú y hacer tu pedido.
      </p>

      <div style={{ marginTop: 60, fontSize: 12, color: '#ccc' }}>
        {logueado ? (
          <>
            <Link href="/admin" style={{ color: '#ccc', marginRight: 12 }}>Admin</Link>
            <Link href="/admin/qr" style={{ color: '#ccc', marginRight: 12 }}>Generar QR</Link>
            <Link href="/cocina" style={{ color: '#ccc', marginRight: 12 }}>Cocina</Link>
            <Link href="/caja" style={{ color: '#ccc' }}>Caja</Link>
          </>
        ) : (
          <Link href="/login" style={{ color: '#ccc' }}>Ingresar</Link>
        )}
      </div>
    </div>
  )
}