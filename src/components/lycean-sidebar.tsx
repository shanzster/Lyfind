import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, PlusCircle, MessageCircle, User, LogOut, X, ScanSearch, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import NotificationBell from './NotificationBell'

const navigation = [
  { name: 'Browse', href: '/browse', icon: Search },
  { name: 'Post Item', href: '/post', icon: PlusCircle },
  { name: 'LyFind Assistant', href: '/photo-match', icon: ScanSearch },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Profile', href: '/profile', icon: User },
]

interface LyceanSidebarProps {
  /** Hide the mobile FAB (e.g. while a chat is open so it doesn't cover the send button) */
  hideMobileFab?: boolean
}

export default function LyceanSidebar({ hideMobileFab = false }: LyceanSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, userProfile } = useAuth()

  // Custodians get the Guard Station dashboard in their nav
  const navItems = userProfile?.role === 'custodian'
    ? [{ name: 'Guard Station', href: '/guard-station', icon: Building2 }, ...navigation]
    : navigation
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <>
      {/* Notification Bell - Fixed Top Right (hidden on messages page) */}
      {location.pathname !== '/messages' && (
        <div className="fixed top-6 right-6 z-50">
          <NotificationBell />
        </div>
      )}

      {/* Desktop Expanded Sidebar */}
      <aside className="hidden lg:flex fixed left-6 top-6 bottom-6 w-64 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 flex-col z-50">
        {/* Logo & Brand */}
        <Link to="/browse" className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff7400] to-[#ff7400]/60 flex items-center justify-center shadow-lg shadow-[#ff7400]/20 flex-shrink-0">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h2 className="text-white font-medium text-lg">LyFind</h2>
            <p className="text-white/40 text-xs">Lost & Found</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`w-full px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${
                  isActive
                    ? 'bg-[#ff7400] shadow-lg shadow-[#ff7400]/30 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-red-500/20 flex items-center gap-3 transition-all text-white/60 hover:text-red-400 mt-auto"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </aside>

      {/* Mobile/Tablet FAB */}
      {!hideMobileFab && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          {/* FAB Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-16 h-16 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <img 
                src="/Untitled design (3).png" 
                alt="LyFind" 
                className="w-8 h-8 object-contain"
              />
            )}
          </button>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              
              {/* Menu Items */}
              <div className="absolute bottom-20 right-0 flex flex-col gap-3 items-end">
                {navItems.map((item, index) => {
                  const isActive = location.pathname === item.href
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 backdrop-blur-xl border border-white/10 rounded-full pr-6 pl-4 py-3 shadow-xl transition-all animate-slideIn ${
                        isActive
                          ? 'bg-[#ff7400] text-white shadow-[#ff7400]/30'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-white/20' : 'bg-white/10'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium whitespace-nowrap">{item.name}</span>
                    </Link>
                  )
                })}
                
                {/* Logout */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex items-center gap-3 backdrop-blur-xl bg-white/10 border border-white/10 rounded-full pr-6 pl-4 py-3 shadow-xl text-white/80 hover:bg-red-500/20 hover:text-red-400 transition-all animate-slideIn"
                  style={{ animationDelay: `${navigation.length * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="font-medium whitespace-nowrap">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
