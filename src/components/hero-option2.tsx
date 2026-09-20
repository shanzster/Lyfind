import { Link } from 'react-router-dom'
import { Camera, Zap, Shield } from 'lucide-react'

// OPTION 2: Centered with Floating Cards
export default function HeroOption2() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#ff7400]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#ff7400]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating Feature Cards */}
      <div className="absolute inset-0 pointer-events-none hidden xl:block">
        {/* Top Left Card */}
        <div className="absolute top-32 left-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 w-64 animate-float">
          <Camera className="w-8 h-8 text-[#ff7400] mb-3" />
          <h3 className="text-white font-semibold mb-2">Photo Matching</h3>
          <p className="text-white/50 text-sm">AI-powered image recognition</p>
        </div>

        {/* Top Right Card */}
        <div className="absolute top-40 right-16 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 w-64 animate-float" style={{ animationDelay: '0.5s' }}>
          <Zap className="w-8 h-8 text-[#ff7400] mb-3" />
          <h3 className="text-white font-semibold mb-2">Instant Alerts</h3>
          <p className="text-white/50 text-sm">Real-time notifications</p>
        </div>

        {/* Bottom Card */}
        <div className="absolute bottom-32 left-1/4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 w-64 animate-float" style={{ animationDelay: '1s' }}>
          <Shield className="w-8 h-8 text-[#ff7400] mb-3" />
          <h3 className="text-white font-semibold mb-2">Campus Verified</h3>
          <p className="text-white/50 text-sm">Secure & trusted platform</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-8">
          <span className="text-sm text-white/60 uppercase tracking-wider">Lyceum's Lost & Found</span>
        </div>

        <h1 className="text-7xl sm:text-8xl lg:text-9xl font-bold text-white mb-8 leading-none">
          LyFind
        </h1>

        <p className="text-2xl text-white/60 mb-12 max-w-2xl mx-auto">
          The smartest way to recover lost items on campus
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link to="/post">
            <button className="px-10 py-5 bg-[#ff7400] hover:bg-[#ff8500] text-white font-semibold rounded-2xl transition-all hover:scale-105 text-lg">
              Get Started
            </button>
          </Link>
          
          <Link to="/browse">
            <button className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-2xl border border-white/20 transition-all hover:scale-105 text-lg">
              Explore
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-[#ff7400] mb-1">5K+</div>
            <div className="text-sm text-white/40">Active Users</div>
          </div>
          <div className="w-px h-12 bg-white/10"></div>
          <div>
            <div className="text-3xl font-bold text-[#ff7400] mb-1">98%</div>
            <div className="text-sm text-white/40">Success Rate</div>
          </div>
          <div className="w-px h-12 bg-white/10"></div>
          <div>
            <div className="text-3xl font-bold text-[#ff7400] mb-1">2min</div>
            <div className="text-sm text-white/40">Avg Response</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}
