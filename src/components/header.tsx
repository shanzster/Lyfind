import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Home, Info, Briefcase, School, LogIn, UserPlus } from 'lucide-react'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Info, label: 'About', to: '/about' },
    { icon: Briefcase, label: 'Services', to: '/services' },
    { icon: School, label: 'Institution', to: '/institution' },
    { icon: LogIn, label: 'Login', to: '/login' },
    { icon: UserPlus, label: 'Register', to: '/register' }
  ]

  return (
    <>
      {/* Desktop Navigation */}
      <header className="hidden lg:flex fixed top-6 left-0 right-0 z-50 justify-center px-6">
        {/* Centered Pill Navigation */}
        <nav className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-2 py-2 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-1">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-full transition-all"
            >
              <img 
                src="/Untitled design (3).png" 
                alt="LyFind" 
                className="w-6 h-6 object-contain"
              />
              <span className="text-white font-medium text-sm hidden sm:inline">LyFind</span>
            </Link>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10 mx-1"></div>

            {/* Nav Links */}
            <Link 
              to="/" 
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all text-sm font-normal"
            >
              Home
            </Link>

            <Link 
              to="/about" 
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all text-sm font-normal"
            >
              About
            </Link>

            <Link 
              to="/services" 
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all text-sm font-normal"
            >
              Services
            </Link>

            <Link
              to="/institution"
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all text-sm font-normal hidden xl:inline-block"
            >
              Institution
            </Link>

            {/* Divider */}
            <div className="w-px h-6 bg-white/10 mx-1"></div>

            {/* Auth Buttons */}
            <Link 
              to="/login" 
              className="px-5 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all text-sm font-normal"
            >
              Login
            </Link>
            
            <Link 
              to="/register" 
              className="px-5 py-2 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-full transition-all text-sm font-medium shadow-lg shadow-[#ff7400]/20"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      {/* Mobile FAB and Menu */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        {/* Backdrop */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
        )}

        {/* Menu Items - Circular Icons */}
        {mobileMenuOpen && (
          <div className="absolute bottom-20 right-0 flex flex-col items-end gap-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon
              const isRegister = item.label === 'Register'
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 group animate-[slideIn_0.3s_ease-out]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full whitespace-nowrap">
                    {item.label}
                  </span>
                  <div className={`w-14 h-14 flex-shrink-0 rounded-full backdrop-blur-xl border shadow-lg flex items-center justify-center transition-all hover:scale-110 ${
                    isRegister 
                      ? 'bg-[#ff7400] border-[#ff7400]/50 shadow-[#ff7400]/30' 
                      : 'bg-white/10 border-white/20 shadow-black/20'
                  }`}>
                    <Icon className={`w-6 h-6 ${isRegister ? 'text-white' : 'text-white/90'}`} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* FAB Button - Glass Background */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`w-16 h-16 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
            mobileMenuOpen ? 'rotate-45' : ''
          }`}
        >
          <img 
            src="/Untitled design (3).png" 
            alt="LyFind" 
            className="w-10 h-10 object-contain"
          />
        </button>
      </div>
    </>
  )
}
