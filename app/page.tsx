'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [logueado, setLogueado] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogueado(!!data.session))
  }, [])

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
	<div className="w-28 h-28 rounded-full overflow-hidden mb-6 shadow-lg shadow-tomato/20 border-4 border-tomato">
  <Image src="/pizza.jpg" alt="Pizza" width={112} height={112} className="object-cover w-full h-full" />
</div>      
      <h1 className="font-display italic text-5xl text-carbon tracking-tight">
        Pizzería Napoli
      </h1>
      <p className="text-carbon/60 mt-3 max-w-xs">
        Escaneá el código QR de tu mesa para ver el menú y hacer tu pedido.
      </p>

      <div className="mt-16 pt-6 border-t border-carbon/10 w-full max-w-xs">
        {logueado ? (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            <Link href="/admin" className="text-carbon/50 hover:text-tomato transition-colors">
              Admin
            </Link>
            <Link href="/admin/qr" className="text-carbon/50 hover:text-tomato transition-colors">
              Generar QR
            </Link>
            <Link href="/cocina" className="text-carbon/50 hover:text-tomato transition-colors">
              Cocina
            </Link>
            <Link href="/caja" className="text-carbon/50 hover:text-tomato transition-colors">
              Caja
            </Link>
          </div>
        ) : (
          <Link href="/login" className="text-sm text-carbon/40 hover:text-tomato transition-colors">
            Ingresar como staff
          </Link>
        )}
      </div>
    </div>
  )
}