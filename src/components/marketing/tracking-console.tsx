"use client";

import { useState } from "react";
import {
  Check,
  CircleCheck,
  Flag,
  type LucideIcon,
  Plane,
  Radio,
  Sailboat,
  ScanBarcode,
  Search,
  Ship,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/utils";

type TrackModeId = "awb" | "ocean" | "road";

type TrackMode = {
  readonly id: TrackModeId;
  readonly label: string;
  /** Shown in place of `label` on narrow screens; `label` stays the accessible name. */
  readonly shortLabel: string;
  readonly icon: LucideIcon;
  readonly sample: string;
  readonly placeholder: string;
};

// `as const satisfies` (in that order) keeps the tuple type, so index access
// stays non-optional under noUncheckedIndexedAccess.
const TRACK_MODES = [
  {
    id: "awb",
    label: "Air Waybill (AWB)",
    shortLabel: "AWB",
    icon: Plane,
    sample: "AWB-774-902188",
    placeholder: "Enter Air Waybill Number (e.g., AWB-774-902188)...",
  },
  {
    id: "ocean",
    label: "Ocean Container (FCL/LCL)",
    shortLabel: "Ocean",
    icon: Ship,
    sample: "TGR-88942-X",
    placeholder: "Enter Ocean Container ID (e.g., MSKU-908123-0)...",
  },
  {
    id: "road",
    label: "Road Express",
    shortLabel: "Road",
    icon: Truck,
    sample: "RD-EXP-44109",
    placeholder: "Enter Intermodal Bill of Lading (e.g., RD-EXP-44109)...",
  },
] as const satisfies readonly TrackMode[];

const GENERIC_PLACEHOLDER = "Enter AWB, Container ID, or B/L Number (e.g., TGR-88942-X)...";

type RouteNode = {
  readonly stage: string;
  readonly title: string;
  readonly detail: string;
  readonly icon: LucideIcon;
  readonly dotClassName: string;
  readonly accent: boolean;
};

const ROUTE_NODES: readonly RouteNode[] = [
  {
    stage: "Origin",
    title: "Port of Singapore (SGSIN)",
    detail: "Departed Oct 12 • Manifest Sealed",
    icon: Check,
    dotClassName: "bg-primary-container text-white",
    accent: false,
  },
  {
    stage: "Active Waypoint",
    title: "Suez Maritime Channel",
    detail: "Coordinates: Lat 27.84, Lon 34.29",
    icon: Sailboat,
    dotClassName: "bg-secondary-container text-on-primary-fixed motion-safe:animate-pulse",
    accent: true,
  },
  {
    stage: "Destination",
    title: "Port of Hamburg (DEHAM)",
    detail: "Customs Pre-cleared • ETA Fri 08:30",
    icon: Flag,
    dotClassName: "bg-surface-container-highest text-text-muted",
    accent: false,
  },
];

export function TrackingConsole() {
  const [modeId, setModeId] = useState<TrackModeId>("awb");
  // The initial pair is verbatim from the mockup and deliberately does NOT match
  // the active AWB tab: the field is pre-filled with the ocean reference that the
  // result panel below describes.
  const [field, setField] = useState({
    value: "TGR-88942-X",
    placeholder: GENERIC_PLACEHOLDER,
  });
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="rounded-2xl bg-surface-white p-space-md text-on-surface shadow-xl md:p-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm">
        {/* Toggle buttons, not ARIA tabs: they rewrite the input's value rather
            than switching panels. */}
        <div
          role="group"
          aria-label="Tracking reference type"
          className="grid w-full grid-cols-3 gap-1 rounded-lg bg-surface-container-low p-1 sm:flex sm:w-auto sm:items-center sm:gap-2"
        >
          {TRACK_MODES.map((mode) => {
            const isActive = mode.id === modeId;
            return (
              <button
                key={mode.id}
                type="button"
                aria-pressed={isActive}
                aria-label={mode.label}
                onClick={() => {
                  setModeId(mode.id);
                  setField({ value: mode.sample, placeholder: mode.placeholder });
                }}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-space-xs py-1.5 text-body-sm transition-all sm:min-h-0 sm:justify-start sm:px-space-md",
                  isActive
                    ? "bg-primary-container font-semibold text-white"
                    : "font-medium text-text-muted hover:text-on-surface",
                )}
              >
                <mode.icon className="size-4 shrink-0" />
                <span className="sm:hidden">{mode.shortLabel}</span>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden items-center gap-2 text-label-sm text-text-muted md:flex">
          <Radio className="size-4 text-brand-olive" />
          <span>Real-Time AIS &amp; IATA Flight Radar Sync Active</span>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
        className="grid grid-cols-1 gap-space-sm pt-space-xs md:grid-cols-12"
      >
        <div className="relative flex items-center md:col-span-9">
          <label htmlFor="tracking-reference" className="sr-only">
            Tracking reference number
          </label>
          <ScanBarcode className="absolute left-4 size-[22px] text-text-muted" aria-hidden="true" />
          <input
            id="tracking-reference"
            name="reference"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={field.value}
            placeholder={field.placeholder}
            onChange={(event) => {
              setField((previous) => ({ ...previous, value: event.target.value }));
            }}
            className="w-full rounded-xl bg-surface-container-low py-3.5 pr-4 pl-12 text-body-base text-on-surface transition-all placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary-container focus:outline-hidden"
          />
        </div>
        <div className="md:col-span-3">
          <button
            type="submit"
            className="flex h-full w-full items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-md py-3.5 font-display text-title-sm font-bold text-white shadow-md transition-all hover:bg-primary-light active:scale-[0.98]"
          >
            <Search className="size-5 text-secondary-container" />
            <span>Track Cargo Now</span>
          </button>
        </div>
      </form>

      {/* Hidden until submit — the mockup's handler made this explicit even though
          its markup shipped the panel visible. The result copy always describes the
          ocean consignment, regardless of the selected mode. */}
      {submitted ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-space-md rounded-xl bg-surface-container-low p-space-md pt-space-md"
        >
          <div className="flex flex-col justify-between gap-space-sm pb-space-sm sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1">
              <span className="rounded-badge bg-secondary-container px-2.5 py-1 text-label-badge font-bold text-on-primary-fixed uppercase">
                Consignment En Route
              </span>
              <span className="font-display text-title-sm font-bold text-primary-container">
                TGR-88942-X
              </span>
              <span className="text-body-sm text-text-muted">• 40ft High Cube Dry Reefer</span>
            </div>
            <div className="flex items-center gap-1 text-label-sm text-text-muted">
              <CircleCheck className="size-4 text-green-600" />
              <span>Telemetry Validated 3 mins ago</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-space-md pt-space-xs sm:grid-cols-3">
            {ROUTE_NODES.map((node) => (
              <div key={node.stage} className="flex items-start gap-space-xs">
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    node.dotClassName,
                  )}
                >
                  <node.icon className="size-3.5" />
                </div>
                <div>
                  <div
                    className={cn(
                      "text-label-sm uppercase",
                      node.accent ? "font-bold text-brand-olive" : "font-semibold text-text-muted",
                    )}
                  >
                    {node.stage}
                  </div>
                  <div className="text-body-sm font-bold text-on-surface">{node.title}</div>
                  <div className="text-label-sm text-text-muted">{node.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
