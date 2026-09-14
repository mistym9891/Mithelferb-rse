/**
 * The seven Maschinenringe that use this app, with their Geschäftsstelle
 * addresses (from the requirements document) and the exact spelling used in
 * the "Mitgliedseinrichtung" column of Locations.xlsx, so the imported
 * Ortsliste can be matched to a ring.
 */
export interface RingConfig {
  name: string;          // display name
  excelName: string;     // spelling in Locations.xlsx
  officeStreet: string;
  officeTown: string;    // "PLZ Ort" – used for geocoding the office
  isMember: boolean;     // true = one of the seven participating rings
}

export const MEMBER_RINGS: RingConfig[] = [
  {
    name: 'Maschinen- und Betriebshilfsring Schwäbisch Hall e. V.',
    excelName: 'Maschinen- und Betriebshilfsring Schwäbisch Hall e.V. und ASEDI GmbH',
    officeStreet: 'Torstraße 5',
    officeTown: '74532 Ilshofen',
    isMember: true,
  },
  {
    name: 'Maschinen- und Betriebshilfsring Crailsheim e. V.',
    excelName: 'Maschinen- & Betriebshilfsring Crailsheim e.V. und MR Agrar- und Kommunalservice GmbH',
    officeStreet: 'Roßfelder Straße 65/4',
    officeTown: '74564 Crailsheim',
    isMember: true,
  },
  {
    name: 'Maschinen- und Betriebshilfsring Blaufelden e. V.',
    excelName: 'MR Blaufelden e.V. und Fritz-GmbH Allgemeine Dienstleistungen',
    officeStreet: 'Rudolf-Diesel Straße 36',
    officeTown: '74572 Blaufelden',
    isMember: true,
  },
  {
    name: 'Maschinen- und Betriebshilfsring Hohenlohekreis e. V.',
    excelName: 'Maschinenring Hohenlohekreis e.V. und Öko Agrar Service GmbH',
    officeStreet: 'Weilerwiesen 22',
    officeTown: '74635 Kupferzell',
    isMember: true,
  },
  {
    name: 'Maschinenring Ostalb e. V.',
    excelName: 'MR Ostalb e.V. und MR Ostalb Agrar & Service GmbH',
    officeStreet: 'Straubenmühle 5',
    officeTown: '73460 Hüttlingen',
    isMember: true,
  },
  {
    name: 'Maschinenring östlicher Tauberkreis e. V.',
    excelName: 'MR Östlicher Tauberkreis e.V. und MRS Maschinenring Service GmbH und Familien- und Haushaltshilfe GmbH Main-Tauber',
    officeStreet: 'Hörle 3',
    officeTown: '97993 Creglingen',
    isMember: true,
  },
  {
    name: 'Maschinenring Unterland e. V.',
    excelName: 'MR Unterland e.V. e.V.',
    officeStreet: 'Heidenbaumstraße 7',
    officeTown: '74189 Weinsberg',
    isMember: true,
  },
];

const byExcelName = new Map(MEMBER_RINGS.map(r => [r.excelName, r]));

/** Display name for a ring as spelled in the Excel Ortsliste. */
export function displayName(excelName: string): string {
  return byExcelName.get(excelName)?.name ?? excelName;
}

export function isMemberRing(excelName: string): boolean {
  return byExcelName.has(excelName);
}

/** Match the free-text "Maschinenring" column of the staff sheet to a ring. */
export function matchStaffRing(value: string): RingConfig | undefined {
  const v = value.trim().toLowerCase();
  return MEMBER_RINGS.find(r => r.name.toLowerCase().includes(v) || v.includes(r.officeTown.split(' ')[1].toLowerCase()));
}
