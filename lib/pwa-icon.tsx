import { ImageResponse } from 'next/og'

// Shared renderer for the PWA manifest icons — a simple branded square, reused at
// whatever size the manifest needs (192, 512, ...).
export function renderPwaIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F0F0F',
        }}
      >
        <div style={{ display: 'flex', fontSize: size * 0.46, fontWeight: 700, color: '#FACC15', fontFamily: 'sans-serif' }}>
          LC
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
