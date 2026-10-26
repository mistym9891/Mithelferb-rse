import { TERMS_TEXT, PRIVACY_TEXT } from './legal';
import { pushConfigured } from '../services/push';
import { mailConfigured } from '../services/mail';

/**
 * Prüfung beim Start – nur im Produktivbetrieb.
 *
 * Hintergrund: mehrere Dinge schalten sich bei fehlender Konfiguration
 * stillschweigend ab oder bleiben unfertig stehen. Im Entwicklungsbetrieb ist
 * das richtig, im Echtbetrieb ist es gefährlich:
 *
 *  - Ohne VAPID-Schlüssel gibt es keine Benachrichtigung bei geschlossener
 *    App. Die Oberfläche sieht trotzdem vollständig aus.
 *  - In den Rechtstexten stehen Platzhalter „[BITTE PRÜFEN …]". Eine
 *    Datenschutzerklärung, die den Verantwortlichen nicht nennt, erfüllt
 *    Art. 13 DSGVO nicht – und hier werden Namen, Wohnorte und Telefonnummern
 *    von Beschäftigten verarbeitet.
 *  - Ein Beispielpasswort aus der Vorlage wäre öffentlich bekannt.
 *
 * Die Prüfung bricht den Start nicht ab: ein Server, der nach einem Neustart
 * nicht hochkommt, wäre schlimmer als einer mit Lücken. Sie schreibt aber eine
 * unübersehbare Warnung ins Protokoll.
 */
export function pruefeStartkonfiguration(): string[] {
  const maengel: string[] = [];

  if (process.env.NODE_ENV !== 'production') return maengel;

  const platzhalter = (TERMS_TEXT + PRIVACY_TEXT).match(/\[BITTE PRÜFEN[^\]]*\]/g);
  if (platzhalter?.length) {
    maengel.push(
      `Rechtstexte: ${platzhalter.length} Platzhalter noch offen ` +
      `(z. B. "${platzhalter[0].slice(0, 60)}"). ` +
      'Impressum und Datenschutzerklärung müssen vor der Freigabe ergänzt werden.'
    );
  }

  if (!pushConfigured()) {
    maengel.push(
      'VAPID-Schlüssel fehlen – Benachrichtigungen erreichen nur, wer die App ' +
      'gerade offen hat. Erzeugen mit: npx web-push generate-vapid-keys'
    );
  }

  const schwach = ['BITTE-AENDERN', 'devsecret', 'changeme', 'postgres'];
  if (!process.env.JWT_SECRET || schwach.includes(process.env.JWT_SECRET)) {
    maengel.push(
      'JWT_SECRET ist nicht gesetzt oder stammt aus der Vorlage. Wer ihn kennt, ' +
      'kann gültige Anmeldungen erzeugen. Erzeugen mit: openssl rand -base64 48'
    );
  }
  if (schwach.includes(process.env.DB_PASSWORD ?? '')) {
    maengel.push('DB_PASSWORD stammt aus der Vorlage. Erzeugen mit: openssl rand -base64 32');
  }

  if (!process.env.APP_URL) {
    maengel.push(
      'APP_URL ist nicht gesetzt – Links in Benachrichtigungen folgen dann dem ' +
      'Hostnamen der Anfrage, was hinter einem Proxy falsch sein kann.'
    );
  }

  // Kein Mangel, nur ein Hinweis: ohne SMTP funktioniert alles, die Anfragen
  // stehen dann ausschließlich in der App.
  if (!mailConfigured()) {
    console.info('[Start] SMTP nicht eingerichtet – Passwortanfragen erscheinen nur in der App.');
  }

  return maengel;
}

export function meldeStartkonfiguration(): void {
  const maengel = pruefeStartkonfiguration();
  if (maengel.length === 0) return;
  console.warn('');
  console.warn('='.repeat(72));
  console.warn(`ACHTUNG: ${maengel.length} Punkt(e) vor dem Produktivgang offen`);
  console.warn('='.repeat(72));
  maengel.forEach((m, i) => console.warn(`  ${i + 1}. ${m}`));
  console.warn('='.repeat(72));
  console.warn('');
}
