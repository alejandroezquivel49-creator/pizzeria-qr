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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <Image
        src="/pizza.jpg"
        alt=""
        fill
        className="object-cover blur-sm scale-110"
        priority
      />
      <div className="absolute inset-0 bg-cream/85" />
      <div className="relative z-10 flex flex-col items-center">
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
            <>
              <p className="text-carbon/30 text-[10px] uppercase tracking-widest mb-2">Panel Staff</p>
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                <Link href="/admin" className="text-carbon/50 hover:text-tomato transition-colors">
                  Admin
                </Link>
                <Link href="/admin/categorias" className="text-carbon/50 hover:text-tomato transition-colors">
                  Categorías
                </Link>
                <Link href="/admin/mesas" className="text-carbon/50 hover:text-tomato transition-colors">
                  Mesas
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
            </>
          ) : (
            <Link href="/login" className="text-sm text-carbon/40 hover:text-tomato transition-colors">
              Ingresar como staff
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}