# Vereinbarung über die gemeinsame Verantwortlichkeit nach Art. 26 DSGVO

**BHD-Regionalplan – gemeinsame Übersicht freier Betriebshelfer/innen und
Hauswirtschafter/innen**

> **Entwurf.** Dieser Text ist fachlich auf die Anwendung zugeschnitten, er
> ersetzt aber keine Rechtsberatung. Vor der Unterzeichnung sollte er von einer
> Kanzlei oder einer/einem Datenschutzbeauftragten geprüft werden.
>
> Das Wesentliche dieser Vereinbarung ist in der Datenschutzerklärung der
> Anwendung zusammengefasst (Abschnitt 1) und damit für die Beschäftigten
> einsehbar, wie Art. 26 Abs. 2 DSGVO es verlangt. Wird diese Vereinbarung
> geändert, ist die Zusammenfassung in `backend/src/config/legal.ts`
> mitzuändern und die `PRIVACY_VERSION` hochzuzählen – dann wird die
> Zustimmung bei der nächsten Anmeldung erneut eingeholt.

---

## § 1 Beteiligte

Diese Vereinbarung wird geschlossen zwischen den nachstehend aufgeführten
Maschinen- und Betriebshilfsringen (nachfolgend „Ringe"):

| Lfd. Nr. | Ring | Anschrift | Vertreten durch |
|---|---|---|---|
| 1 | Maschinen- und Betriebshilfsring Schwäbisch Hall e. V. | Torstraße 5, 74532 Ilshofen | Lorenz Maisch (Vorsitzender), Fritz Hube (Geschäftsführer) |
| 2 | *(weiterer Ring)* | | |
| 3 | *(weiterer Ring)* | | |

*Tritt ein weiterer Ring bei, wird er durch Beitrittserklärung Partei dieser
Vereinbarung; einer Neuunterzeichnung durch die übrigen Ringe bedarf es nicht.
Die Liste in § 1 und Abschnitt 1 der Datenschutzerklärung sind entsprechend zu
ergänzen.*

## § 2 Gegenstand und Zweck

Die Ringe betreiben gemeinsam eine Anwendung, in der freie Einsatzzeiten von
Betriebshelfer/innen und Hauswirtschafter/innen ringübergreifend sichtbar
gemacht werden. Zweck ist die **Vermittlung von Betriebs- und Haushaltshilfe**
bei Krankheit, Unfall oder Ausfall eines Betriebsleiters.

Die Ringe legen Zweck und Mittel dieser Verarbeitung gemeinsam fest und sind
insoweit **gemeinsam Verantwortliche nach Art. 26 DSGVO**.

## § 3 Verarbeitete Daten

Je Beschäftigte/r: Vorname, Nachname, Kürzel, Wohnort (daraus abgeleitet
Koordinaten für die Karte), Einsatzart, Stunden pro Tag, Geschlecht
(freiwillig), freie Zeiträume sowie Name und Kontaktdaten der Einsatzleitung.

Für Benutzerkonten zusätzlich: Name, E-Mail-Adresse, Rolle, Ringzugehörigkeit,
Zeitpunkt der letzten Anmeldung und der Zustimmung zu den Nutzungsbedingungen.

## § 4 Aufteilung der Verantwortung

**(1) Datenhoheit.** Jeder Ring ist für die Daten **seiner eigenen**
Beschäftigten und Benutzerkonten allein verantwortlich: Erhebung, Richtigkeit,
Aktualisierung und Löschung. Kein Ring darf Daten eines anderen Rings
verändern; die Anwendung verhindert dies technisch.

**(2) Sichtbarkeit.** Ob und für welchen Zeitraum eine Kraft als frei gemeldet
wird, entscheidet allein der Ring, dem sie angehört. Ohne Freimeldung ist sie
für andere Ringe nicht sichtbar.

**(3) Datenminimierung.** Vor- und Nachname werden an andere Ringe technisch
nicht übertragen. Für fremde Ringe sichtbar sind ausschließlich Kürzel,
Wohnort, Stunden pro Tag, Einsatzart, Ring, Einsatzleitung mit Kontaktdaten und
der freie Zeitraum.

**(4) Technischer Betrieb.** Der in § 1 Nr. 1 genannte Ring („betreibender
Ring") führt den technischen Betrieb für alle Beteiligten: Serverbetrieb,
Datensicherung, Aktualisierungen, Verwaltung der Auftragsverarbeiter. Er wird
dadurch nicht Verantwortlicher für die Daten der übrigen Ringe.

**(5) Informationspflichten.** Jeder Ring informiert seine eigenen
Beschäftigten nach Art. 13 DSGVO. Die Anwendung unterstützt dies, indem sie
Nutzungsbedingungen und Datenschutzerklärung bei der ersten Anmeldung anzeigt
und die Zustimmung festhält.

**(6) Datenschutzbeauftragte.** Ein gemeinsamer Datenschutzbeauftragter wird
nicht bestellt. Die Verantwortung für den Datenschutz liegt bei der
Geschäftsführung des jeweiligen Rings. Jeder Ring prüft eigenständig, ob er
nach § 38 BDSG zur Bestellung verpflichtet ist.

## § 5 Rechte der betroffenen Personen

**(1)** Betroffene können ihre Rechte nach Art. 15 bis 22 DSGVO gemäß
Art. 26 Abs. 3 DSGVO gegenüber **jedem** beteiligten Ring geltend machen.

**(2)** Anlaufstelle ist in der Regel der eigene Ring. Geht ein Anliegen bei
einem anderen Ring ein, leitet dieser es **unverzüglich, spätestens innerhalb
von drei Werktagen**, an den zuständigen Ring weiter und teilt dies der
betroffenen Person mit.

**(3)** Der zuständige Ring beantwortet das Anliegen innerhalb der Frist des
Art. 12 Abs. 3 DSGVO (ein Monat). Die übrigen Ringe unterstützen ihn, soweit
dafür Angaben aus ihrem Bereich erforderlich sind.

## § 6 Sicherheit der Verarbeitung

Die Ringe stellen gemeinsam sicher, dass die Maßnahmen nach Art. 32 DSGVO
eingehalten werden. Umgesetzt sind insbesondere:

* Übertragung ausschließlich verschlüsselt (HTTPS),
* Zugang nur über persönliche Benutzerkonten mit Rollentrennung
  (Super-Administration, Ring-Administration, Einsatzleitung),
* Passwörter ausschließlich als Hash gespeichert (bcrypt),
* Beschränkung jedes Rings auf die eigenen Daten, technisch erzwungen,
* Protokollierung administrativer Vorgänge,
* tägliche Datensicherung, Aufbewahrung 30 Tage,
* Serverstandort Deutschland.

## § 7 Auftragsverarbeiter

Der betreibende Ring schließt die erforderlichen Verträge nach Art. 28 DSGVO.
Derzeit eingesetzt:

| Auftragsverarbeiter | Leistung | Standort |
|---|---|---|
| Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen | Serverbetrieb (Rechenzentrum Nürnberg) | Deutschland |

Die Einbindung weiterer Auftragsverarbeiter ist den übrigen Ringen vorher
mitzuteilen.

## § 8 Verletzungen des Schutzes personenbezogener Daten

Wird einem Ring eine Verletzung bekannt, unterrichtet er **unverzüglich,
spätestens innerhalb von 24 Stunden**, den betreibenden Ring und die übrigen
Ringe. Die Meldung nach Art. 33 DSGVO an die Aufsichtsbehörde nimmt der Ring
vor, dessen Beschäftigte betroffen sind; bei einer Verletzung im technischen
Betrieb übernimmt dies der betreibende Ring in Abstimmung mit den übrigen.

## § 9 Löschung

* Abgelaufene freie Zeiträume werden automatisch täglich gelöscht.
* Daten von Beschäftigten löscht der jeweilige Ring, sobald das
  Beschäftigungsverhältnis endet.
* Protokolldaten über administrative Vorgänge werden nach zwölf Monaten
  gelöscht.
* Scheidet ein Ring aus, löscht der betreibende Ring dessen Daten innerhalb
  eines Monats; § 10 Abs. 2 bleibt unberührt.

## § 10 Laufzeit

**(1)** Die Vereinbarung gilt ab Unterzeichnung auf unbestimmte Zeit.

**(2)** Jeder Ring kann seine Teilnahme mit einer Frist von drei Monaten zum
Monatsende kündigen. Gesetzliche Aufbewahrungspflichten bleiben unberührt.

## § 11 Schlussbestimmungen

Änderungen bedürfen der Textform. Sollte eine Bestimmung unwirksam sein, bleibt
die Vereinbarung im Übrigen wirksam.

---

## Unterschriften

| Ring | Ort, Datum | Name, Funktion | Unterschrift |
|---|---|---|---|
| | | | |
| | | | |
| | | | |
