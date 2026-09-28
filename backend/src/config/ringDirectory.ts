/**
 * Stammdaten aller Maschinenringe in Baden-Württemberg.
 *
 * Bisher waren nur die sieben teilnehmenden Ringe vollständig gepflegt; die
 * übrigen 18 hatten weder Geschäftsstelle noch Kürzel. Damit die Karte für
 * jeden Ring richtig zentriert und im Ringgebiet „MR <Kürzel>“ statt nur „MR“
 * steht, sind hier alle 25 Ringe mit Kürzel, Anschrift und Website hinterlegt.
 *
 * Quelle der Anschriften und Websites: MR-Landkarte des Landesverbands
 * Baden-Württemberg (https://mr-bw.de/maschinenring/mr-landkarte/), bei
 * Pro Care e. V. das Impressum. Stand: September 2026.
 *
 * Pflegbar bleibt alles zusätzlich in der App unter
 * Verwaltung → Maschinenringe.
 */

export interface RingDirectoryEntry {
  /** Name wie in der Datenbank / Ortsliste. */
  name: string;
  /** Kurzzeichen für die Karte, z. B. „SHA“ -> Marker „MR SHA“. */
  shortCode: string;
  officeStreet: string;
  /** „PLZ Ort“ – wird geokodiert. */
  officeTown: string;
  website: string;
}

export const RING_DIRECTORY: RingDirectoryEntry[] = [
  // ---------------------------------------------------------------- Die sieben
  { name: 'Maschinen- und Betriebshilfsring Schwäbisch Hall e. V.',
    shortCode: 'SHA',  officeStreet: 'Torstraße 5',            officeTown: '74532 Ilshofen',
    website: 'https://www.mbr-sha.de' },
  { name: 'Maschinen- und Betriebshilfsring Crailsheim e. V.',
    shortCode: 'CR',   officeStreet: 'Roßfelder Straße 65/4',  officeTown: '74564 Crailsheim',
    website: 'https://www.mr-crailsheim.de' },
  { name: 'Maschinen- und Betriebshilfsring Blaufelden e. V.',
    shortCode: 'BF',   officeStreet: 'Rudolf-Diesel Straße 36', officeTown: '74572 Blaufelden',
    website: 'https://www.mbr-blaufelden.de' },
  { name: 'Maschinen- und Betriebshilfsring Hohenlohekreis e. V.',
    shortCode: 'HOK',  officeStreet: 'Weilerwiesen 22',        officeTown: '74635 Kupferzell',
    website: 'https://www.mr-hok.de' },
  { name: 'Maschinenring Ostalb e. V.',
    shortCode: 'OA',   officeStreet: 'Straubenmühle 5',        officeTown: '73460 Hüttlingen',
    website: 'https://www.mr-ostalb.de' },
  { name: 'Maschinenring östlicher Tauberkreis e. V.',
    shortCode: 'ÖTK',  officeStreet: 'Hörle 3',                officeTown: '97993 Creglingen',
    website: 'https://www.unser-maschinenring.de' },
  { name: 'Maschinenring Unterland e. V.',
    shortCode: 'UL',   officeStreet: 'Heidenbaumstraße 7',     officeTown: '74189 Weinsberg',
    website: 'https://www.maschinenring-unterland.de' },

  // ------------------------------------------------- Übrige Ringe in BW (18)
  { name: 'MR Alb-Neckar-Fils e.V.',
    shortCode: 'ANF',  officeStreet: 'Reichenaustraße 1',      officeTown: '72525 Münsingen',
    website: 'https://www.mr-anf.de' },
  { name: 'MR Alb-Oberschwaben e.V. und MR Alb-Oberschwaben Agrar- und Kommunalservice GmbH',
    shortCode: 'AO',   officeStreet: 'Hauptstraße 17',         officeTown: '88356 Ostrach',
    website: 'https://www.mr-ao.de' },
  { name: 'MR Böblingen-Calw e.V.',
    shortCode: 'BB-CW', officeStreet: 'Nagolder Straße 27',    officeTown: '71083 Herrenberg',
    website: 'https://www.mr-bb-cw.de' },
  { name: 'MR Kreis Konstanz e.V.',
    shortCode: 'KN',   officeStreet: 'Hof Römersberg 1',       officeTown: '78247 Hilzingen',
    website: 'https://www.mr-kn.de' },
  { name: 'MR Linzgau e.V.',
    shortCode: 'LIN',  officeStreet: 'Badener Straße 18',      officeTown: '88693 Deggenhausertal',
    website: 'https://www.mr-linzgau.de' },
  { name: 'MR Markgräflerland e.V. und MR Markgräflerland GmbH',
    shortCode: 'MGL',  officeStreet: 'Haltingerstraße 12',     officeTown: '79379 Müllheim',
    website: 'https://www.maschinenring.de/markgraeflerland' },
  { name: 'MR Ortenau Service GmbH',
    shortCode: 'OG',   officeStreet: 'Bahnhofstraße 67',       officeTown: '77731 Willstätt',
    website: 'https://www.mr-ortenau.de' },
  { name: 'MR Rems-Murr-Neckar-Enz e.V. und Servicegesellschaft des MR Rems-Murr mbH',
    shortCode: 'RMNE', officeStreet: 'Robert-Bosch-Straße 10', officeTown: '71397 Leutenbach',
    website: 'https://www.maschinenring-rems-murr.de' },
  { name: 'MR Schwarzwald-Baar e.V.',
    shortCode: 'SBK',  officeStreet: 'Raiffeisenstraße 28',    officeTown: '78166 Donaueschingen',
    website: 'https://www.mr-sbk.de' },
  { name: 'MR Schwarzwald-Neckar-Alb e.V. und MR Sulz GmbH und MR Familienhilfe gGmbH',
    shortCode: 'SNA',  officeStreet: 'Gottlieb-Daimler-Straße 22', officeTown: '72172 Sulz am Neckar',
    website: 'https://www.maschinenring-sulz.de' },
  { name: 'MR Service GmbH Württembergisches Allgäu',
    shortCode: 'WA',   officeStreet: 'Wangener Straße 70',     officeTown: '88299 Leutkirch',
    website: 'https://www.mr-ab.de' },
  { name: 'MR Tettnang e.V. und MR Dienstleistungs-GmbH Tettnang',
    shortCode: 'TT',   officeStreet: 'Hopfengut 26',           officeTown: '88069 Tettnang',
    website: 'https://www.maschinenring.de/tettnang' },
  { name: 'MR Tuttlingen-Stockach e.V.',
    shortCode: 'TUT',  officeStreet: 'Rudolf-Diesel-Straße 10', officeTown: '78576 Emmingen-Liptingen',
    website: 'https://www.mr-tut-sto.de' },
  { name: 'MR Ulm-Heidenheim e.V. und BHD-Sozialstation GmbH',
    shortCode: 'ULM',  officeStreet: 'Magirusstraße 5',        officeTown: '89129 Langenau',
    website: 'https://www.maschinenring-ulhdh.de' },
  { name: 'MR Waldshut e.V.',
    shortCode: 'WT',   officeStreet: 'Aispergweg 4',           officeTown: '79809 Weilheim',
    website: 'https://www.mbr-waldshut.de' },
  { name: 'Maschinen- und Betriebshilfsring Breisgau e.V. und Maschinenring Breisgau GmbH',
    shortCode: 'BRG',  officeStreet: 'Hauptstraße 33',         officeTown: '79312 Emmendingen',
    website: 'https://www.mr-breisgau.de' },
  { name: 'Maschinenring Soziale Dienste gGmbH und Maschinenring Biberach-Ehingen e.V.',
    shortCode: 'BC',   officeStreet: 'Biberacher Straße 38',   officeTown: '88444 Ummendorf',
    website: 'https://www.mr-info.de' },
  { name: 'Pro Care e.V.',
    shortCode: 'PC',   officeStreet: 'Martin-Luther-Straße 14', officeTown: '74821 Mosbach',
    website: 'https://www.procare-partner.de' },
];

const byName = new Map(RING_DIRECTORY.map(r => [r.name, r]));
export const directoryFor = (name: string) => byName.get(name);
