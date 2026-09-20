import { Upload, Search, MessageCircle, CheckCircle2 } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Post Your Item',
      description: 'Upload a photo and description of your lost or found item in seconds',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Search,
      title: 'AI Matches',
      description: 'Our smart algorithm instantly searches and matches similar items',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: MessageCircle,
      title: 'Connect',
      description: 'Chat directly with other students to verify and arrange pickup',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: CheckCircle2,
      title: 'Reunite',
      description: 'Get your item back or help someone find theirs',
      color: 'from-green-500 to-emerald-500'
    }
  ]

  return (
    <section className="py-32 px-6 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            How It Works
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Four simple steps to reunite with your belongings
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-white/20 to-transparent -z-10"></div>
              )}
              
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all h-full">
                {/* Step Number */}
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#ff7400] rounded-full flex items-center justify-center text-white font-medium shadow-lg">
                  {idx + 1}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-normal text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/60 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
