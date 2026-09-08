import { renderPwaIcon } from '@/lib/pwa-icon'

export async function GET() {
  return renderPwaIcon(192)
}
