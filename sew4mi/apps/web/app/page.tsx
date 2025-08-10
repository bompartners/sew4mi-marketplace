export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-yellow-400">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S4M</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Sew4Mi</h1>
            </div>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">
            Connect with Ghana's
            <span className="block text-yellow-600">Finest Tailors</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
            Sew4Mi bridges the gap between you and skilled Ghanaian tailors. Get custom clothing
            made with traditional craftsmanship, modern convenience, and secure payments through
            mobile money.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
              Find a Tailor
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors">
              Join as Tailor
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-400">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Mobile-First</h3>
              <p className="text-gray-600">
                Optimized for mobile devices with offline support and WhatsApp integration
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Secure Payments</h3>
              <p className="text-gray-600">
                Pay safely with MTN Mobile Money, Vodafone Cash, and other local payment methods
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-600">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Quality Craftsmanship</h3>
              <p className="text-gray-600">
                Work with verified tailors who specialize in traditional and modern Ghanaian fashion
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">S4M</span>
            </div>
            <span className="text-lg font-semibold">Sew4Mi</span>
          </div>
          <p className="text-gray-400">
            Connecting Ghana's tailoring heritage with modern technology
          </p>
          <p className="text-sm text-gray-500 mt-2">Built with ❤️ for Ghana's creative community</p>
        </div>
      </footer>
    </div>
  );
}
