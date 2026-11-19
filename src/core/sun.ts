// Where the sun is for a city right now: drives the sun/moon icon and the sky style.

const R = Math.PI / 180;

export type SkyPhase = "day" | "dawn" | "dusk" | "night";

export interface SunInfo {
  elevation: number; // degrees above the horizon
  phase: SkyPhase;
  isDay: boolean;
  /** 0 at sunrise, 1 at sunset; null while the sun is down */
  dayFrac: number | null;
}

export function sunInfo(at: Date, lat: number, lon: number): SunInfo {
  const n = at.getTime() / 86400000 + 2440587.5 - 2451545.0; // days since J2000
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R;
  const eps = (23.439 - 0.0000004 * n) * R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  let ha = ((gmst + lon) * R - ra) % (2 * Math.PI);
  if (ha > Math.PI) ha -= 2 * Math.PI;
  if (ha < -Math.PI) ha += 2 * Math.PI;

  const phi = lat * R;
  const elevation = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha)) / R;

  // hour angle of sunrise/sunset (-0.833° accounts for refraction and the sun's radius)
  const cosH0 = (Math.sin(-0.833 * R) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  let dayFrac: number | null = null;
  if (cosH0 <= -1) {
    dayFrac = (ha + Math.PI) / (2 * Math.PI); // midnight sun
  } else if (cosH0 < 1) {
    const H0 = Math.acos(cosH0);
    if (Math.abs(ha) < H0) dayFrac = (ha + H0) / (2 * H0);
  }

  const phase: SkyPhase = elevation > 6 ? "day" : elevation > -6 ? (ha < 0 ? "dawn" : "dusk") : "night";
  return { elevation, phase, isDay: elevation > -0.833, dayFrac };
}
