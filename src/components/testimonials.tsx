export default function Testimonials() {
  const testimonials = [
    {
      name: 'Maria Santos',
      role: 'BS Computer Science',
      avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Technologist.png',
      quote: 'Found my laptop in less than 30 minutes! The AI matching is incredible.',
      rating: 5
    },
    {
      name: 'John Reyes',
      role: 'BS Business Admin',
      avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Office%20Worker.png',
      quote: 'Lost my wallet with all my IDs. Someone posted it and I got it back the same day!',
      rating: 5
    },
    {
      name: 'Sarah Chen',
      role: 'BS Engineering',
      avatar: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Woman%20Scientist.png',
      quote: 'Super easy to use. Helped me return someone\'s phone I found in the library.',
      rating: 5
    }
  ]

  return (
    <section className="py-32 px-6 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl sm:text-6xl font-normal text-white mb-6">
            Student Stories
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">
            Real experiences from our campus community
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <div 
              key={idx}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-[#ff7400] text-xl">★</span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/80 text-lg mb-8 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <img 
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-contain bg-white/10 p-1"
                />
                <div>
                  <div className="text-white font-medium">
                    {testimonial.name}
                  </div>
                  <div className="text-white/40 text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
