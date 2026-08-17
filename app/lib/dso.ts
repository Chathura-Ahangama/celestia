/* ============================================
   CELESTIA — Deep Sky Objects (DSO) Engine
   Messier & Caldwell galaxies, nebulae, and clusters
   ============================================ */

import dsosData from "../data/dsos.json";
import {
  equatorialToHorizontal,
  precessFromJ2000,
  type GeoLocation,
  type HorizontalCoord,
} from "./astronomy";

export type DSOType =
  | "galaxy"
  | "open_cluster"
  | "globular_cluster"
  | "diffuse_nebula"
  | "planetary_nebula"
  | "supernova_remnant"
  | "asterism";

export interface DSOEntry {
  id: string;
  name: string;
  type: DSOType;
  ra: number;
  dec: number;
  mag: number | null;
  dim: string;
  constellation: string;
}

export interface VisibleDSO extends DSOEntry {
  horizontal: HorizontalCoord;
}

export const DSOS = dsosData as DSOEntry[];

export function getDSOTypeLabel(type: DSOType): string {
  switch (type) {
    case "galaxy":
      return "Galaxy";
    case "open_cluster":
      return "Open Star Cluster";
    case "globular_cluster":
      return "Globular Cluster";
    case "diffuse_nebula":
      return "Emission / Diffuse Nebula";
    case "planetary_nebula":
      return "Planetary Nebula";
    case "supernova_remnant":
      return "Supernova Remnant";
    case "asterism":
      return "Asterism";
    default:
      return "Deep Sky Object";
  }
}

/**
 * Returns all Deep Sky Objects currently above the horizon for the observer at `jd`.
 */
export function getVisibleDSOs(
  location: GeoLocation,
  jd: number,
  minAlt = 5,
): VisibleDSO[] {
  const visible: VisibleDSO[] = [];

  for (const dso of DSOS) {
    const eqOfDate = precessFromJ2000({ ra: dso.ra, dec: dso.dec }, jd);
    const horiz = equatorialToHorizontal(eqOfDate, location, jd);

    if (horiz.alt >= minAlt) {
      visible.push({
        ...dso,
        horizontal: horiz,
      });
    }
  }

  // Sort by visual magnitude (brightest first)
  visible.sort((a, b) => {
    const ma = a.mag ?? 99;
    const mb = b.mag ?? 99;
    return ma - mb;
  });

  return visible;
}
