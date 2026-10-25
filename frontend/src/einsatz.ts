import type { EinsatzArt } from './types';

/**
 * Einsatzarten an einer Stelle.
 *
 * Die Beschriftungen standen vorher an acht Stellen einzeln im Quelltext
 * (Formular, Tabelle, Karte, Filter, Kartenlegende, Meldungen …). Beim
 * Ergänzen der dritten Art wäre fast sicher eine davon vergessen worden.
 *
 * `kurz` ist das Zeichen auf der Karte und in der Tabelle, `lang` die
 * ausgeschriebene Form im Formular, `knapp` die gekürzte Form für enge
 * Spalten.
 */
export interface EinsatzInfo {
  wert: EinsatzArt;
  kurz: string;
  knapp: string;
  lang: string;
}

export const EINSATZARTEN: EinsatzInfo[] = [
  { wert: 'agricultural', kurz: 'L',  knapp: 'landw.',        lang: 'landwirtschaftlich' },
  { wert: 'urban',        kurz: 'S',  knapp: 'städt.',        lang: 'städtisch' },
  // Für Kräfte, die beides übernehmen. Ohne diese Art musste dieselbe Person
  // zweimal angelegt werden – einmal je Bereich.
  { wert: 'both',         kurz: 'LS', knapp: 'landw.+städt.', lang: 'landwirtschaftlich und städtisch' },
];

const nachWert = new Map<string, EinsatzInfo>(EINSATZARTEN.map(e => [e.wert, e]));

/** Unbekannte Werte aus alten Daten fallen auf „landwirtschaftlich" zurück. */
export function einsatz(wert?: string | null): EinsatzInfo {
  return nachWert.get(wert ?? '') ?? EINSATZARTEN[0];
}

export const einsatzKurz  = (w?: string | null) => einsatz(w).kurz;
export const einsatzKnapp = (w?: string | null) => einsatz(w).knapp;
export const einsatzLang  = (w?: string | null) => einsatz(w).lang;

/**
 * Zählt eine Kraft zur gefragten Art? Wer beides übernimmt, erscheint sowohl
 * im Filter „landwirtschaftlich" als auch in „städtisch" – sonst wäre sie bei
 * jeder Einschränkung unsichtbar und damit praktisch nicht vermittelbar.
 */
export function passtZuFilter(art: string | null | undefined, filter: string): boolean {
  if (filter === 'all' || !filter) return true;
  if (art === 'both') return filter === 'agricultural' || filter === 'urban';
  return art === filter;
}
