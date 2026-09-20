import { useState, useEffect } from 'react'
import { Camera, Sparkles, Check } from 'lucide-react'

export default function AIMatchingDemo() {
  const [step, setStep] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)

  const lostItem = {
    image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Backpack.png',
    name: 'Blue Backpack',
    color: 'Blue',
    brand: 'Nike',
    location: 'Library'
  }

  const foundItems = [
    {
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Backpack.png',
      name: 'Blue Backpack',
      match: 98,
      color: 'Blue',
      brand: 'Nike'
    },
    {
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Luggage.png',
      name: 'Red Backpack',
      match: 45,
      color: 'Red',
      brand: 'Adidas'
    },
    {
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Handbag.png',
      name: 'Black Bag',
      match: 23,
      color: 'Black',
      brand: 'Generic'
    }
  ]

  useEffect(() => {
    if (step === 1) {
      setAnalyzing(true)
      const timer = setTimeout(() => {
        setAnalyzing(false)
        setStep(2)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [step])

  const handleUpload = () => {
    setStep(1)
  }

  const reset = () => {
    setStep(0)
    setAnalyzing(false)
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#ff7400]" />
        </div>
        <div>
          <h3 className="text-2xl font-normal text-white">AI Photo Matching</h3>
          <p className="text-white/50 text-sm">See how our AI finds your items</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload Section */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">Step 1: Upload Lost Item</span>
            {step >= 1 && <Check className="w-5 h-5 text-green-400" />}
          </div>
          
          {step === 0 ? (
            <button
              onClick={handleUpload}
              className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-[#ff7400]/50 hover:bg-white/5 transition-all group"
            >
              <Camera className="w-12 h-12 text-white/40 mx-auto mb-3 group-hover:text-[#ff7400] transition-colors" />
              <p className="text-white/60 text-sm">Click to upload photo</p>
            </button>
          ) : (
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
              <img src={lostItem.image} alt={lostItem.name} className="w-16 h-16" />
              <div className="flex-1">
                <p className="text-white font-medium">{lostItem.name}</p>
                <p className="text-white/50 text-sm">Color: {lostItem.color} • Brand: {lostItem.brand}</p>
              </div>
            </div>
          )}
        </div>

        {/* Analyzing Section */}
        {step >= 1 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-sm">Step 2: AI Analysis</span>
              {step >= 2 && <Check className="w-5 h-5 text-green-400" />}
            </div>
            
            {analyzing ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-[#ff7400]/20 border-t-[#ff7400] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/60 text-sm">Analyzing image features...</p>
                <p className="text-white/40 text-xs mt-2">Detecting color, shape, brand, and patterns</p>
              </div>
            ) : step >= 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Color Detection</span>
                  <span className="text-green-400">✓ Blue</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Brand Recognition</span>
                  <span className="text-green-400">✓ Nike</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Category</span>
                  <span className="text-green-400">✓ Backpack</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {step >= 2 && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-sm">Step 3: Potential Matches</span>
              <span className="text-[#ff7400] text-sm">{foundItems.length} found</span>
            </div>
            
            <div className="space-y-3">
              {foundItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    item.match >= 90
                      ? 'bg-green-500/10 border-2 border-green-500/30'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <img src={item.image} alt={item.name} className="w-12 h-12" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{item.name}</p>
                    <p className="text-white/40 text-xs">{item.color} • {item.brand}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-medium ${
                      item.match >= 90 ? 'text-green-400' : 'text-white/60'
                    }`}>
                      {item.match}%
                    </div>
                    <div className="text-xs text-white/40">match</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-sm rounded-lg border border-white/10 transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
