import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function CTA() {
  const { user } = useAuth()

  return (
    <section className="py-40 px-6 border-t border-white/10">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-6xl sm:text-7xl font-bold text-white mb-8 tracking-tight">
          Ready to start?
        </h2>
        <p className="text-2xl text-white/50 font-light mb-16">
          Join your campus community today.
        </p>

        <Button
          asChild
          size="lg"
          className="bg-[#ff7400] hover:bg-[#ff7400]/90 text-white font-medium text-xl px-12 py-8 rounded-full transition-all"
        >
          <Link to={user ? '/post' : '/register'}>Get Started</Link>
        </Button>
      </div>
    </section>
  )
}
