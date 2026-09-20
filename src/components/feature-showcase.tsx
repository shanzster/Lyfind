import { Upload, Flag, Bell, Map, MessageSquare, Search, Shield, Zap } from 'lucide-react'

export default function FeatureShowcase() {
  const features = [
    {
      icon: Upload,
      title: 'Post Lost/Found Items',
      description: 'Quickly upload photos and details of items you\'ve lost or found. Our intuitive interface makes posting take less than a minute.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Camera%20with%20Flash.png',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Flag,
      title: 'Report & Verify',
      description: 'Report suspicious activity and verify item ownership through our secure verification system with photo proof.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Clipboard.png',
      color: 'from-red-500 to-orange-500'
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      description: 'Get instant alerts when potential matches are found. Never miss an opportunity to recover your items.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bell.png',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: Map,
      title: 'Campus Map Integration',
      description: 'See exactly where items were lost or found on an interactive campus map. Filter by building and location.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/World%20Map.png',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: MessageSquare,
      title: 'In-App Messaging',
      description: 'Chat securely with other students to verify items and arrange safe pickup locations on campus.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Speech%20Balloon.png',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Search,
      title: 'Advanced Search',
      description: 'Filter by category, color, brand, location, and date. Our smart search helps you find exactly what you\'re looking for.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Magnifying%20Glass%20Tilted%20Left.png',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'Your data is encrypted end-to-end. Only verified campus students can access the platform.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Locked.png',
      color: 'from-gray-500 to-slate-500'
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'See new posts as they happen. Our real-time system ensures you\'re always up to date with the latest items.',
      image: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/High%20Voltage.png',
      color: 'from-yellow-400 to-amber-500'
    }
  ]

  return (
    <section className="py-32 px-6 bg-white/[0.02] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-40 left-40 w-96 h-96 bg-[#ff7400]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-40 right-40 w-96 h-96 bg-[#ff7400]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Everything you need to manage lost and found items on campus
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start gap-6">
                {/* Icon & Image */}
                <div className="flex-shrink-0">
                  <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="w-10 h-10 text-white" />
                  </div>
                  <img 
                    src={feature.image}
                    alt={feature.title}
                    className="w-16 h-16 object-contain mx-auto opacity-80"
                  />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-normal text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
