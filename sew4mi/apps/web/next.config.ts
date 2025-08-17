import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable React strict mode to prevent hydration issues with Next.js 15.4.6 + React 19
  // This is a temporary workaround for known hydration issues in this version combination
  reactStrictMode: false,
  
  // Disable experimental features that can cause hydration mismatches
  experimental: {
    // Disable package import optimization temporarily
    optimizePackageImports: [],
    // Disable PPR (Partial Prerendering) which can cause hydration issues
    ppr: false,
  },
  
  // Configure server external packages
  serverExternalPackages: [],
  
  // Configure webpack to handle hydration issues
  webpack: (config, { dev, isServer }) => {
    // Add resolve fallbacks for client-side modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  },
  
  // Disable image optimization temporarily to prevent hydration issues
  images: {
    unoptimized: true,
  },
  
  // Security headers
  poweredByHeader: false,
  
  // Disable generation of ETags which can cause hydration mismatches
  generateEtags: false,
};

export default nextConfig;
