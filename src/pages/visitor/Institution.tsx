import { MapPin, Calendar, Users, BookOpen, Award, Building2, Globe } from 'lucide-react'

export default function InstitutionPage() {
  const programs = [
    { name: 'Computer Science', icon: '💻', level: 'Bachelor' },
    { name: 'Information Technology', icon: '🖥️', level: 'Bachelor' },
    { name: 'Business Administration', icon: '💼', level: 'Bachelor' },
    { name: 'Elementary Education', icon: '📚', level: 'Bachelor' },
    { name: 'Secondary Education', icon: '🎓', level: 'Bachelor' },
    { name: 'Hospitality Management', icon: '🏨', level: 'Bachelor' }
  ]

  const facilities = [
    { name: 'Computer Laboratories', icon: '🖥️', description: 'State-of-the-art computer labs with modern equipment' },
    { name: 'Library', icon: '📚', description: 'Extensive collection of books and digital resources' },
    { name: 'Sports Facilities', icon: '⚽', description: 'Basketball courts, gym, and recreational areas' },
    { name: 'Cafeteria', icon: '🍽️', description: 'Clean and spacious dining area for students' },
    { name: 'Auditorium', icon: '🎭', description: 'Modern venue for events and presentations' },
    { name: 'Science Labs', icon: '🔬', description: 'Well-equipped laboratories for practical learning' }
  ]

  const values = [
    {
      icon: BookOpen,
      title: 'Academic Excellence',
      description: 'Committed to providing quality education and fostering intellectual growth'
    },
    {
      icon: Users,
      title: 'Community Focus',
      description: 'Building a supportive learning environment for all students'
    },
    {
      icon: Award,
      title: 'Innovation',
      description: 'Embracing modern teaching methods and technology'
    },
    {
      icon: Globe,
      title: 'Global Perspective',
      description: 'Preparing students for success in an interconnected world'
    }
  ]

  return (
    <main className="min-h-screen pt-24">
      {/* Hero Section - Centered Layout */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo with Orange Gradient Circle */}
          <div className="relative inline-block mb-12">
            {/* Orange gradient circle behind - pulsing animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[500px] h-[500px] bg-gradient-to-br from-[#ff7400]/30 via-[#ff7400]/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
            </div>
            
            {/* Logo - scaling animation */}
            <div className="relative animate-[scale_3s_ease-in-out_infinite]">
              <img 
                src="/LyceumLogo.png" 
                alt="Lyceum of Subic Bay"
                className="w-80 h-80 sm:w-96 sm:h-96 object-contain mx-auto"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl font-normal text-white mb-6">
            Lyceum of Subic Bay
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
            A non-stock, non-profit higher educational institution dedicated to providing quality education in the heart of Subic Bay Freeport Zone.
          </p>

          {/* Details Cards */}
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-[#ff7400]" />
              </div>
              <div className="text-white/50 text-sm mb-1">Established</div>
              <div className="text-white font-medium">June 2003</div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-[#ff7400]" />
              </div>
              <div className="text-white/50 text-sm mb-1">Location</div>
              <div className="text-white font-medium">Subic Bay Freeport</div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-[#ff7400]" />
              </div>
              <div className="text-white/50 text-sm mb-1">Type</div>
              <div className="text-white font-medium">Private, Non-Profit</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">About LSB</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Shaping futures through quality education since 2003
            </p>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 lg:p-12 mb-8">
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              Lyceum of Subic Bay (LSB), Inc. is strategically located at the heart of the Subic Bay Freeport Zone, one of the Philippines' premier economic zones. Originally registered as the National College of Science and Technology, Inc., the institution has grown to become a respected center for higher education in the region.
            </p>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              As a non-stock, non-profit educational institution, LSB is committed to providing accessible, quality education to students from diverse backgrounds. The college offers various undergraduate programs and certificate courses designed to prepare students for successful careers in their chosen fields.
            </p>
            <p className="text-white/70 text-lg leading-relaxed">
              Located in the vibrant Subic Bay Freeport Zone, students benefit from proximity to numerous businesses, industries, and recreational facilities, providing unique opportunities for internships, practical training, and cultural experiences.
            </p>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl font-medium text-[#ff7400] mb-2">20+</div>
              <div className="text-white/60 text-sm">Years of Excellence</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl font-medium text-[#ff7400] mb-2">1000+</div>
              <div className="text-white/60 text-sm">Students</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl font-medium text-[#ff7400] mb-2">50+</div>
              <div className="text-white/60 text-sm">Faculty Members</div>
            </div>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl font-medium text-[#ff7400] mb-2">10+</div>
              <div className="text-white/60 text-sm">Programs Offered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">Academic Programs</h2>
            <p className="text-white/60">
              Diverse programs designed for your success
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program, idx) => (
              <div 
                key={idx}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all group"
              >
                <div className="text-4xl mb-4">{program.icon}</div>
                <h3 className="text-xl font-normal text-white mb-2 group-hover:text-[#ff7400] transition-colors">
                  {program.name}
                </h3>
                <p className="text-white/50 text-sm">{program.level} Degree</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">Our Core Values</h2>
            <p className="text-white/60">
              Principles that guide our institution
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, idx) => {
              const Icon = value.icon
              return (
                <div 
                  key={idx}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all"
                >
                  <div className="w-14 h-14 bg-[#ff7400]/20 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-7 h-7 text-[#ff7400]" />
                  </div>
                  <h3 className="text-2xl font-normal text-white mb-4">
                    {value.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-normal text-white mb-4">Campus Facilities</h2>
            <p className="text-white/60">
              Modern facilities to support your learning journey
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility, idx) => (
              <div 
                key={idx}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="text-3xl mb-4">{facility.icon}</div>
                <h3 className="text-lg font-normal text-white mb-2">
                  {facility.name}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {facility.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-normal text-white mb-6">
            Join the LSB Community
          </h2>
          <p className="text-xl text-white/60 mb-12">
            Be part of a growing institution committed to your success
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#"
              className="px-8 py-4 bg-[#ff7400] hover:bg-[#ff8500] text-white font-medium rounded-xl transition-all"
            >
              Learn More
            </a>
            <a 
              href="#"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-normal rounded-xl border border-white/10 transition-all"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
