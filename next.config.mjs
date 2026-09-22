/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io"],
  async headers() {
    return [
      {
        source: '/feenix.mobileconfig',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/x-apple-aspen-config; charset=utf-8',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="feenix.mobileconfig"',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/worker/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
