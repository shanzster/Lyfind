import { useState, useEffect } from 'react'

// Extend Window interface for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function Hero() {
  const [notifications, setNotifications] = useState<Array<{ id: number; item: string; status: string; emoji: string }>>([])
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  const items = [
    { item: 'iPhone 13 Pro', status: 'Found', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Mobile%20Phone.png' },
    { item: 'Blue Backpack', status: 'Missing', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Backpack.png' },
    { item: 'AirPods Pro', status: 'Found', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Headphone.png' },
    { item: 'Student ID', status: 'Missing', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Identification%20Card.png' },
    { item: 'MacBook Air', status: 'Found', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Laptop.png' },
    { item: 'Car Keys', status: 'Missing', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Key.png' },
    { item: 'Water Bottle', status: 'Found', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Bottle%20with%20Popping%20Cork.png' },
    { item: 'Textbook', status: 'Missing', emoji: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Books.png' },
  ]

  // Handle PWA install prompt
  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('[PWA] beforeinstallprompt event fired')
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App installed')
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Animated notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const randomItem = items[Math.floor(Math.random() * items.length)]
      const newNotification = {
        id: Date.now(),
        ...randomItem
      }

      setNotifications(prev => [...prev, newNotification])

      // Remove notification after 4 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id))
      }, 4000)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Handle install button click
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('[PWA] No install prompt available')
      // Show instructions for manual installation
      alert('To install LyFind:\n\n' +
        'Chrome/Edge: Click the menu (⋮) → "Install LyFind"\n' +
        'Safari (iOS): Tap Share → "Add to Home Screen"\n' +
        'Firefox: Tap menu → "Install"')
      return
    }

    console.log('[PWA] Showing install prompt')
    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    console.log('[PWA] User choice:', outcome)

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
    } else {
      console.log('[PWA] User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#2f1632_70%)]"></div>

      {/* Animated Notifications - Hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
        {notifications.map((notification) => {
          // Generate position that avoids the center area (where text is)
          const isLeft = Math.random() > 0.5
          const isTop = Math.random() > 0.5
          
          // Position notifications in corners/edges only
          const left = isLeft 
            ? `${Math.random() * 15 + 2}%`  // Left edge: 2-17%
            : `${Math.random() * 15 + 83}%` // Right edge: 83-98%
          
          const top = isTop
            ? `${Math.random() * 20 + 5}%`  // Top area: 5-25%
            : `${Math.random() * 20 + 75}%` // Bottom area: 75-95%
          
          return (
            <div
              key={notification.id}
              className="absolute animate-notification"
              style={{ left, top }}
            >
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 shadow-2xl min-w-[200px]">
                <div className="flex items-center gap-3">
                  <img 
                    src={notification.emoji} 
                    alt={notification.item}
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <p className="text-white font-medium text-sm">{notification.item}</p>
                    <p className={`text-xs font-medium ${
                      notification.status === 'Found' ? 'text-green-400' : 'text-orange-400'
                    }`}>
                      {notification.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes notification {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.8);
          }
          10% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          90% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
        }
        .animate-notification {
          animation: notification 4s ease-in-out forwards;
        }
      `}</style>

      {/* Device Mockups Background */}
      <div className="absolute inset-0 flex items-center justify-center gap-8 px-6 opacity-30">
        {/* Laptop Mockup - Hidden on tablet and mobile */}
        <div className="hidden lg:block w-[700px] h-[450px] bg-white/5 backdrop-blur-sm border-4 border-white/10 rounded-2xl shadow-2xl">
          <div className="w-full h-10 bg-white/5 rounded-t-xl flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          <div className="p-8 flex items-center justify-center h-[calc(100%-2.5rem)]">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="max-w-[80%] max-h-[80%] object-contain drop-shadow-2xl"
              style={{ 
                filter: 'saturate(1.2) brightness(1.1) drop-shadow(0 0 40px rgba(255, 116, 0, 0.3))',
                transform: 'translateZ(20px)'
              }}
            />
          </div>
        </div>

        {/* Tablet Mockup - Hidden on mobile, shown on tablet, hidden on desktop */}
        <div className="hidden md:block lg:hidden w-[450px] h-[600px] bg-white/5 backdrop-blur-sm border-4 border-white/10 rounded-3xl shadow-2xl p-4">
          <div className="w-full h-full bg-white/5 rounded-2xl p-8 flex items-center justify-center">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="max-w-[70%] max-h-[70%] object-contain drop-shadow-2xl"
              style={{ 
                filter: 'saturate(1.2) brightness(1.1) drop-shadow(0 0 40px rgba(255, 116, 0, 0.3))',
                transform: 'translateZ(20px)'
              }}
            />
          </div>
        </div>

        {/* Phone Mockup - Shown on mobile only */}
        <div className="block md:hidden w-[280px] h-[560px] bg-white/5 backdrop-blur-sm border-4 border-white/10 rounded-[2.5rem] shadow-2xl p-3">
          <div className="w-full h-full bg-white/5 rounded-[2rem] p-6 flex items-center justify-center">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl"
              style={{ 
                filter: 'saturate(1.2) brightness(1.1) drop-shadow(0 0 40px rgba(255, 116, 0, 0.3))',
                transform: 'translateZ(20px)'
              }}
            />
          </div>
        </div>

        {/* Tablet Mockup - Shown on desktop */}
        <div className="hidden lg:block w-[400px] h-[540px] bg-white/5 backdrop-blur-sm border-4 border-white/10 rounded-3xl shadow-2xl p-4">
          <div className="w-full h-full bg-white/5 rounded-2xl p-8 flex items-center justify-center">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="max-w-[70%] max-h-[70%] object-contain drop-shadow-2xl"
              style={{ 
                filter: 'saturate(1.2) brightness(1.1) drop-shadow(0 0 40px rgba(255, 116, 0, 0.3))',
                transform: 'translateZ(20px)'
              }}
            />
          </div>
        </div>

        {/* Phone Mockup - Shown on desktop */}
        <div className="hidden lg:block w-[260px] h-[520px] bg-white/5 backdrop-blur-sm border-4 border-white/10 rounded-[2.5rem] shadow-2xl p-3">
          <div className="w-full h-full bg-white/5 rounded-[2rem] p-6 flex items-center justify-center">
            <img 
              src="/Untitled design (3).png" 
              alt="LyFind" 
              className="max-w-[60%] max-h-[60%] object-contain drop-shadow-2xl"
              style={{ 
                filter: 'saturate(1.2) brightness(1.1) drop-shadow(0 0 40px rgba(255, 116, 0, 0.3))',
                transform: 'translateZ(20px)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center px-6 flex-1 flex flex-col items-center justify-center">
        {/* Small Label */}
        <p className="text-sm text-white/40 mb-6 font-normal tracking-wider uppercase">
          Lyceum of Subic Bay • Lost & Found Platform
        </p>

        {/* Main Headline with Orange Shadow */}
        <h1 className="relative text-6xl sm:text-7xl lg:text-8xl font-normal text-white mb-6 leading-tight">
          <span className="relative inline-block">
            LyFind
            {/* Circular orange gradient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#ff7400] rounded-full blur-[80px] opacity-30 -z-10"></div>
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-white/50 mb-4 max-w-2xl font-normal leading-relaxed">
          Your campus community's intelligent lost and found solution.
          <br />
          Powered by AI photo matching technology.
        </p>

        {/* Additional Description */}
        <p className="text-base text-white/40 mb-12 max-w-xl font-normal">
          Report lost items, browse found items, and connect with fellow students instantly. 
          Available on all your devices.
        </p>

        {/* PWA Install Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md">
          {isInstalled ? (
            <div className="w-full px-6 py-3 bg-green-500/20 border border-green-500/30 text-green-400 font-medium rounded-xl mb-4 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              App Installed
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className={`w-full px-6 py-3 ${
                isInstallable 
                  ? 'bg-[#ff7400] hover:bg-[#ff8500] text-white' 
                  : 'bg-white/10 hover:bg-white/15 text-white/70'
              } font-medium rounded-xl transition-all mb-4 flex items-center justify-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isInstallable ? 'Install Now' : 'Install App'}
            </button>
          )}
          
          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span>Available for:</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Windows */}
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              
              {/* Android */}
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341c-.759 0-1.378-.619-1.378-1.378s.619-1.379 1.378-1.379 1.379.62 1.379 1.379-.62 1.378-1.379 1.378zm-11.046 0c-.76 0-1.379-.619-1.379-1.378s.619-1.379 1.379-1.379 1.378.62 1.378 1.379-.618 1.378-1.378 1.378zm11.405-7.426l1.084-1.937a.155.155 0 00-.054-.212.15.15 0 00-.211.053l-1.097 1.956a8.681 8.681 0 00-7.208 0L9.299 5.819a.15.15 0 00-.212-.053.155.155 0 00-.053.212l1.084 1.937a7.589 7.589 0 00-4.018 6.614h16.8a7.589 7.589 0 00-4.018-6.614z" />
              </svg>
              
              {/* Apple */}
              <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            </div>
          </div>
          
          {/* Disclaimer */}
          <p className="text-xs text-white/40 text-center leading-relaxed">
            Progressive Web App. No app store required.
            <br />
            <span className="text-white/30">Requires modern browser with PWA support.</span>
          </p>
        </div>
      </div>
    </section>
  )
}
