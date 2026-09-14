/**
 * Farbe je Ring – muss für beliebig viele Ringe funktionieren.
 *
 * Eine feste Palette reicht nicht: die App soll auf mehr als 30 Ringe wachsen.
 * Die Farbtöne werden deshalb über den goldenen Winkel (137,5°) verteilt.
 * Dadurch liegen auch benachbarte Indizes weit auseinander, und es entstehen
 * beliebig viele gut unterscheidbare Farben.
 *
 * Sättigung und Helligkeit wechseln in kleinen Stufen mit, damit sich Töne bei
 * sehr vielen Ringen zusätzlich unterscheiden.
 */

const GOLDEN_ANGLE = 137.508;

export function ringColor(index: number, dark = false): string {
  const hue = (index * GOLDEN_ANGLE) % 360;
  // Gelbgrün-Bereich (~60–75°) ist auf der Karte schlecht lesbar – überspringen.
  const adjusted = hue > 55 && hue < 78 ? hue + 26 : hue;
  const sat = 68 + (index % 3) * 8;          // 68 / 76 / 84 %
  const light = dark
    ? 62 + (index % 2) * 6                    // im Dunkelmodus heller
    : 42 + (index % 2) * 6;
  return `hsl(${adjusted.toFixed(1)}, ${sat}%, ${light}%)`;
}

/** Stabile Zuordnung: gleiche Ring-ID ergibt immer dieselbe Farbe. */
export function makeRingColorMap(ringIds: number[]) {
  const order = [...ringIds].sort((a, b) => a - b);
  const index = new Map<number, number>();
  order.forEach((id, i) => index.set(id, i));
  return (ringId: number, dark = false) => ringColor(index.get(ringId) ?? 0, dark);
}
