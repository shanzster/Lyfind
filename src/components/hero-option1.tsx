import { Link } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'

// OPTION 1: Split Screen with Image Gallery
export default function HeroOption1() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(to right, #ff7400 1px, transparent 1px),
              linear-gradient(to bottom, #ff7400 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px'
          }}
        ></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
            <div className="w-2 h-2 bg-[#ff7400] rounded-full animate-pulse"></div>
            <span className="text-sm text-white/60">Campus Lost & Found</span>
          </div>

          <h1 className="text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Find what you've
            <br />
            <span className="text-[#ff7400]">lost</span> in seconds
          </h1>

          <p className="text-xl text-white/60 mb-8 max-w-lg">
            Connect with your campus community through intelligent photo matching. 
            Post items and get matched instantly.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/post">
              <button className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-semibold rounded-xl transition-all w-full sm:w-auto">
                Post an Item
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            
            <Link to="/browse">
              <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/20 transition-all w-full sm:w-auto">
                <Search className="w-5 h-5" />
                Browse Items
              </button>
            </Link>
          </div>
        </div>

        {/* Right Image Gallery */}
        <div className="relative hidden lg:block">
          <div className="grid grid-cols-2 gap-4">
            {/* Image 1 */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:scale-105 transition-transform">
              <div className="aspect-square bg-gradient-to-br from-[#ff7400]/20 to-transparent rounded-xl mb-3 flex items-center justify-center">
                <span className="text-6xl">📱</span>
              </div>
              <p className="text-sm text-white/60">Phone</p>
            </div>

            {/* Image 2 */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:scale-105 transition-transform mt-8">
              <div className="aspect-square bg-gradient-to-br from-[#ff7400]/20 to-transparent rounded-xl mb-3 flex items-center justify-center">
                <span className="text-6xl">🎒</span>
              </div>
              <p className="text-sm text-white/60">Backpack</p>
            </div>

            {/* Image 3 */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:scale-105 transition-transform">
              <div className="aspect-square bg-gradient-to-br from-[#ff7400]/20 to-transparent rounded-xl mb-3 flex items-center justify-center">
                <span className="text-6xl">💻</span>
              </div>
              <p className="text-sm text-white/60">Laptop</p>
            </div>

            {/* Image 4 */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 hover:scale-105 transition-transform mt-8">
              <div className="aspect-square bg-gradient-to-br from-[#ff7400]/20 to-transparent rounded-xl mb-3 flex items-center justify-center">
                <span className="text-6xl">🔑</span>
              </div>
              <p className="text-sm text-white/60">Keys</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
