import { Award, Earth, Handshake, type LucideIcon, Package } from "lucide-react";

type Metric = {
  readonly icon: LucideIcon;
  readonly eyebrow: string;
  readonly value: string;
  readonly label: string;
};

const METRICS: readonly Metric[] = [
  {
    icon: Package,
    eyebrow: "Global Ops",
    value: "101K+",
    label: "Packages & Cargo Units Delivered Worldwide",
  },
  {
    icon: Earth,
    eyebrow: "Global Ports",
    value: "160+",
    label: "Sovereign Countries & Deepwater Ports Connected",
  },
  {
    icon: Handshake,
    eyebrow: "Enterprise",
    value: "16K+",
    label: "Commercial Shippers & Industrial Supply Clients",
  },
  {
    icon: Award,
    eyebrow: "Excellence",
    value: "11 Yrs",
    label: "Proven Multimodal Freight Network Resilience",
  },
];

function MetricTile({ metric }: { metric: Metric }) {
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-lg transition-all duration-200 hover:bg-surface-container">
      <div className="flex items-center justify-between pb-space-sm">
        <metric.icon className="size-8 text-primary-container" />
        <span className="text-label-badge font-bold tracking-widest text-brand-olive uppercase">
          {metric.eyebrow}
        </span>
      </div>
      <div>
        {/* font-extrabold is the mobile override (headline-lg is 700); a no-op at lg. */}
        <div className="font-display text-headline-lg leading-none font-extrabold text-primary-container lg:text-display-hero">
          {metric.value}
        </div>
        <div className="pt-space-xs text-body-sm text-text-muted">{metric.label}</div>
      </div>
    </div>
  );
}

export function MetricsStrip() {
  return (
    <section
      aria-label="Operational scale"
      className="w-full bg-surface-white py-space-lg pt-space-xl sm:py-space-xl sm:pt-space-2xl lg:pt-24"
    >
      <div className="mx-auto max-w-7xl px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricTile key={metric.value} metric={metric} />
          ))}
        </div>
      </div>
    </section>
  );
}
