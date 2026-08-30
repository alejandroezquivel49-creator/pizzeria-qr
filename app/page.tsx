export default function Home() {
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
    </div>
  )
}