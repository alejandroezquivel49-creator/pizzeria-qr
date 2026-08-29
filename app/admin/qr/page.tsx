'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'

type Mesa = {
  id: number
  numero: number
  nombre: string | null
  activa: boolean
}

export default function QrPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [cargando, setCargando] = useState(true)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('mesas').select('*').eq('activa', true).order('numero')
      setMesas(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  if (cargando) return <div style={{ padding: 40 }}>Cargando mesas...</div>

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <style>{`
        @media print {
          .no-imprimir { display: none; }
          .hoja-qr {
            page-break-after: always;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
        }
      `}</style>

      <div className="no-imprimir" style={{ marginBottom: 24 }}>
        <h1>Códigos QR por mesa</h1>
        <p style={{ color: '#888', fontSize: 13 }}>
          Imprimí esta página (Ctrl+P) — cada QR sale en una hoja separada, listo para plastificar y poner en la mesa.
        </p>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', marginTop: 8 }}>
          Imprimir todos
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
        }}
      >
        {mesas.map((m) => {
          const url = `${baseUrl}/pedir?mesa=${m.numero}`
          return (
            <div
              key={m.id}
              className="hoja-qr"
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 14, color: '#888', margin: '0 0 4px' }}>Pizzería Napoli</p>
              <h2 style={{ margin: '0 0 16px' }}>Mesa {m.numero}</h2>
              <QRCodeSVG value={url} size={200} />
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 16, wordBreak: 'break-all' }}>{url}</p>
              <p style={{ fontSize: 13, marginTop: 8 }}>Escaneá para ver el menú y pedir</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}