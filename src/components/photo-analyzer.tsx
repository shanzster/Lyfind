import { useState } from 'react'
import { Camera, Sparkles, CheckCircle } from 'lucide-react'

export default function PhotoAnalyzer() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: 'Upload Photo',
      description: 'Take or upload a photo of your lost or found item',
      icon: Camera,
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Camera.png',
      step: 1
    },
    {
      title: 'AI Analysis',
      description: 'Our AI identifies key features and characteristics',
      icon: Sparkles,
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Robot.png',
      step: 2,
      features: ['Color Detection', 'Object Recognition', 'Brand Identification', 'Location Tagging']
    },
    {
      title: 'Instant Match',
      description: 'Get matched with similar items in seconds',
      icon: CheckCircle,
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Glowing%20Star.png',
      step: 3
    }
  ]

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#ff7400]/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#ff7400]" />
            <span className="text-sm text-white/60">Smart Technology</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            AI-Powered Photo Matching
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Our intelligent system analyzes photos to find matches instantly
          </p>
        </div>

        {/* Slider Container */}
        <div className="relative max-w-5xl mx-auto">
          {/* Main Display */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 mb-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Visual */}
              <div className="relative">
                <div className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center p-8">
                  <img 
                    src={slides[currentSlide].image} 
                    alt={slides[currentSlide].title}
                    className="w-full h-full object-contain"
                  />
                </div>
                {slides[currentSlide].features && (
                  <div className="absolute -right-4 top-1/2 -translate-y-1/2 space-y-2">
                    {slides[currentSlide].features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white/80 whitespace-nowrap animate-fadeIn"
                        style={{ animationDelay: `${idx * 0.2}s` }}
                      >
                        ✓ {feature}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Content */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center">
                    {(() => {
                      const Icon = slides[currentSlide].icon
                      return <Icon className="w-6 h-6 text-[#ff7400]" />
                    })()}
                  </div>
                  <span className="text-sm text-white/40">Step {slides[currentSlide].step}</span>
                </div>
                <h3 className="text-3xl font-normal text-white mb-4">
                  {slides[currentSlide].title}
                </h3>
                <p className="text-lg text-white/60 mb-8">
                  {slides[currentSlide].description}
                </p>

                {/* Progress Indicators */}
                <div className="flex gap-2">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentSlide 
                          ? 'w-12 bg-[#ff7400]' 
                          : 'w-2 bg-white/20 hover:bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
              className="px-6 py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-xl transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
