/**
 * Websites der Maschinenringe.
 *
 * Recherchiert über den Landesverband Baden-Württemberg (mr-bw.de,
 * „MR-Landkarte“), der die Ringe mit ihren eigenen Auftritten führt.
 * Stand: September 2026.
 *
 * Neue oder geänderte Adressen können auch direkt in der App gepflegt werden:
 * Verwaltung → Maschinenringe → bearbeiten.
 */
export const RING_WEBSITES: Record<string, string> = {
  // Die sieben teilnehmenden Ringe
  'Maschinen- und Betriebshilfsring Schwäbisch Hall e. V.': 'https://www.mbr-sha.de',
  'Maschinen- und Betriebshilfsring Crailsheim e. V.':      'https://www.mr-crailsheim.de',
  'Maschinen- und Betriebshilfsring Blaufelden e. V.':      'https://www.mbr-blaufelden.de',
  'Maschinen- und Betriebshilfsring Hohenlohekreis e. V.':  'https://www.mr-hok.de',
  'Maschinenring Ostalb e. V.':                             'https://www.mr-ostalb.de',
  'Maschinenring östlicher Tauberkreis e. V.':              'https://www.unser-maschinenring.de',
  'Maschinenring Unterland e. V.':                          'https://www.maschinenring-unterland.de',

  // Übrige Ringe Baden-Württembergs (Schreibweise wie in der Ortsliste)
  'MR Alb-Neckar-Fils e.V.':                'https://www.mr-anf.de',
  'MR Alb-Oberschwaben e.V. und MR Alb-Oberschwaben Agrar- und Kommunalservice GmbH': 'https://www.mr-ao.de',
  'MR Böblingen-Calw e.V.':                 'https://www.mr-bb-cw.de',
  'MR Kreis Konstanz e.V.':                 'https://www.mr-kn.de',
  'MR Linzgau e.V.':                        'https://www.mr-linzgau.de',
  'MR Markgräflerland e.V. und MR Markgräflerland GmbH': 'https://www.maschinenring.de/markgraeflerland',
  'MR Ortenau Service GmbH':                'https://www.mr-ortenau.de',
  'MR Rems-Murr-Neckar-Enz e.V. und Servicegesellschaft des MR Rems-Murr mbH': 'https://www.maschinenring-rems-murr.de',
  'MR Schwarzwald-Baar e.V.':               'https://www.mr-sbk.de',
  'MR Schwarzwald-Neckar-Alb e.V. und MR Sulz GmbH und MR Familienhilfe gGmbH': 'https://www.maschinenring-sulz.de',
  'MR Service GmbH Württembergisches Allgäu': 'https://www.mr-ab.de',
  'MR Tettnang e.V. und MR Dienstleistungs-GmbH Tettnang': 'https://www.maschinenring.de/tettnang',
  'MR Tuttlingen-Stockach e.V.':            'https://www.mr-tut-sto.de',
  'MR Ulm-Heidenheim e.V. und BHD-Sozialstation GmbH': 'https://www.maschinenring-ulhdh.de',
  'MR Waldshut e.V.':                       'https://www.mbr-waldshut.de',
  'Maschinen- und Betriebshilfsring Breisgau e.V. und Maschinenring Breisgau GmbH': 'https://www.mr-breisgau.de',
  'Maschinenring Soziale Dienste gGmbH und Maschinenring Biberach-Ehingen e.V.': 'https://www.mr-info.de',
  'Pro Care e.V.':                          'https://www.procare-partner.de',
};

/** Dachverband – Rückfallebene, falls ein Ring keinen eigenen Auftritt hat. */
export const UMBRELLA_WEBSITE = 'https://mr-bw.de/maschinenring/mr-landkarte/';
