import { Hero } from '@/components/landing/Hero';
import { PlatformGrid } from '@/components/landing/PlatformGrid';
import { ProcessRail } from '@/components/landing/ProcessRail';
import { Metrics } from '@/components/landing/Metrics';
import { FAQ } from '@/components/landing/FAQ';

export default function HomePage() {
  return (
    <div className="landing">
      <div className="atmosphere" aria-hidden />
      <Hero />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <PlatformGrid />
        <ProcessRail />
        <Metrics />
        <FAQ />
      </div>
    </div>
  );
}
