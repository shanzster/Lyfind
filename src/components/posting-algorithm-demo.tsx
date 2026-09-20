import { useState, useEffect } from 'react'
import { Upload, Search, Bell, CheckCircle, Clock } from 'lucide-react'

export default function PostingAlgorithmDemo() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      icon: Upload,
      title: 'Item Posted',
      description: 'User uploads photo and details',
      color: 'from-blue-500 to-cyan-500',
      status: 'complete'
    },
    {
      icon: Search,
      title: 'AI Processing',
      description: 'Analyzing image and extracting features',
      color: 'from-purple-500 to-pink-500',
      status: 'processing'
    },
    {
      icon: Bell,
      title: 'Match Found',
      description: 'Potential match detected in database',
      color: 'from-orange-500 to-red-500',
      status: 'pending'
    },
    {
      icon: CheckCircle,
      title: 'Notification Sent',
      description: 'Both parties notified instantly',
      color: 'from-green-500 to-emerald-500',
      status: 'pending'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % steps.length
        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-[#ff7400]" />
        </div>
        <div>
          <h3 className="text-2xl font-normal text-white">Posting Algorithm</h3>
          <p className="text-white/50 text-sm">Real-time matching process</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-white/10"></div>
        
        {/* Animated Progress Line */}
        <div 
          className="absolute left-8 top-0 w-0.5 bg-gradient-to-b from-[#ff7400] to-transparent transition-all duration-1000"
          style={{ height: `${(activeStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {/* Steps */}
        <div className="space-y-8">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === activeStep
            const isPast = idx < activeStep
            
            return (
              <div
                key={idx}
                className={`relative flex items-start gap-6 transition-all duration-500 ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              >
                {/* Icon */}
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                    isActive
                      ? `bg-gradient-to-br ${step.color} shadow-lg shadow-[#ff7400]/30`
                      : isPast
                      ? 'bg-[#ff7400]/20'
                      : 'bg-white/5'
                  }`}>
                    <Icon className={`w-8 h-8 transition-all duration-500 ${
                      isActive || isPast ? 'text-white' : 'text-white/40'
                    }`} />
                  </div>
                  
                  {/* Pulse animation for active step */}
                  {isActive && (
                    <div className="absolute inset-0 bg-[#ff7400] rounded-2xl animate-ping opacity-30"></div>
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-500 ${
                  isActive
                    ? 'bg-white/10 border-[#ff7400]/50 shadow-lg'
                    : isPast
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white/5 border-white/10 opacity-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`text-lg font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-white/70'
                    }`}>
                      {step.title}
                    </h4>
                    
                    {/* Status Badge */}
                    {isPast && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">Done</span>
                      </div>
                    )}
                    {isActive && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#ff7400]/20 rounded-full">
                        <div className="w-2 h-2 bg-[#ff7400] rounded-full animate-pulse"></div>
                        <span className="text-xs text-[#ff7400]">Active</span>
                      </div>
                    )}
                  </div>
                  
                  <p className={`text-sm transition-colors ${
                    isActive ? 'text-white/70' : 'text-white/50'
                  }`}>
                    {step.description}
                  </p>

                  {/* Progress bar for active step */}
                  {isActive && (
                    <div className="mt-4">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#ff7400] to-orange-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-[#ff7400]">2.5s</div>
          <div className="text-xs text-white/50 mt-1">Avg Processing</div>
        </div>
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-green-400">98%</div>
          <div className="text-xs text-white/50 mt-1">Match Rate</div>
        </div>
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-blue-400">24/7</div>
          <div className="text-xs text-white/50 mt-1">Monitoring</div>
        </div>
      </div>
    </div>
  )
}
