import { Hero } from "@/components/marketing/hero";
import { MetricsStrip } from "@/components/marketing/metrics-strip";
import { PreFooterCta } from "@/components/marketing/pre-footer-cta";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { TelemetryHub } from "@/components/marketing/telemetry-hub";
import { Testimonials } from "@/components/marketing/testimonials";
import { WhyUs } from "@/components/marketing/why-us";

export default function Home() {
  return (
    <div className="flex w-full flex-col">
      <Hero />
      <MetricsStrip />
      <TelemetryHub />
      <ServicesGrid />
      <WhyUs />
      <Testimonials />
      <PreFooterCta />
    </div>
  );
}
