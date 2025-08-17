'use client';

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use suppressHydrationWarning to prevent hydration mismatch
  // This is safe because we intentionally want different content post-hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome to Sew4Mi
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with skilled Ghanaian tailors and bring your fashion dreams to life.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Browse Tailors
            </h3>
            <p className="text-gray-600 mb-4">
              Discover skilled tailors in your area and view their portfolios.
            </p>
            <button className="w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 transition-colors">
              Start Browsing
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Place an Order
            </h3>
            <p className="text-gray-600 mb-4">
              Commission custom garments from Ghana's finest tailors.
            </p>
            <button className="w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 transition-colors">
              New Order
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your Orders
            </h3>
            <p className="text-gray-600 mb-4">
              Track the progress of your custom garment orders.
            </p>
            <button className="w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 transition-colors">
              View Orders
            </button>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Celebrating Ghanaian Craftsmanship
            </h2>
            <p className="text-gray-700 max-w-3xl mx-auto">
              Sew4Mi connects you with master tailors who have honed their skills through generations 
              of tradition. From Kente-inspired designs to modern fashion, experience the artistry 
              of Ghana's textile heritage.
            </p>
            <div className="flex justify-center space-x-6 text-lg">
              <span>🎨 Custom Designs</span>
              <span>📱 Mobile-First</span>
              <span>🏆 Master Craftsmen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}