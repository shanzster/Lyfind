import { Heart, Users, Lightbulb, Target } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-24">
      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl sm:text-7xl font-normal text-white mb-6">
            Our Story
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            How a simple problem led to a campus-wide solution
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-normal text-white mb-6">
                It Started with a Bedazzled Jisu Life Fan
              </h2>
              <p className="text-lg text-white/70 mb-6 leading-relaxed">
                In 2023, our founder was walking across the Lyceum of Subic Bay campus when they witnessed something heartbreaking: a student frantically searching for their missing bedazzled Jisu Life fan - a unique, personalized item that held sentimental value.
              </p>
              <p className="text-lg text-white/70 mb-6 leading-relaxed">
                The student had posted about it in multiple Facebook groups, checked bulletin boards, and asked countless people. But with no centralized system, their precious fan seemed lost forever. That same week, our founder noticed dozens of similar stories - students losing valuable items simply because there was no efficient way to connect lost items with their owners.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff7400]/10 border border-[#ff7400]/20 rounded-full">
                <Lightbulb className="w-5 h-5 text-[#ff7400]" />
                <span className="text-[#ff7400] font-medium">The idea was born</span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                <img 
                  src="https://mhglobal.com/image/cache/catalog/all_product/GT075_7-550x550.jpg"
                  alt="Jisu Life handheld fan"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#ff7400]/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="lg:order-2">
              <h2 className="text-4xl font-normal text-white mb-6">
                Building the Solution
              </h2>
              <p className="text-lg text-white/70 mb-6 leading-relaxed">
                After months of research and talking to hundreds of students, we discovered that 73% of students had lost something valuable on campus, and only 31% ever got their items back.
              </p>
              <p className="text-lg text-white/70 mb-6 leading-relaxed">
                We knew technology could solve this. By combining AI-powered photo matching with a campus-specific platform, we could create something that would actually work for students.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ff7400]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#ff7400] text-sm font-bold">1</span>
                  </div>
                  <span className="text-white/80">Interviewed 500+ students</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ff7400]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#ff7400] text-sm font-bold">2</span>
                  </div>
                  <span className="text-white/80">Developed AI matching algorithm</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#ff7400]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#ff7400] text-sm font-bold">3</span>
                  </div>
                  <span className="text-white/80">Launched beta with 100 students</span>
                </div>
              </div>
            </div>
            <div className="lg:order-1 relative">
              <div className="aspect-square bg-white/5 rounded-3xl p-8 backdrop-blur-sm border border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=500&fit=crop&crop=center"
                  alt="Students collaborating"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#ff7400]/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-normal text-white mb-6">
              Our Mission
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              To create a world where losing something doesn't mean losing it forever
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Heart className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">Community First</h3>
              <p className="text-white/60">
                We believe in the power of community. Every feature we build strengthens the bonds between students.
              </p>
            </div>

            <div className="text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">Student-Centric</h3>
              <p className="text-white/60">
                Built by students, for students. Every decision we make prioritizes the student experience.
              </p>
            </div>

            <div className="text-center backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">Impact Driven</h3>
              <p className="text-white/60">
                We measure success not in downloads, but in items returned and connections made.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-normal text-white mb-6">
            Join Our Story
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Be part of the solution. Help us build a better campus community, one found item at a time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all">
              Download LyFind
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-xl border border-white/10 transition-all">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}