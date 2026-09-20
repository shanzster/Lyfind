import { TrendingUp, Users, Clock, Award } from 'lucide-react'

export default function Stats() {
  const stats = [
    {
      icon: Users,
      value: '5,000+',
      label: 'Active Students',
      description: 'Across campus'
    },
    {
      icon: TrendingUp,
      value: '98%',
      label: 'Success Rate',
      description: 'Items recovered'
    },
    {
      icon: Clock,
      value: '2 min',
      label: 'Avg Response',
      description: 'Lightning fast'
    },
    {
      icon: Award,
      value: '10K+',
      label: 'Items Found',
      description: 'And counting'
    }
  ]

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#ff7400]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            Trusted by Students
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Join thousands of students who've successfully recovered their items
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div 
              key={idx}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all text-center group"
            >
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <stat.icon className="w-8 h-8 text-[#ff7400]" />
              </div>
              <div className="text-5xl font-normal text-white mb-2">
                {stat.value}
              </div>
              <div className="text-lg text-white/80 mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-white/40">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
