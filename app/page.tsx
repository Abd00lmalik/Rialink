import { Hero } from '@/components/landing/Hero';
import { PlatformGrid } from '@/components/landing/PlatformGrid';
import { ProofTrace } from '@/components/landing/ProofTrace';
import { Metrics } from '@/components/landing/Metrics';
import { FAQ } from '@/components/landing/FAQ';
import { CursorReveal } from '@/components/landing/CursorReveal';

export default function HomePage() {
  return (
    <div className="landing">
      <div className="atmosphere" aria-hidden />
      <CursorReveal />
      <Hero />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <PlatformGrid />
        <ProofTrace />
        <Metrics />
        <FAQ />
      </div>
    </div>
  );
}
