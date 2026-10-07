import { Lock, type LucideIcon, PlaneTakeoff, Shield, Ship, Truck, Warehouse } from "lucide-react";

/**
 * The six service divisions, as the site states them.
 *
 * Extracted from `services-grid.tsx` so the landing-page grid and `/services`
 * read one table and cannot drift apart — the same reason `nav-links.ts` and
 * `admin/nav-items.ts` exist.
 *
 * The copy is UNCHANGED from the grid that already published it. These are
 * existing claims; promoting them to a page is not an invitation to reword
 * them.
 *
 * No directive and no imports beyond the icons: a Server Component on either
 * surface reads it.
 */

export type ServiceDivision = {
  /**
   * The anchor id on `/services`, and the deep-link target the landing grid and
   * the footer's Solutions column point at. Stable — changing one silently
   * breaks every link into it, and `typedRoutes` is off so nothing would catch
   * it.
   */
  readonly slug: string;
  readonly ordinal: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly badge: string;
};

export const SERVICE_DIVISIONS: readonly ServiceDivision[] = [
  {
    slug: "air-freight",
    ordinal: "01",
    icon: PlaneTakeoff,
    title: "Air Freight Direct & Charter",
    body: "As an endorsed air freight forwarder, we provide priority expedited air cargo, global charter options, and guaranteed next-flight-out routing worldwide.",
    badge: "IATA Endorsed",
  },
  {
    slug: "ocean-freight",
    ordinal: "02",
    icon: Ship,
    title: "Sea & Ocean Freight (FCL/LCL)",
    body: "International ocean freight import and export. Full Container Load (FCL), Less-than-Container Load (LCL), breakbulk, and consolidated ocean services from port-to-port and door-to-door.",
    badge: "High-Capacity Maritime",
  },
  {
    slug: "road-intermodal",
    ordinal: "03",
    icon: Truck,
    title: "Road & Intermodal Transportation",
    body: "Dependable domestic and transcontinental linehaul, temperature-controlled reefer fleets, specialized lowboy flatbeds, and dedicated heavy-haul road networks.",
    badge: "Cross-Border Linehaul",
  },
  {
    slug: "diplomatic-secure",
    ordinal: "04",
    icon: Lock,
    title: "Diplomatic Bag & Secure Freight",
    body: "Specialized global secure cargo, diplomatic pouches, secure escort courier, biometric chain-of-custody protocols, and immunity-compliant transport for sensitive government assets.",
    badge: "Vienna Convention Sealed",
  },
  {
    slug: "warehousing",
    ordinal: "05",
    icon: Warehouse,
    title: "Intelligent Warehousing & Distribution",
    body: "Shared and dedicated bonded warehousing solutions supported by real-time WMS telemetry, climate-controlled cold storage, pick-pack fulfillment, and inventory replenishment.",
    badge: "Bonded Hubs",
  },
  {
    slug: "packaging-hazmat",
    ordinal: "06",
    icon: Shield,
    title: "Specialized Packaging & Hazmat Storage",
    body: "Industrial crating, precision electronics ESD protection, certified IMO/ICAO dangerous goods handling, and Lloyd's-backed comprehensive marine & transit cargo insurance.",
    badge: "Full Transit Insured",
  },
];
