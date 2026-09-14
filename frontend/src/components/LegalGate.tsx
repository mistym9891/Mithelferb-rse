import React, { useEffect, useRef, useState } from 'react';
import { getLegal, acceptLegal } from '../api';

/**
 * Wird bei der ersten Anmeldung (und nach jeder Textänderung) angezeigt.
 * Die App ist erst nach Zustimmung zu beiden Texten nutzbar.
 */
const LegalGate: React.FC<{ onAccepted: () => void; onLogout: () => void }> = ({ onAccepted, onLogout }) => {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const [texts, setTexts] = useState<{ terms: string; privacy: string } | null>(null);
  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getLegal()
      .then(r => setTexts({ terms: r.data.terms.text, privacy: r.data.privacy.text }))
      .catch(() => setError('Die Texte konnten nicht geladen werden.'));
  }, []);

  // Beim Wechsel des Reiters nach oben scrollen.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [tab]);

  /** Merkt sich, dass der jeweilige Text bis zum Ende gelesen wurde. */
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (!atEnd) return;
    if (tab === 'terms') setReadTerms(true); else setReadPrivacy(true);
  };

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await acceptLegal();
      onAccepted();
    } catch {
      setError('Die Zustimmung konnte nicht gespeichert werden. Bitte erneut versuchen.');
      setSaving(false);
    }
  };

  const canSubmit = agreeTerms && agreePrivacy && !saving;

  /**
   * Sehr einfache Markdown-Darstellung – die Texte sind bewusst schlicht.
   * Fortlaufende Zeilen eines Absatzes werden zuerst zusammengefügt, damit
   * **Hervorhebungen** auch über einen Zeilenumbruch hinweg erkannt werden.
   */
  const render = (md: string) => {
    const isSpecial = (l: string) =>
      /^(#{1,3} |\* |\d+\. |\|)/.test(l) || l.trim() === '';

    const blocks: string[] = [];
    for (const line of md.split('\n')) {
      const last = blocks[blocks.length - 1];
      if (!isSpecial(line) && last !== undefined && !isSpecial(last) && last.trim() !== '') {
        blocks[blocks.length - 1] = `${last} ${line.trim()}`;
      } else {
        blocks.push(line);
      }
    }

    return blocks.map((line, i) => {
      if (line.startsWith('### ')) return <h3 key={i} className="font-semibold mt-4 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith('## '))  return <h2 key={i} className="font-bold text-base mt-5 mb-1">{line.slice(3)}</h2>;
      if (line.startsWith('# '))   return <h1 key={i} className="font-bold text-lg mb-2">{line.slice(2)}</h1>;
      if (line.startsWith('* '))   return <li key={i} className="ml-5 list-disc">{strong(line.slice(2))}</li>;
      if (/^\d+\. /.test(line))    return <li key={i} className="ml-5 list-decimal">{strong(line.replace(/^\d+\. /, ''))}</li>;
      if (line.startsWith('|'))    return <div key={i} className="font-mono text-xs opacity-80 whitespace-pre-wrap">{line}</div>;
      if (line.trim() === '')      return <div key={i} className="h-2" />;
      return <p key={i} className="mb-1">{strong(line)}</p>;
    });
  };

  const strong = (text: string): React.ReactNode => {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
  };

  const tabBtn = (id: 'terms' | 'privacy', shortLabel: string, done: boolean, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 h-10 text-sm font-medium border-b-2 whitespace-nowrap ${
        tab === id
          ? 'border-mr-green text-mr-green dark:border-mr-light dark:text-mr-light'
          : 'border-transparent text-gray-500 dark:text-gray-400'
      }`}
    >
      <span className="hidden xs:inline">{label}</span>
      <span className="xs:hidden">{shortLabel}</span>
      {done && <span className="text-green-600 dark:text-green-400 ml-1">✓</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 flex items-start sm:items-center justify-center
                    p-2 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[92dvh]">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-base sm:text-lg font-bold">Willkommen bei der Mithelferbörse</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Bitte lesen Sie beide Texte und stimmen Sie zu. Ohne Zustimmung ist die
            App nicht nutzbar.
          </p>
        </div>

        <div className="flex gap-1 px-3 sm:px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          {tabBtn('terms', 'Nutzung', readTerms, 'Nutzungsbedingungen')}
          {tabBtn('privacy', 'Datenschutz', readPrivacy, 'Datenschutz')}
        </div>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-[44dvh] sm:h-auto sm:flex-1 sm:min-h-0 overflow-y-auto p-3 sm:p-4
                     text-sm leading-relaxed bg-gray-50 dark:bg-gray-900/40"
        >
          {texts
            ? render(tab === 'terms' ? texts.terms : texts.privacy)
            : <p className="text-gray-500">Texte werden geladen…</p>}
        </div>

        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-mr-green"
                   checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
            <span className="text-xs sm:text-sm">Ich habe die <strong>Nutzungsbedingungen</strong> gelesen und stimme ihnen zu.</span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-mr-green"
                   checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)} />
            <span className="text-xs sm:text-sm">Ich habe die <strong>Datenschutzerklärung</strong> zur Kenntnis genommen.</span>
          </label>

          {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 bg-mr-green hover:bg-mr-dark disabled:opacity-40 disabled:cursor-not-allowed text-white h-11 rounded font-medium"
            >
              {saving ? 'Wird gespeichert…' : 'Zustimmen und fortfahren'}
            </button>
            <button
              onClick={onLogout}
              className="sm:w-40 h-11 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalGate;
