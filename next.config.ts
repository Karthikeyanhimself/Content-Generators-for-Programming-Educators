
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  devIndicators: {
    allowedDevOrigins: [
        '6000-firebase-studio-1762753156211.cluster-cd3bsnf6r5bemwki2bxljme5as.cloudworkstations.dev'
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
