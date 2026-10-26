# Übergabe: eigener Server bei Hetzner

Diese Anleitung richtet sich an den **Kunden**. Der Maschinenring legt Konto,
Server und Domain auf den eigenen Namen an. Das ist bewusst so: Konto, Daten
und Rechnung bleiben beim Ring, und ein Wechsel des Dienstleisters ist später
jederzeit ohne Übergabeprobleme möglich.

Technische Einzelheiten der Installation stehen in `SERVER-SETUP.md`. Hier
steht nur, was **vor** der Installation zu erledigen ist.

---

## 1. Konto anlegen

| Was | Adresse |
|---|---|
| Konto erstellen | <https://accounts.hetzner.com/signUp> |
| Cloud-Konsole (nach der Anmeldung) | <https://console.hetzner.cloud/> |

Als Kontoinhaber bitte den **Verein** eintragen, nicht eine Privatperson –
Rechnung und Vertrag laufen sonst auf den Namen des Mitarbeiters.

Hetzner prüft neue Konten gelegentlich von Hand; das kann einen Werktag
dauern. Zahlung per SEPA-Lastschrift oder Kreditkarte.

## 2. Server bestellen

Produktübersicht und Preise: <https://www.hetzner.com/cloud/>
(Die Preise erscheinen dort erst, wenn oben rechts Land und Währung
eingestellt sind – sie werden nachgeladen.)

Empfohlen:

| Punkt | Wahl | Warum |
|---|---|---|
| Typ | **CPX12** (1 vCPU, 2 GB RAM, 40 GB NVMe) genügt; **CPX22** (2 vCPU, 4 GB) gibt Luft | Die App besteht aus drei kleinen Diensten und einer Datenbank mit rund 1 300 Orten |
| Standort | **Falkenstein** oder **Nürnberg** | Deutschland. Es werden Namen, Wohnorte und Telefonnummern von Beschäftigten verarbeitet – der Serverstandort gehört in die Datenschutzerklärung |
| Betriebssystem | **Ubuntu 24.04 LTS** | Dafür ist `SERVER-SETUP.md` geschrieben |
| Backups | **einschalten** (Aufpreis ca. 20 % des Serverpreises) | Zusätzlich zur täglichen Datenbanksicherung der App. Ein Serverabbild rettet auch, wenn das Betriebssystem beschädigt ist |
| SSH-Schlüssel | beim Anlegen hinterlegen | Siehe Punkt 4 |

Schritt-für-Schritt-Anleitung von Hetzner:
<https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/>

## 3. Domain bestellen

Hetzner verkauft Domains getrennt vom Server (sie sind in keinem Paket
enthalten): <https://www.hetzner.com/webhosting/> → Domainsuche.

Eine `.de`-Domain genügt, zum Beispiel `bhd-regionalplan.de` oder eine
Unterdomain einer bereits vorhandenen Vereinsdomain
(`regionalplan.mein-ring.de`). Eine Unterdomain kostet nichts extra und ist
oft der schnellste Weg.

**Wichtig:** Ein `A`-Record der Domain muss auf die IPv4-Adresse des Servers
zeigen, bevor die App installiert wird. Das Zertifikat für HTTPS wird beim
ersten Start automatisch angefordert und funktioniert nur, wenn der Name
bereits auf den Server zeigt.

## 4. Zugang für die Einrichtung

Zwei Möglichkeiten, kein Passwort per E-Mail oder Messenger:

* **SSH-Schlüssel (empfohlen).** Wir erzeugen ein Schlüsselpaar und schicken
  nur den öffentlichen Teil. Dieser wird beim Anlegen des Servers unter
  „SSH-Schlüssel" eingefügt. Der Zugang lässt sich später mit einem Klick
  wieder entfernen.
* **Mitbenutzung des Projekts.** In der Cloud-Konsole lassen sich weitere
  Personen zu einem Projekt einladen. Ob und in welcher Form das im eigenen
  Tarif angeboten wird, zeigt die Konsole unter den Projekteinstellungen.

## 5. Was vor der Freigabe noch erledigt werden muss

Diese Punkte kann nur der Ring selbst beantworten. Die App weist beim Start
ausdrücklich darauf hin, solange sie offen sind.

1. **Impressum und Datenschutzerklärung vervollständigen.**
   In `backend/src/config/legal.ts` stehen an acht Stellen Platzhalter
   `[BITTE PRÜFEN …]`: federführender Ring mit Anschrift, Ansprechpartner,
   Datenschutzbeauftragte/r, Hosting-Anbieter und Standort, Aufbewahrungsdauer
   der Protokolldaten. Eine Datenschutzerklärung, die den Verantwortlichen
   nicht nennt, genügt Art. 13 DSGVO nicht.
   Wird der Text geändert, in derselben Datei `PRIVACY_VERSION` bzw.
   `TERMS_VERSION` hochzählen – dann wird die Zustimmung bei der nächsten
   Anmeldung erneut eingeholt.

2. **Vereinbarung über die gemeinsame Verantwortlichkeit (Art. 26 DSGVO)**
   zwischen den teilnehmenden Ringen abschließen, sowie einen
   Auftragsverarbeitungsvertrag mit dem Hoster. Hetzner stellt einen zur
   Verfügung.

3. **Geheimnisse erzeugen** (in `.env` auf dem Server, Vorlage:
   `.env.prod.example`):
   ```bash
   openssl rand -base64 48          # JWT_SECRET
   openssl rand -base64 32          # DB_PASSWORD
   npx web-push generate-vapid-keys # VAPID-Schlüsselpaar
   ```
   Ohne die VAPID-Schlüssel erreichen Benachrichtigungen nur, wer die App
   gerade offen hat.

4. **Telefonnummern und Ansprechpartner der Ringe.** Hinterlegt sind bisher
   nur Schwäbisch Hall und Hohenlohekreis. Die übrigen 23 Ringe tragen ihre
   Angaben unter *Verwaltung → Maschinenringe* selbst ein; sie erscheinen
   dann auf der Karte am Zeichen „MR …".

5. **Optional: E-Mail-Versand (SMTP).** Ohne SMTP funktioniert alles –
   Passwortanfragen erscheinen dann ausschließlich in der App unter
   *Verwaltung*. Mit SMTP bekommt die Ringverwaltung zusätzlich eine E-Mail.

## 6. Datenbestand übernehmen

Der vorhandene Bestand (25 Ringe mit amtlichen Grenzen, 1 303 Orte,
Geschäftsstellen, Benutzerkonten) wird **nicht neu aufgebaut**, sondern
übernommen. Das spart den 64-MB-Download der Geobasisdaten und rund zwanzig
Minuten Geokodierung – und übernimmt die bereits geprüfte Geometrie
(0,00 ha außerhalb Baden-Württembergs, keine Überlappungen).

```bash
# auf dem bisherigen Rechner
docker exec maschinenringe_db pg_dump -U postgres -Fc maschinenringe > bhd.dump

# auf den Server kopieren
scp bhd.dump root@<SERVER-IP>:/opt/

# auf dem Server, nachdem die Dienste laufen
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < /opt/bhd.dump
```

Danach die Testkonten löschen oder auf die echten Adressen umstellen und
**ein neues Passwort für die Super-Administration setzen** – die im Test
verwendeten Zugangsdaten dürfen nicht in den Echtbetrieb übernommen werden.

## 7. Laufende Kosten

| Posten | Anbieter |
|---|---|
| Cloud-Server, kleinste Größe | Hetzner, monatlich |
| Server-Backups (optional, ~20 % des Serverpreises) | Hetzner, monatlich |
| `.de`-Domain | Hetzner, jährlich |
| HTTPS-Zertifikat | Let's Encrypt, kostenlos, erneuert sich selbst |
| Kartenhintergrund (basemap.de), Grenzdaten (VG250) | Bund, kostenlos |

Die aktuellen Beträge stehen auf den oben verlinkten Seiten; sie werden dort
je nach Land und Umsatzsteuer eingeblendet.
