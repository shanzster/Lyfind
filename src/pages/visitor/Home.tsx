import Hero from '@/components/hero';
import PhotoAnalyzer from '@/components/photo-analyzer';
import FeatureShowcase from '@/components/feature-showcase';
import Features from '@/components/features';
import HowItWorks from '@/components/how-it-works';
import Stats from '@/components/stats';
import Testimonials from '@/components/testimonials';
import CTA from '@/components/cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <PhotoAnalyzer />
      <FeatureShowcase />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <CTA />
    </>
  );
}
