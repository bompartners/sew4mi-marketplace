import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline | Sew4Mi',
  description: 'You are currently offline. Please check your internet connection.',
};

/**
 * Offline page shown when user is offline and no cached content is available
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gold-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Ghana-inspired Adinkra symbol for connectivity */}
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You&apos;re Offline
        </h1>

        <p className="text-gray-600 mb-6">
          No internet connection detected. Please check your network settings and try again.
        </p>

        {/* Ghana context: mobile data tips */}
        <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 mb-2">
            💡 Quick Tips
          </h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• Check your mobile data or WiFi connection</li>
            <li>• Make sure you have sufficient data bundle</li>
            <li>• Try moving to an area with better signal</li>
            <li>• Restart your device if the problem persists</li>
          </ul>
        </div>

        {/* Cached content notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">📦 Cached Content:</span> Some of your favorites,
            loyalty points, and recent orders may still be available while offline.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            Go Home
          </Link>
        </div>

        {/* Online status indicator */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-gray-600">Currently Offline</span>
          </div>
        </div>

        {/* Service worker info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-500">
            Service Worker Active - Caching enabled
          </div>
        )}
      </div>
    </div>
  );
}
