'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '@/lib/supabase'
import RequireAuth from '@/components/RequireAuth'

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

  if (cargando)
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center text-cream/50 text-sm">
        Cargando mesas...
      </div>
    )

  return (
    <RequireAuth>
      <style>{`
        @media print {
          .no-imprimir { display: none; }
          .fondo-pantalla { background: white !important; }
          .hoja-qr {
            page-break-after: always;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: white !important;
            border-color: #ddd !important;
          }
          .hoja-qr * { color: black !important; }
        }
      `}</style>

      <div className="fondo-pantalla min-h-screen bg-carbon px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="no-imprimir flex items-center justify-between mb-2">
            <div>
              <p className="text-tomato text-xs tracking-widest uppercase mb-1">Panel staff</p>
              <h1 className="font-display text-3xl text-cream">Códigos QR por mesa</h1>
            </div>
            <a href="/admin" className="text-cream/60 hover:text-wheat transition-colors text-sm">
              ← Volver a productos
            </a>
          </div>
          <p className="no-imprimir text-cream/40 text-sm mb-6">
            Imprimí esta página (Ctrl+P) — cada QR sale en una hoja separada, listo para plastificar y poner en la mesa.
          </p>
          <button
            onClick={() => window.print()}
            className="no-imprimir bg-tomato hover:bg-tomato-dark transition-colors text-cream font-medium rounded-lg px-5 py-2.5 mb-8 text-sm"
          >
            Imprimir todos
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {mesas.map((m) => {
              const url = `${baseUrl}/pedir?mesa=${m.numero}`
              return (
                <div
                  key={m.id}
                  className="hoja-qr bg-carbon-light border border-line-dark rounded-xl p-6 text-center"
                >
                  <p className="font-display italic text-tomato text-sm mb-1">Pizzería Napoli</p>
                  <h2 className="font-display text-2xl text-cream mb-4">Mesa {m.numero}</h2>
                  <div className="bg-cream p-3 rounded-lg inline-block">
                    <QRCodeSVG value={url} size={180} />
                  </div>
                  <p className="text-cream/30 text-[10px] mt-4 break-all font-mono">{url}</p>
                  <p className="text-cream/50 text-xs mt-2">Escaneá para ver el menú y pedir</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </RequireAuth>
  )
}