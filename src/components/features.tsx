import { Camera, Zap, MessageSquare, Shield, Bell, Lock } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Camera,
      title: 'Photo Matching',
      description: 'Advanced AI recognizes items from photos instantly.',
    },
    {
      icon: Zap,
      title: 'Real-Time Alerts',
      description: 'Get notified the moment a match is found.',
    },
    {
      icon: MessageSquare,
      title: 'Direct Chat',
      description: 'Message other students securely in-app.',
    },
    {
      icon: Shield,
      title: 'Campus Verified',
      description: 'Only verified students can access the platform.',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Never miss a potential match with push alerts.',
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'Your data is encrypted and secure.',
    },
  ]

  return (
    <section className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            Everything You Need
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Powerful features designed for the modern campus
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all group"
            >
              <div className="w-14 h-14 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-white/60 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
