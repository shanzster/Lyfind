import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'

// OPTION 3: Minimal with Large Typography & Bottom Cards
export default function HeroOption3() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20">
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

      {/* Radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#2f1632_70%)]"></div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-white/40 mb-4 font-medium tracking-widest uppercase">
          Campus Lost & Found Platform
        </p>

        <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold text-white mb-6 leading-none max-w-5xl">
          Never lose
          <br />
          anything
          <br />
          <span className="text-[#ff7400]">again</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/50 mb-10 max-w-2xl">
          AI-powered photo matching connects you with your lost items in seconds
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/post">
            <button className="group flex items-center gap-3 px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-semibold rounded-xl transition-all hover:scale-105">
              Start Finding
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          
          <button className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/20 transition-all">
            <Play className="w-5 h-5" />
            Watch Demo
          </button>
        </div>
      </div>

      {/* Bottom Info Cards */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 - How it works */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[#ff7400]/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Step 1</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Upload Photo</h3>
            <p className="text-sm text-white/50">Take a picture of your lost or found item</p>
          </div>

          {/* Card 2 */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[#ff7400]/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Step 2</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Matching</h3>
            <p className="text-sm text-white/50">Our system finds potential matches instantly</p>
          </div>

          {/* Card 3 */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[#ff7400]/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <span className="text-xs text-white/40 uppercase tracking-wider">Step 3</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Connect</h3>
            <p className="text-sm text-white/50">Message and arrange item return securely</p>
          </div>
        </div>
      </div>
    </section>
  )
}
