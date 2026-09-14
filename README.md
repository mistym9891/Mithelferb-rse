# Maschinenringe – Mithelferbörse

Interne Web-App, mit der die sieben Maschinenringe freie Betriebshelfer/innen und
Hauswirtschafter/innen untereinander sichtbar machen – als Karte und als Tabelle.

## Architektur

| Teil      | Technik                                                         | Port (lokal) |
|-----------|-----------------------------------------------------------------|--------------|
| Datenbank | PostgreSQL 16 + PostGIS 3.4 (Docker)                             | 5433 |
| Backend   | Node.js + Express + TypeScript, Socket.IO, JWT-Auth              | 5000 |
| Frontend  | React 18 + Vite + TypeScript, Leaflet, TanStack Table, Tailwind  | 5173 |

> **Datenbank-Port lokal:** Auf dem Entwicklungsrechner belegt ein nativer
> PostgreSQL-17-Dienst den Port 5432. Der Container ist deshalb auf **5433**
> gemappt. In der Produktion ist die Datenbank gar nicht nach außen geöffnet.

## Schnellstart (lokal)

```bash
docker compose up -d db
cd backend  && npm install && npm run seed && npm run gemeinden && npm run boundaries && npm run import-staff && npm run dev
cd frontend && npm install && npm run dev
```

Danach <http://localhost:5173> öffnen.

## Testkonten

Passwort für alle Konten: `admin123`

| E-Mail                     | Name              | Ring            | Rolle                |
|----------------------------|-------------------|-----------------|----------------------|
| `admin@example.com`        | System-Admin      | Schwäbisch Hall | **Super-Administration** |
| `fritz.hube@mbr-sha.de`    | Fritz Hube        | Schwäbisch Hall | Ring-Administration  |
| `stefanie.kamm@mbr-sha.de` | Stefanie Kamm     | Schwäbisch Hall | Einsatzleitung       |
| `rschmitz@mr-hok.de`       | Rosemarie Schmitz | Hohenlohekreis  | Ring-Administration  |

## Rollen

| Rolle | Darf |
|---|---|
| **Super-Administration** | Alles ringübergreifend: **Ringe anlegen, ändern, löschen**; alle Konten aller Ringe verwalten; Rollen vergeben; Administrationsprotokoll einsehen. Für IT- und Verwaltungsfragen. |
| **Ring-Administration** | Benutzerkonten **des eigenen Rings** anlegen, ändern, sperren, löschen; Passwörter zurücksetzen; Passwortanfragen des eigenen Rings bearbeiten. |
| **Einsatzleitung** | Alle freien Kräfte sehen, eigene Mitarbeiter pflegen und frei melden. Keine Benutzerverwaltung. |

Ein Ring-Administrator kann ein Super-Admin-Konto weder ändern, sperren noch
löschen; die eigene Rolle kann niemand selbst hochstufen.

## Wachstum: beliebig viele Ringe

Die App ist **nicht auf eine feste Zahl von Ringen ausgelegt**. Aktuell sind
alle **25 Maschinenringe Baden-Württembergs** angelegt – mit amtlichen Grenzen
über 1088 Gemeinden und je eigener Website. Weit mehr als 30 Ringe sind ohne
Änderung am Programm möglich.

Konkret heißt das:

* **Ringe sind Datensätze, kein Programmcode.** Die Super-Administration legt
  neue Ringe unter *Verwaltung → Maschinenringe* an. Die Geschäftsstelle wird
  dabei automatisch in Koordinaten umgerechnet, damit die Karte für Benutzer
  dieses Rings richtig zentriert.
* **Die Ringauswahl ist ein Aufklappmenü** mit Suchfeld, scrollbarer Liste und
  Sammelaktionen (*alle*, *keine*, *nur eigener Ring*). Die Schaltfläche zeigt
  „7 von 25 Ringen“. Eine Reihe von Kästchen nebeneinander hätte spätestens bei
  30 Ringen den halben Bildschirm gefüllt.
* **Die Farben werden berechnet, nicht ausgewählt.** Die Farbtöne verteilen sich
  über den goldenen Winkel (137,5°), sodass beliebig viele Ringe gut
  unterscheidbare Farben bekommen – in hell und dunkel abgestimmt
  (`frontend/src/ringColors.ts`).
* **Ein Ring kann nur gelöscht werden**, wenn keine Benutzerkonten und keine
  Mitarbeiter mehr daran hängen.

Ringe aus der Ortsliste übernehmen:

```bash
ALL_RINGS=1 npm run import-rings   # alle Ringe der Ortsliste anlegen
ALL_RINGS=1 npm run geocode        # Orte aller Ringe geokodieren (ca. 20 Min.)
npm run boundaries                 # amtliche Grenzen je Ring berechnen
```

## Websites der Ringe

Jeder Ring hat eine hinterlegte Website; **der Ringname ist in der App überall
ein Link darauf** – in der Tabelle, im Karten-Popup, in der Ringauswahl und in
der Ringverwaltung. Die Adressen stammen aus der MR-Landkarte des
Landesverbands Baden-Württemberg (<https://mr-bw.de>), Stand September 2026,
und sind in `backend/src/config/ringWebsites.ts` hinterlegt:

```bash
npm run import-websites   # Adressen in die Datenbank schreiben
```

Ändern lässt sich eine Adresse ohne Programmänderung unter
*Verwaltung → Maschinenringe → bearbeiten*. Eingaben werden geprüft und auf
`http`/`https` beschränkt; „https://“ wird bei Bedarf ergänzt.

## Super-Administration anlegen

```bash
cd backend
npm run create-superadmin -- <e-mail> "<Name>" ["<Ringname>"]
```

Das Passwort wird zufällig erzeugt und **genau einmal** ausgegeben; bei der
ersten Anmeldung ist es zu ändern. Ohne Ringnamen wird der erste Ring gewählt –
für die Super-Administration ist die Ringzugehörigkeit ohnehin nur die
Startposition der Karte, die Rechte gelten ringübergreifend. Ein bereits
vorhandenes Konto wird auf Super-Administration hochgestuft.

## Anmeldung, Zustimmung, Passwörter

**Erstanmeldung.** Neue Konten erhalten ein vom System erzeugtes Startpasswort,
das die Verwaltung genau einmal angezeigt bekommt und **persönlich übergibt**.
Bei der ersten Anmeldung ist ein eigenes Passwort zu setzen (mindestens 10
Zeichen). Danach müssen **Nutzungsbedingungen und Datenschutzerklärung**
gelesen und bestätigt werden – vorher ist die App gesperrt. Ändert sich einer
der Texte, wird die Zustimmung erneut eingeholt (Versionsnummer in
`backend/src/config/legal.ts`).

**Passwort vergessen.** Bewusst *kein* Selbstbedienungslink an den Benutzer:

1. Die Person gibt auf der Anmeldeseite ihre dienstliche E-Mail-Adresse an.
2. Die **Administratoren des betroffenen Rings** und die Super-Administration
   bekommen sofort einen Hinweis in der App und – falls SMTP eingerichtet ist –
   eine E-Mail mit einem Link.
3. Über diesen Link (oder unter *Verwaltung*) erzeugt die Verwaltung ein neues
   Passwort. Es wird einmalig angezeigt und persönlich übergeben.
4. Der Link ist 48 Stunden gültig und nur einmal verwendbar. Die Person muss
   das Passwort bei der nächsten Anmeldung ändern.

Die Antwort auf die Anfrage ist immer gleich, egal ob die Adresse existiert –
so lässt sich nicht herausfinden, welche Konten es gibt.

## Aktualität und Echtzeit

Die Anzeige darf nie veraltet sein. Dafür sorgen zwei Wege gleichzeitig:

* **Echtzeit über Socket.IO** – authentifiziert per JWT, mit Räumen je Ring und
  je Rolle. Ereignisse: neue Freimeldung, zurückgenommene Freimeldung, geänderte
  Mitarbeiterdaten, neue Passwortanfrage (nur an die zuständigen Administratoren).
  Neue Freimeldungen erscheinen bei allen Ringen sofort als Pop-up.
* **Sicherheitsnetz** – zusätzlich wird neu geladen, wenn der Tab wieder sichtbar
  wird, das Fenster den Fokus bekommt, das Gerät wieder online ist, die
  Socket-Verbindung neu aufgebaut wurde oder 60 Sekunden vergangen sind. Im
  Hintergrund wird nicht gepollt, das spart Akku.

Eine Anzeige in der Reiterleiste (grün *live* / gelb *verbinde…* / rot *offline*)
zeigt jederzeit, ob die Daten gerade live sind.

## Installation auf Rechner und Handy (ohne App-Store)

Die App ist eine **Progressive Web App**: Sie wird über einen Link bzw. QR-Code
verteilt und lässt sich auf Windows, macOS, Android und iOS wie eine normale
App installieren. Danach liegt das **Symbol auf dem Desktop bzw. dem
Startbildschirm** und die App startet im eigenen Fenster ohne Browserleiste.

In der App: Schaltfläche **⬇** in der Kopfzeile → Reiter *Installieren*.
Dort gibt es die Schaltfläche „Jetzt installieren“ (sofern der Browser sie
anbietet), sonst die passende Anleitung, dazu QR-Code und Link zum Weitergeben.

| Gerät | Weg zur Installation |
|---|---|
| Windows / macOS (Chrome, Edge) | Schaltfläche „Jetzt installieren“ oder Symbol ⊕ in der Adressleiste |
| Android (Chrome) | Menü ⋮ → „App installieren“ |
| iPhone / iPad (Safari) | Teilen → „Zum Home-Bildschirm“ |

> **HTTPS ist Pflicht.** Ohne TLS bietet kein Browser die Installation an und
> der Service Worker bleibt inaktiv (Ausnahme: `localhost`). Im Testbetrieb im
> lokalen Netz (`http://192.168.x.x:5173`) lässt sich die App also benutzen,
> aber **nicht installieren** – dafür ist die Veröffentlichung auf dem Server
> mit Zertifikat nötig.

## Benachrichtigungen

Zwei Stufen, damit Freimeldungen niemanden verpassen:

1. **Pop-up in der App** – erscheint sofort bei allen, die die App gerade offen
   haben (Socket.IO).
2. **Push-Benachrichtigung** – erreicht das Gerät auch dann, wenn die App im
   Hintergrund läuft oder **geschlossen** ist. Einzuschalten unter **⬇ →
   Benachrichtigungen**; dort gibt es auch eine Testmeldung.

Technisch: Web Push mit VAPID (`web-push`), Abos in der Tabelle
`push_subscriptions`, Zustellung über den `push`-Handler im Service Worker.
Abgelaufene Abos werden automatisch entfernt. Die auslösende Person bekommt
ihre eigene Meldung nicht zugestellt.

Voraussetzungen: HTTPS (bzw. `localhost`) und – auf iPhone/iPad – die
Installation zum Home-Bildschirm (ab iOS 16.4). Die VAPID-Schlüssel liegen in
`backend/.env`; neue erzeugt man mit
`node -e "console.log(require('web-push').generateVAPIDKeys())"`.

## Darstellung

* **Hell / Dunkel / System** – Schaltfläche in der Kopfzeile, Auswahl wird
  gespeichert. Im Dunkelmodus werden die OSM-Kacheln per CSS-Regel abgedunkelt
  (fertige dunkle Kachelsätze verlangen inzwischen einen API-Schlüssel).
* **Responsiv** für Handy, Tablet und Rechner: unter 768 px werden aus den
  Tabellen Kartenlisten, die Filter klappen ein, die Kopfzeile reduziert sich
  auf Symbole. Safe-Area für Geräte mit Notch, 16-px-Eingabefelder gegen das
  Hineinzoomen unter iOS.
* **Neutrale Kopfzeile** – die App wird von mehreren Ringen gemeinsam genutzt,
  deshalb steht dort „Mithelferbörse / Maschinenringe Sozialdienst“ und kein
  einzelner Ringname. Der eigene Ring erscheint rechts als Zuordnung beim
  angemeldeten Benutzer.
* **Passwortfelder** lassen sich sichtbar schalten (Auge-Symbol) – hilfreich
  beim Abtippen eines von der Verwaltung vergebenen Startpassworts.
* **Abmelden fragt nach.** Die Schaltfläche sitzt auf dem Handy dicht neben
  anderen Bedienelementen; eine versehentliche Abmeldung wäre ärgerlich.

## Geprüfte Bildschirmgrößen (QA)

Alle Ansichten wurden auf waagerechten Überlauf und abgeschnittenen Text
geprüft – hochkant bei **320, 360, 390 und 414 px** Breite sowie **quer**
(740 × 360). Geprüft wurden Anmeldung, Passwort-vergessen, beide Pflichtdialoge
(Passwort, Rechtstexte), Karte, Freie Mitarbeiter, Meine Mitarbeiter,
Verwaltung, Ringauswahl, Installations- und Abmeldedialog.

Dabei gefunden und behoben:

| Befund | Wirkung für den Anwender | Behebung |
|---|---|---|
| Tabelle *Freie Mitarbeiter* war auf dem Handy **1532 px breit** | Nur 4 von 11 Spalten sichtbar; Wohnort, Std./Tag, Ring, Einsatzleitung, Telefon und E-Mail lagen außerhalb des Bildschirms | Unter 1024 px **Kartenliste** statt Tabelle, mit allen Angaben und einer Schaltfläche zum **direkten Anrufen** |
| Rechtstexte-Dialog: Textbereich fiel auf **0 px** zusammen | Man sollte Bedingungen bestätigen, die gar nicht angezeigt wurden | Feste Höhe `44dvh` auf Handys statt reiner Flex-Verteilung; Kopf/Fuß `shrink-0` |
| Reiterleiste passte bei 320 px exakt, Filter-Schaltfläche brach um | „Filter“ und Pfeil standen untereinander, ein Zähler am Reiter hätte die Zeile gesprengt | Leiste waagerecht scrollbar, kompaktere Reiter, Pfeil entfällt |
| Name und Rolle in der Benutzerverwaltung abgeschnitten | „System-Administration“ war nicht vollständig lesbar | Unter 400 px untereinander statt nebeneinander |
| Overlays nutzten `vh` | Auf Handys rechnet `vh` die Adressleiste mit – Dialoge ragten über den sichtbaren Bereich | Durchgängig `dvh` |

## Karte

* **Amtliche Gemeindegrenzen** als Ringgrenzen (siehe unten), je Ring farbig.
* Geschäftsstellen als grüne `MR`-Marker; Start auf der eigenen Geschäftsstelle.
* Freie Kräfte als Button mit `Kürzel, Std./Tag, S|L` (z. B. `FR, 6, S`),
  **rosa = weiblich, blau = männlich**; künftige Zeiträume gestrichelt.
* **Beim Überfahren mit der Maus** erscheinen alle Details samt Zeitraum; auf
  Touchgeräten dieselben Details beim Antippen.
* Zoomen per +/−, Mausrad, Doppelklick, Tastatur und Zwei-Finger-Geste (6–18).
* Mehrere Personen im selben Ort werden pixelgenau gestapelt.

## Freie Zeiträume

Angezeigt wird **jeder Zeitraum, der noch nicht abgelaufen ist** – „jetzt frei“
und „erst künftig frei“. Der Filter *Zeitraum* grenzt darauf ein. Als „heute“
gilt immer das Datum in **Europe/Berlin**.

## Sichtbarkeit / Datenschutz

* Jeder Ring pflegt **nur die eigenen** Mitarbeiter/innen; fremde Datensätze
  sind serverseitig gesperrt.
* Für **fremde** Ringe werden Vor- und Nachname **gar nicht erst übertragen**.
  Sichtbar sind nur Kürzel, Wohnort, Std./Tag, Einsatzart, Maschinenring,
  Einsatzleitung mit Telefon und E-Mail sowie der freie Zeitraum.
* Administrative Vorgänge werden protokolliert (`audit_log`).

Die Rechtstexte stehen in `backend/src/config/legal.ts`. Sie sind ein fundierter
Entwurf, **ersetzen aber keine Rechtsberatung** – die mit `[BITTE PRÜFEN]`
markierten Stellen (Verantwortlicher, Datenschutzbeauftragte/r, Vereinbarung
nach Art. 26 DSGVO, Speicherfristen) müssen vor dem Produktivgang ergänzt und
freigegeben werden.

## Ringgrenzen aus amtlichen Gemeindegrenzen

Grundlage ist **VG250** des Bundesamts für Kartographie und Geodäsie
(Verwaltungsgebiete 1:250 000).

* Quelle: <https://daten.gdz.bkg.bund.de/produkte/vg/vg250_ebenen_0101/aktuell/>
* Lizenz: Datenlizenz Deutschland – Namensnennung – Version 2.0 (`dl-de/by-2-0`),
  © GeoBasis-DE / BKG

1. `npm run gemeinden` liest `VG250_GEM.shp` (EPSG:25832), filtert auf
   Baden-Württemberg und Landflächen (`GF = 4`) und speichert die Geometrien
   nach `ST_Transform` in WGS84 – 1103 Gemeinden.
2. `npm run boundaries` ordnet jeden Ort der Ortsliste über **Punkt-in-Polygon**
   seiner Gemeinde zu (nicht über den Namen: viele Bestimmungsorte sind
   Ortsteile) und vereinigt die Gemeinden je Ring mit `ST_Union`.

195 der 197 Orte werden zugeordnet. Ostalb kommt auf 1487 km² gegenüber
1512 km² des echten Ostalbkreises. Die Karte bekommt die Geometrie
topologieerhaltend vereinfacht (`/api/rings?tolerance=…`, Standard 0.0008 ≈ 60 m):
69 kB statt 155 kB; in der Datenbank bleibt die volle Genauigkeit.

## Hosting: Hetzner Cloud

**Empfehlung: Hetzner Cloud CX22, Standort Nürnberg oder Falkenstein.**

> **Wichtig:** Der bereits gebuchte **IONOS HiDrive ist reiner Dateispeicher**
> (WebDAV). Darauf lässt sich weder Node.js noch PostgreSQL betreiben – für
> diese App ist er als Hosting **nicht geeignet**. Sinnvoll nutzbar ist er
> dagegen als **zweiter Ablageort für die Datensicherungen** (siehe
> `deploy/SERVER-SETUP.md`, Abschnitt 10).

| Kriterium | Hetzner Cloud CX22 | IONOS VPS (Alternative) |
|---|---|---|
| Preis | ca. 4 €/Monat (+20 % für Backups) | ca. 5–8 €/Monat |
| Leistung | 2 vCPU, 4 GB RAM, 40 GB NVMe | vergleichbar |
| Standort | Nürnberg / Falkenstein (DE) | Deutschland |
| DSGVO / AVV | AVV im Kundenkonto abschließbar | AVV vorhanden |
| Root/Docker | ja | ja |
| Snapshots/Backups | im Konto zubuchbar | zubuchbar |
| Bedienung | sehr schlanke Konsole, gute API | umfangreicher, träger |

Beides ist datenschutzrechtlich tragfähig. Hetzner gibt bei gleichem Preis
mehr Leistung, hat die einfachere Verwaltung und ist im Docker-Betrieb weiter
verbreitet. Wer alles bei einem Anbieter halten will, nimmt einen IONOS VPS –
die Anleitung gilt unverändert, nur der Bestellvorgang unterscheidet sich.

**24/7-Betrieb** ist abgedeckt durch: `restart: unless-stopped` für alle
Container, Healthchecks für Datenbank und Backend, automatische
TLS-Erneuerung durch Caddy, automatische Sicherheitsupdates, tägliche
Datenbanksicherung mit 30 Tagen Aufbewahrung, Hetzner-Snapshots und eine
Erreichbarkeitsüberwachung auf `/health`.

Vollständige Anleitung: **[deploy/SERVER-SETUP.md](deploy/SERVER-SETUP.md)**

```bash
cp .env.prod.example .env    # APP_DOMAIN, DB_PASSWORD, JWT_SECRET setzen
docker compose -f docker-compose.prod.yml up -d --build
```

## npm-Skripte im `backend/`

| Skript                    | Zweck                                                                    |
|---------------------------|--------------------------------------------------------------------------|
| `npm run geocode`         | `data/Locations.xlsx` → `locations.json` + `offices.json`                 |
| `npm run gemeinden`       | BKG-VG250-Shapefile → Tabelle `gemeinden`                                |
| `npm run boundaries`      | Gemeinden je Ring vereinigen → amtliche Ringgrenzen                      |
| `npm run polygons`        | *Rückfallebene:* konvexe Hülle je Ring                                   |
| `npm run migrate`         | nur das Schema aus `sql/schema.sql` anwenden                             |
| `npm run seed`            | Schema + Ringe + Grenzen + Geschäftsstellen + Benutzerkonten             |
| `npm run import-staff`    | `data/Staff.xlsx` → Tabelle `staff`                                      |
| `npm run backfill-coords` | Koordinaten für Wohnorte nachtragen                                      |
| `npm run import-rings`    | Ringe aus der Ortsliste anlegen (`ALL_RINGS=1` für alle)                 |
| `npm run create-superadmin` | Super-Administrator anlegen oder hochstufen                            |
| `npm run import-websites` | Websites der Ringe eintragen                                            |

Das Geocoding nutzt OpenStreetMap Nominatim (max. 1 Anfrage/Sekunde) und legt
die Ergebnisse in `data/geocode-cache.json` ab. Weil viele kleine Ortsnamen
mehrfach vorkommen („Horn“, „Kirchberg“, „Mühlholz“), wird jeder Treffer gegen
den Mittelpunkt seiner Postleitzahl geprüft und bei mehr als 25 km Abweichung
ersetzt.

## Offene Punkte

* Die Rechtstexte müssen fachlich freigegeben werden (`[BITTE PRÜFEN]`).
* Die Gemeinde **Fichtenau** ist in der Ortsliste zwei Ringen zugeordnet; ihre
  Fläche gehört daher zu beiden Ringgrenzen. Fachlich zu klären.
* Zwei Orte der Ortsliste konnten nicht geocodiert werden.
* Der Service Worker konnte in dieser Umgebung nicht praktisch geprüft werden
  (die Automatisierungs-Browser stellen `navigator.serviceWorker` nicht bereit).
  Manifest, Symbole und Auslieferung sind geprüft; die Installation zum
  Startbildschirm bitte einmal auf einem echten Gerät über HTTPS testen.
* Ein Auftragsverarbeitungsvertrag mit dem Hoster und eine Vereinbarung nach
  Art. 26 DSGVO zwischen den Ringen sind vor dem Produktivgang abzuschließen.
