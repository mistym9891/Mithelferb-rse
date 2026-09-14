import { useEffect, useRef } from 'react';

/**
 * Hält die angezeigten Daten aktuell.
 *
 * Die Echtzeit-Ereignisse über Socket.IO sind der Hauptweg. Sie können aber
 * ausfallen – Funkloch, Ruhezustand des Handys, WLAN-Wechsel, Neustart des
 * Servers. Deshalb wird zusätzlich neu geladen, wenn
 *
 *   * der Tab wieder sichtbar wird (Handy aus der Tasche geholt),
 *   * das Fenster den Fokus bekommt,
 *   * das Gerät wieder online ist,
 *   * seit dem letzten Laden das Intervall verstrichen ist.
 *
 * So sieht niemand versehentlich einen veralteten Stand.
 */
export function useAutoRefresh(refresh: () => void | Promise<void>, intervalMs = 60000) {
  const savedRefresh = useRef(refresh);
  savedRefresh.current = refresh;

  const lastRun = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    const run = async (force = false) => {
      if (cancelled) return;
      // Beim Fokuswechsel nicht öfter als alle 5 Sekunden nachladen.
      if (!force && Date.now() - lastRun.current < 5000) return;
      lastRun.current = Date.now();
      await savedRefresh.current();
    };

    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    const onFocus = () => run();
    const onOnline = () => run(true);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    const timer = window.setInterval(() => {
      // Im Hintergrund nicht pollen – das kostet auf dem Handy nur Akku.
      if (document.visibilityState === 'visible') run(true);
    }, intervalMs);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
}
