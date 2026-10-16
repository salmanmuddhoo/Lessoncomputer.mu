/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  // Old staging domain → www.lessoncomputer.mu. Off until launch day (REDIRECT_OLD_DOMAIN=true).
  async redirects() {
    if (process.env.REDIRECT_OLD_DOMAIN !== 'true') return []
    return ['test-development.xyz', 'www.test-development.xyz'].map((host) => ({
      source: '/:path*',
      has: [{ type: 'host', value: host }],
      destination: 'https://www.lessoncomputer.mu/:path*',
      permanent: true,
    }))
  },
}

export default nextConfig
