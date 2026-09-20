import { Camera, Search } from 'lucide-react'
import AIMatchingDemo from '@/components/ai-matching-demo'
import CampusMapDemo from '@/components/campus-map-demo'
import PostingAlgorithmDemo from '@/components/posting-algorithm-demo'

export default function ServicesPage() {
  return (
    <main className="min-h-screen pt-24">
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
            <span className="text-sm text-white/60">What We Offer</span>
          </div>
          <h1 className="text-6xl sm:text-7xl font-normal text-white mb-6">
            Our Services
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Everything you need to recover lost items and help others find theirs
          </p>
        </div>
      </section>

      {/* Interactive Demos Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-normal text-white mb-6">
              See It In Action
            </h2>
            <p className="text-xl text-white/50">
              Interactive demos of our core features
            </p>
          </div>

          <div className="space-y-8">
            {/* AI Matching Demo */}
            <AIMatchingDemo />

            {/* Campus Map Demo */}
            <CampusMapDemo />

            {/* Posting Algorithm Demo */}
            <PostingAlgorithmDemo />
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-normal text-white mb-6">
              Core Services
            </h2>
            <p className="text-xl text-white/50">
              The foundation of our platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mb-6">
                <Camera className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">
                Lost & Found Posting
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Upload photos and descriptions of lost or found items in seconds. Our intuitive interface makes posting quick and easy.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#ff7400] rounded-full"></div>
                  <span className="text-white/50 text-sm">Photo upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#ff7400] rounded-full"></div>
                  <span className="text-white/50 text-sm">Detailed descriptions</span>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all">
              <div className="w-16 h-16 bg-[#ff7400]/20 rounded-2xl flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">
                AI-Powered Matching
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Our intelligent algorithm analyzes photos and descriptions to find potential matches automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-normal text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
            Join thousands of students already using LyFind to recover their items
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all">
              Download Now
            </button>
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-xl border border-white/10 transition-all">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
