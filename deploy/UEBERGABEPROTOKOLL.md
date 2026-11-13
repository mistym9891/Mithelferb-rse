# Übergabeprotokoll – BHD-Regionalplan

**Anwendung:** BHD-Regionalplan – gemeinsame Übersicht freier
Betriebshelfer/innen und Hauswirtschafter/innen der Maschinenringe

**Betrieb seit:** 12. November 2026
**Stand dieses Protokolls:** 14. November 2026

---

## 1. Was übergeben wird

| | |
|---|---|
| Adresse | **<https://bhdregio.de>** (`www.bhdregio.de` leitet dorthin) |
| Verschlüsselung | Let's-Encrypt-Zertifikat, erneuert sich selbsttätig |
| Server | Hetzner Cloud, Rechenzentrum Nürnberg, Deutschland |
| Ausstattung | 2 vCPU, 4 GB RAM, 40 GB NVMe, Ubuntu 26.04 LTS |
| Konto bei Hetzner | lautet auf den Kunden (Asedi GmbH, K1169609126) |
| Domain | `bhdregio.de`, registriert über Hetzner |
| Quelltext | Git-Repository, vollständig mit Entwicklungsverlauf |

Die Anwendung läuft im Browser auf Handy, Tablet und Rechner und lässt sich
zum Startbildschirm hinzufügen. Sie ist **nicht** über App-Stores zu beziehen –
so war es vereinbart.

## 2. Was die Anwendung enthält

* **25 Maschinenringe Baden-Württembergs** mit amtlichen Grenzen auf Grundlage
  der Verwaltungsgebiete VG250 des Bundesamtes für Kartographie und Geodäsie
* **1 303 Orte und Teilorte**, ab Zoomstufe 11 auf der Karte sichtbar
* Geschäftsstelle je Ring mit Anschrift und Verweis auf die eigene Website
* Karte (basemap.de des BKG) und Tabelle, hell und dunkel
* Drei Rollen: Einsatzleitung, Ring-Administration, Super-Administration
* Benachrichtigungen in Echtzeit und – bei hinzugefügter App – auch bei
  geschlossener Anwendung
* Nutzungsbedingungen und Datenschutzerklärung mit Zustimmung bei der ersten
  Anmeldung

**Geprüfte Datenqualität:** keine Ringgrenze überschreitet die Landesgrenze
(0,00 ha außerhalb Baden-Württembergs), keine zwei Ringgebiete überlappen,
keine fehlerhafte Geometrie, Landesfläche 35 749 km² gegenüber amtlich
35 748 km².

## 3. Zustand bei der Übergabe

Der Datenbestand ist **leer**, bis auf die Stammdaten der Ringe:

* keine Mitarbeiterdaten
* keine Freimeldungen
* ein einziges Benutzerkonto: die Super-Administration

Die Ringe legen ihre Konten und Kräfte selbst an. Die Eingabefelder enthalten
Beispiele und Hinweise.

## 4. Zugangsdaten

Die Zugangsdaten der Super-Administration werden **getrennt von diesem
Protokoll** übergeben – nicht per E-Mail. Das Passwort muss bei der ersten
Anmeldung geändert werden.

Ebenfalls getrennt zu übergeben bzw. zu übernehmen:

* der private SSH-Schlüssel für den Serverzugang
* die Datei `.env` auf dem Server (enthält Datenbankpasswort,
  Signaturschlüssel und die Schlüssel für Benachrichtigungen)

## 5. Laufender Betrieb

* Alle Dienste starten nach Absturz oder Neustart selbsttätig
  (`restart: unless-stopped`).
* Die Datenbank wird **täglich um 02:30 Uhr** gesichert, Aufbewahrung 30 Tage.
* Sicherheitsupdates des Betriebssystems laufen automatisch.
* Firewall: nur SSH und Web (80/443) erreichbar, fail2ban aktiv.

Laufende Kosten trägt der Kunde unmittelbar gegenüber Hetzner (Server, Backups,
Domain). Karten- und Grenzdaten sind kostenfrei (dl-de/by-2-0).

## 6. Was der Kunde noch erledigen muss

| | Punkt | Warum |
|---|---|---|
| 1 | **Vereinbarung nach Art. 26 DSGVO** prüfen und unterzeichnen | Die Ringe sind gemeinsam Verantwortliche. Entwurf liegt bei. |
| 2 | **Auftragsverarbeitungsvertrag mit Hetzner** abschließen | Art. 28 DSGVO; Hetzner stellt ihn im Kundenkonto bereit |
| 3 | **Rechtstexte freigeben lassen** | Entwurf ist fachlich fundiert, ersetzt aber keine Rechtsberatung |
| 4 | **Sicherungen an einen zweiten Ort** einrichten | Derzeit liegt die einzige Sicherung auf demselben Server |
| 5 | **Telefonnummern der übrigen 23 Ringe** eintragen | Bisher nur Schwäbisch Hall und Hohenlohekreis hinterlegt |
| 6 | **Super-Administration auf eine dauerhafte Adresse** umstellen | Derzeit `bhdapp@mbr-sha.de` |

Zu Punkt 3: Die Angaben zum Verantwortlichen stammen aus Impressum und
Datenschutzerklärung des Maschinen- und Betriebshilfsrings Schwäbisch Hall.
Ein gesonderter Datenschutzbeauftragter ist nicht bestellt; die Verantwortung
liegt bei der Geschäftsführung des jeweiligen Rings.

## 7. Beiliegende Unterlagen

| Datei | Inhalt | Für wen |
|---|---|---|
| `00_UEBERGABEPROTOKOLL.md` | dieses Dokument | Leitung |
| `01_KURZANLEITUNG.md` | Bedienung der App | alle Ringe |
| `02_TECHNISCHE-DOKUMENTATION.md` | Aufbau, Datenquellen, Rollen, Skripte | IT |
| `03_SERVERBETRIEB.md` | Installation, Betrieb, Sicherung, Wiederherstellung | IT |
| `04_ART-26-VEREINBARUNG.md` | Entwurf der Vereinbarung zur Unterzeichnung | Leitung, Datenschutz |
| `bhdregio-qr.png` / `.svg` | QR-Code auf <https://bhdregio.de> | Weitergabe an die Ringe |

---

## 8. Bestätigung

| | Name | Datum | Unterschrift |
|---|---|---|---|
| Übergeben durch | | | |
| Übernommen durch | | | |
