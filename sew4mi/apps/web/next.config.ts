import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable React strict mode to prevent hydration issues with Next.js 15.4.6 + React 19
  // This is a temporary workaround for known hydration issues in this version combination
  reactStrictMode: false,
  
  // Configure experimental features to optimize bundle size
  experimental: {
    // Enable package import optimization for better tree shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'recharts',
    ],
    // Disable PPR (Partial Prerendering) which can cause hydration issues
    ppr: false,
    // Enable optimizeCss to reduce CSS bundle size
    optimizeCss: true,
  },
  
  // Configure server external packages
  serverExternalPackages: [],
  
  // Configure webpack to handle hydration issues and optimize caching
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

    // Optimize webpack cache to eliminate large string serialization warnings
    if (dev) {
      // Use memory cache instead of filesystem cache in development to prevent large string warnings
      // This eliminates the PackFileCacheStrategy serialization warnings entirely
      config.cache = {
        type: 'memory',
        maxGenerations: 1, // Keep only current generation to prevent memory accumulation
      };

      // Simplified chunk splitting for development to prevent module resolution issues
      // Aggressive splitting can cause chunk loading errors in HMR
      if (!isServer) {
        config.optimization = config.optimization || {};
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
          },
        };
      }
    } else {
      // Use filesystem cache in production with optimized settings
      if (config.cache?.type === 'filesystem') {
        config.cache.maxAge = 5184000000; // 60 days
        config.cache.compression = 'gzip';

        const path = require('path');
        config.cache.buildDependencies = {
          config: [path.resolve(__dirname, 'next.config.ts')],
        };
      }

      // Aggressive chunk splitting only in production
      if (!isServer) {
        config.optimization = config.optimization || {};
        config.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: 25,
          maxAsyncRequests: 25,
          minSize: 20000,
          maxSize: 50000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
              maxSize: 50000,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              maxSize: 40000,
              priority: -10,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
              maxSize: 30000,
            },
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
              maxSize: 30000,
            },
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 10,
              maxSize: 25000,
            },
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|clsx|tailwind-merge)[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 5,
              maxSize: 25000,
            },
          },
        };
      }
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
