/**
 * Nutzungsbedingungen und Datenschutzerklärung.
 *
 * WICHTIG: Diese Texte sind ein fachlich fundierter Entwurf für eine rein
 * interne Anwendung. Sie ersetzen KEINE Rechtsberatung. Vor dem Produktivgang
 * müssen die mit [BITTE PRÜFEN] markierten Angaben ergänzt und der Text von
 * einer/einem Datenschutzbeauftragten oder einer Kanzlei freigegeben werden.
 *
 * Wird ein Text inhaltlich geändert, MUSS die Version hochgezählt werden –
 * dann wird die Zustimmung bei der nächsten Anmeldung erneut eingeholt.
 */

export const TERMS_VERSION = '1.0';
export const PRIVACY_VERSION = '1.0';

export const TERMS_TEXT = `
# Nutzungsbedingungen der Mithelferbörse

**Version ${TERMS_VERSION}, Stand: Januar 2026**

## 1. Geltungsbereich und Zweck

Die Mithelferbörse ist eine **interne Anwendung der beteiligten Maschinen- und
Betriebshilfsringe**. Sie dient ausschließlich dazu, freie Kapazitäten von
Betriebshelfer/innen und Hauswirtschafter/innen zwischen den beteiligten Ringen
sichtbar zu machen, damit Einsatzanfragen ringübergreifend vermittelt werden
können.

Die Anwendung ist nicht öffentlich. Der Zugang ist ausschließlich Beschäftigten
der beteiligten Ringe vorbehalten, die von ihrer Ringverwaltung ein Konto
erhalten haben.

## 2. Zugangsdaten

1. Jedes Konto ist **persönlich** und darf nicht weitergegeben werden. Das gilt
   auch für den Zugangslink und den QR-Code der Anwendung.
2. Das Passwort ist geheim zu halten. Es darf nicht notiert oder in
   gemeinsam genutzten Ablagen gespeichert werden.
3. Wird ein Passwort vergessen, kann über „Passwort vergessen“ eine Anfrage an
   die Ringverwaltung gestellt werden. Diese erzeugt ein neues Passwort und
   übergibt es persönlich. Das neue Passwort ist bei der ersten Anmeldung zu
   ändern.
4. Besteht der Verdacht, dass Unbefugte Kenntnis von den Zugangsdaten erlangt
   haben, ist die Ringverwaltung unverzüglich zu informieren.

## 3. Zulässige Nutzung

Die in der Anwendung sichtbaren Daten dürfen **ausschließlich zum Zweck der
Einsatzvermittlung** verwendet werden.

Untersagt ist insbesondere:

* die Weitergabe von Daten an Personen außerhalb der beteiligten Ringe,
* das Anfertigen von Kopien, Ausdrucken, Bildschirmfotos oder Exporten über den
  konkreten Vermittlungsanlass hinaus,
* jede Verwendung zu Werbe-, Bewertungs- oder Kontrollzwecken,
* der Versuch, technische Schutzmaßnahmen zu umgehen oder auf Daten anderer
  Ringe zuzugreifen, die die Anwendung nicht anzeigt.

## 4. Pflichten bei der Datenpflege

1. Jeder Ring pflegt ausschließlich die Daten der **eigenen** Beschäftigten und
   ist für deren Richtigkeit und Aktualität verantwortlich.
2. Ein freier Zeitraum ist nur einzutragen, wenn die betroffene Person
   tatsächlich für einen Einsatz zur Verfügung steht.
3. Endet die Beschäftigung, ist der Datensatz zeitnah zu löschen.
4. Die betroffenen Beschäftigten sind vom jeweiligen Ring darüber zu
   informieren, dass ihre Daten in dieser Anwendung verarbeitet werden.

## 5. Sichtbarkeit für andere Ringe

Für Beschäftigte **anderer** Ringe sind ausschließlich sichtbar: Kürzel,
Wohnort, Stunden pro Tag, Einsatzart, Maschinenring, Einsatzleitung mit
Telefonnummer und E-Mail-Adresse sowie der freie Zeitraum. **Vor- und Nachname
werden anderen Ringen nicht angezeigt.**

## 6. Verfügbarkeit

Die Ringe bemühen sich um einen durchgehenden Betrieb, schulden aber keine
bestimmte Verfügbarkeit. Wartungsarbeiten und Störungen können zu
Unterbrechungen führen. Die Anwendung ersetzt nicht die telefonische
Abstimmung im Einzelfall; die Einsatzzusage erfolgt weiterhin unmittelbar
zwischen den beteiligten Ringen.

## 7. Verstöße

Bei Verstößen gegen diese Bedingungen kann der Zugang gesperrt werden.
Arbeits- und datenschutzrechtliche Konsequenzen bleiben vorbehalten.

## 8. Änderungen

Änderungen dieser Bedingungen werden bei der nächsten Anmeldung angezeigt und
sind erneut zu bestätigen.

## 9. Kontakt

Betreiber: [BITTE PRÜFEN: federführender Ring, Anschrift]
Ansprechpartner: [BITTE PRÜFEN: Name, E-Mail, Telefon]
`.trim();

export const PRIVACY_TEXT = `
# Datenschutzerklärung der Mithelferbörse

**Version ${PRIVACY_VERSION}, Stand: Januar 2026**

## 1. Verantwortlicher

Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:

[BITTE PRÜFEN: federführender Maschinenring, Anschrift, Telefon, E-Mail]

Die beteiligten Ringe sind hinsichtlich der gemeinsam genutzten Übersicht
**gemeinsam Verantwortliche nach Art. 26 DSGVO**. Die Aufgabenverteilung ist in
einer gesonderten Vereinbarung zu regeln.
[BITTE PRÜFEN: Vereinbarung nach Art. 26 DSGVO abschließen]

Datenschutzbeauftragte/r: [BITTE PRÜFEN]

## 2. Welche Daten verarbeitet werden

**a) Daten der Betriebshelfer/innen und Hauswirtschafter/innen**

Vorname, Name, Kürzel, Geschlecht, Wohnort (mit daraus abgeleiteten
Koordinaten), Einsatzart (landwirtschaftlich/städtisch), Stunden pro Tag,
zuständiger Maschinenring, Einsatzleitung mit Telefonnummer und E-Mail-Adresse
sowie eingetragene freie Zeiträume.

**b) Daten der Benutzerinnen und Benutzer der Anwendung**

Name, dienstliche E-Mail-Adresse, ggf. Telefonnummer, Ringzugehörigkeit, Rolle,
Zeitpunkt der letzten Anmeldung, Zeitpunkt der Zustimmung zu Nutzungsbedingungen
und Datenschutzerklärung sowie ein kryptografischer Hash des Passworts
(bcrypt – das Passwort selbst wird nicht gespeichert).

**c) Protokolldaten**

Administrative Vorgänge (Anlegen, Ändern, Löschen von Konten, Zurücksetzen von
Passwörtern) werden mit Zeitpunkt und handelnder Person protokolliert.

## 3. Zweck und Rechtsgrundlage

| Zweck | Rechtsgrundlage |
|---|---|
| Vermittlung freier Einsatzkräfte zwischen den Ringen | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Auslastung des Sozialdienstes) |
| Verarbeitung von Beschäftigtendaten | § 26 BDSG i. V. m. Art. 88 DSGVO (Durchführung des Beschäftigungsverhältnisses) |
| Kontenverwaltung und Zugriffsschutz | Art. 6 Abs. 1 lit. f DSGVO, Art. 32 DSGVO |
| Protokollierung administrativer Vorgänge | Art. 5 Abs. 2, Art. 32 DSGVO (Rechenschaftspflicht) |

Die Angabe des **Geschlechts** dient allein der farblichen Kennzeichnung auf der
Karte, weil Einsätze in Familien geschlechtsbezogen angefragt werden. Die Angabe
ist freiwillig; ohne Angabe wird der Marker neutral dargestellt.
[BITTE PRÜFEN: Erforderlichkeit dieser Angabe mit der Personalvertretung klären]

## 4. Wer die Daten sehen kann

Zugriff haben ausschließlich die berechtigten Benutzer der beteiligten Ringe.

Für Beschäftigte **anderer** Ringe werden **Vor- und Nachname technisch nicht
übertragen**. Sichtbar sind dort nur Kürzel, Wohnort, Stunden pro Tag,
Einsatzart, Maschinenring, Einsatzleitung mit Kontaktdaten und der freie
Zeitraum.

Eine Übermittlung an Dritte findet nicht statt. Es erfolgt keine Übermittlung in
Länder außerhalb der EU/des EWR.

## 5. Auftragsverarbeiter

* **Hosting:** [BITTE PRÜFEN: Anbieter, Standort] – Auftragsverarbeitungsvertrag
  nach Art. 28 DSGVO erforderlich. Der Serverstandort liegt in Deutschland.
* **Kartendarstellung:** Die Kartenkacheln werden von der OpenStreetMap
  Foundation geladen. Dabei wird die IP-Adresse des Endgeräts an deren Server
  übertragen. Siehe https://osmfoundation.org/wiki/Privacy_Policy
* **Geokodierung:** Wohnorte werden einmalig über den Dienst Nominatim der
  OpenStreetMap Foundation in Koordinaten umgerechnet. Übermittelt wird dabei
  nur der Ortsname, kein Personenbezug.

## 6. Speicherdauer

* Abgelaufene freie Zeiträume werden **automatisch täglich gelöscht**.
* Daten von Beschäftigten werden gelöscht, sobald das Beschäftigungsverhältnis
  endet – spätestens jedoch, wenn der zuständige Ring den Datensatz löscht.
* Benutzerkonten werden bei Ausscheiden deaktiviert und anschließend gelöscht.
* Protokolldaten werden nach [BITTE PRÜFEN: z. B. 12 Monaten] gelöscht.

## 7. Ihre Rechte

Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung
(Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
(Art. 20) und **Widerspruch gegen die Verarbeitung (Art. 21)**.

Wenden Sie sich dazu an Ihre Ringverwaltung oder an die oben genannte
verantwortliche Stelle.

Ihnen steht ferner ein Beschwerderecht bei einer Aufsichtsbehörde zu. Zuständig
ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit
Baden-Württemberg, Lautenschlagerstraße 20, 70173 Stuttgart.

## 8. Technische und organisatorische Maßnahmen

Übertragung ausschließlich verschlüsselt (TLS/HTTPS), Passwörter als bcrypt-Hash
gespeichert, rollen- und ringbezogene Zugriffsbeschränkung, serverseitige
Maskierung personenbezogener Daten anderer Ringe, Protokollierung
administrativer Vorgänge, regelmäßige Sicherungen.

## 9. Keine Cookies zu Analysezwecken

Die Anwendung verwendet keine Analyse- oder Werbe-Cookies und bindet keine
externen Analysedienste ein. Gespeichert werden im Browser lediglich das
Anmelde-Token und die gewählte Darstellung (hell/dunkel) – beides ist für den
Betrieb erforderlich.
`.trim();
