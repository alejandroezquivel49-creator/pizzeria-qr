import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: productos, error } = await supabase
    .from('productos')
    .select('*')

  if (error) {
    return <div style={{ padding: 40 }}>Error: {error.message}</div>
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Productos de la pizzería</h1>
      <ul>
        {productos?.map((p) => (
          <li key={p.id}>
            {p.nombre} — ${p.precio}
          </li>
        ))}
      </ul>
    </div>
  )
}