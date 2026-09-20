import { Code, Briefcase, Music, Github, Linkedin, Mail, ExternalLink } from 'lucide-react'

export default function DeveloperPage() {
  const businesses = [
    {
      name: 'CSA Printing Services',
      role: 'Founder & Owner',
      description: 'Professional printing solutions for students and businesses',
      logo: '/CSA_LOGO.jpg',
      link: '#'
    },
    {
      name: 'KeyCraft',
      role: 'Founder & Owner',
      description: 'Custom key and accessory crafting business',
      logo: '/KEYCRAFT_LOGO.jpg',
      link: '#'
    }
  ]

  const skills = [
    { category: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Vite'] },
    { category: 'Backend', items: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'REST APIs'] },
    { category: 'Tools', items: ['Git', 'VS Code', 'Figma', 'Postman', 'Docker'] }
  ]

  const projects = [
    {
      name: 'LyFind',
      description: 'AI-powered campus lost and found platform with photo matching and real-time notifications',
      tech: ['React', 'TypeScript', 'AI/ML', 'Real-time'],
      status: 'Active'
    },
    {
      name: 'CSA Platform',
      description: 'E-commerce platform for printing services with order management',
      tech: ['Next.js', 'PostgreSQL', 'Stripe'],
      status: 'Live'
    },
    {
      name: 'KeyCraft Store',
      description: 'Custom product showcase and ordering system',
      tech: ['React', 'Node.js', 'MongoDB'],
      status: 'Live'
    }
  ]

  return (
    <main className="min-h-screen pt-24">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Mobile Card Layout */}
          <div className="lg:hidden mb-12">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              {/* Profile Photo on Top */}
              <div className="relative aspect-square max-w-md mx-auto">
                <img 
                  src="/2x2.png" 
                  alt="Stacy Jenalyn Wong"
                  className="w-full h-full object-cover"
                />
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-[#ff7400]/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              </div>
              
              {/* Info Below */}
              <div className="p-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-4">
                  <span className="text-sm text-white/60">Developer & Founder</span>
                </div>
                
                <h1 className="text-5xl font-normal text-white mb-4">
                  Stacy Jenalyn Wong
                </h1>
                
                <p className="text-lg text-white/60 mb-6 leading-relaxed">
                  Full-stack developer, entrepreneur, and dance enthusiast. Building solutions that make a difference in campus life and beyond.
                </p>

                <div className="flex flex-wrap gap-3 mb-6">
                  <a 
                    href="#" 
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-xl transition-all text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Get in Touch
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                  <a 
                    href="#" 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all text-sm"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-medium text-[#ff7400]">3+</div>
                    <div className="text-xs text-white/50 mt-1">Years Coding</div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-medium text-[#ff7400]">2</div>
                    <div className="text-xs text-white/50 mt-1">Businesses</div>
                  </div>
                  <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-xl font-medium text-[#ff7400]">10+</div>
                    <div className="text-xs text-white/50 mt-1">Projects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Grid Layout */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Info */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-6">
                <span className="text-sm text-white/60">Developer & Founder</span>
              </div>
              
              <h1 className="text-6xl sm:text-7xl font-normal text-white mb-6">
                Stacy Jenalyn Wong
              </h1>
              
              <p className="text-xl text-white/60 mb-8 leading-relaxed">
                Full-stack developer, entrepreneur, and dance enthusiast. Building solutions that make a difference in campus life and beyond.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <a 
                  href="#" 
                  className="flex items-center gap-2 px-6 py-3 bg-[#ff7400] hover:bg-[#ff8500] text-white rounded-xl transition-all"
                >
                  <Mail className="w-4 h-4" />
                  Get in Touch
                </a>
                <a 
                  href="#" 
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
                <a 
                  href="#" 
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-medium text-[#ff7400]">3+</div>
                  <div className="text-xs text-white/50 mt-1">Years Coding</div>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-medium text-[#ff7400]">2</div>
                  <div className="text-xs text-white/50 mt-1">Businesses</div>
                </div>
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-medium text-[#ff7400]">10+</div>
                  <div className="text-xs text-white/50 mt-1">Projects</div>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="relative">
              <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 overflow-hidden">
                {/* Profile photo */}
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <img 
                    src="/2x2.png" 
                    alt="Stacy Jenalyn Wong"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 w-20 h-20 bg-[#ff7400]/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-4 left-4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-normal text-white mb-12 text-center">About Me</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Developer */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-14 h-14 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mb-6">
                <Code className="w-7 h-7 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">Developer</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Passionate about creating elegant solutions to real-world problems. Specializing in full-stack development with a focus on user experience and scalable architecture.
              </p>
              <p className="text-white/60 leading-relaxed">
                From frontend interfaces to backend systems, I build end-to-end applications that users love.
              </p>
            </div>

            {/* Entrepreneur */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="w-14 h-14 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-[#ff7400]" />
              </div>
              <h3 className="text-2xl font-normal text-white mb-4">Entrepreneur</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Founded and manage multiple successful businesses including CSA Printing Services and KeyCraft, serving students and the local community.
              </p>
              <p className="text-white/60 leading-relaxed">
                Combining technical skills with business acumen to create sustainable ventures.
              </p>
            </div>

            {/* Dancer */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 md:col-span-2">
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-[#ff7400]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Music className="w-7 h-7 text-[#ff7400]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-normal text-white mb-4">Dance Enthusiast</h3>
                  <p className="text-white/60 leading-relaxed mb-6">
                    When not coding, you'll find me on the dance floor. As the President of Verso, I lead our dance club in creating memorable performances and fostering a vibrant dance community on campus.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                        <img 
                          src="/VERSO_LOGO.jpg" 
                          alt="Verso Dance Club"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-white font-medium">Verso Dance Club</div>
                        <div className="text-white/50 text-sm">President</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Businesses Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">My Businesses</h2>
            <p className="text-white/60">Ventures I've built and manage</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {businesses.map((business, idx) => (
              <div 
                key={idx}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-start gap-6 mb-6">
                  <img 
                    src={business.logo} 
                    alt={business.name}
                    className="w-20 h-20 rounded-xl border border-white/10"
                  />
                  <div className="flex-1">
                    <h3 className="text-2xl font-normal text-white mb-2 group-hover:text-[#ff7400] transition-colors">
                      {business.name}
                    </h3>
                    <p className="text-[#ff7400] text-sm">{business.role}</p>
                  </div>
                </div>
                <p className="text-white/60 leading-relaxed mb-6">
                  {business.description}
                </p>
                <a 
                  href={business.link}
                  className="inline-flex items-center gap-2 text-white/70 hover:text-[#ff7400] transition-colors text-sm"
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">Technical Skills</h2>
            <p className="text-white/60">Technologies I work with</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {skills.map((skillSet, idx) => (
              <div 
                key={idx}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8"
              >
                <h3 className="text-xl font-normal text-white mb-6">{skillSet.category}</h3>
                <div className="flex flex-wrap gap-2">
                  {skillSet.items.map((skill, sIdx) => (
                    <span 
                      key={sIdx}
                      className="px-3 py-1.5 bg-white/5 hover:bg-[#ff7400]/20 border border-white/10 hover:border-[#ff7400]/30 rounded-lg text-sm text-white/70 hover:text-white transition-all cursor-default"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">Featured Projects</h2>
            <p className="text-white/60">Some of my recent work</p>
          </div>

          <div className="space-y-6">
            {projects.map((project, idx) => (
              <div 
                key={idx}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-normal text-white mb-2 group-hover:text-[#ff7400] transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-white/60 leading-relaxed">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400">
                      {project.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, tIdx) => (
                    <span 
                      key={tIdx}
                      className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-normal text-white mb-6">
            Let's Work Together
          </h2>
          <p className="text-xl text-white/60 mb-12">
            Have a project in mind or want to collaborate? I'd love to hear from you.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:stacy@example.com"
              className="px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all"
            >
              Send a Message
            </a>
            <a 
              href="#"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-xl border border-white/10 transition-all"
            >
              View Resume
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
