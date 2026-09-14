import { useCallback, useEffect, useState } from 'react';
import api from '../apiClient';

/**
 * Web-Push-Benachrichtigungen an- und abmelden.
 *
 * Die Pop-up-Meldung in der App sieht nur, wer sie gerade offen hat. Push
 * erreicht das Gerät auch im Hintergrund oder bei geschlossener App.
 *
 * Voraussetzungen:
 *  - sicherer Kontext (HTTPS; localhost gilt als sicher)
 *  - registrierter Service Worker
 *  - auf iOS zusätzlich: App zum Startbildschirm hinzugefügt (ab iOS 16.4)
 */

export type PushState = 'unsupported' | 'insecure' | 'denied' | 'off' | 'on' | 'busy';

/**
 * Der VAPID-Schlüssel kommt base64url-kodiert; die Push-API erwartet Rohbytes.
 * Der Puffer wird ausdrücklich als ArrayBuffer angelegt, damit der Typ zu
 * `applicationServerKey` passt (ein SharedArrayBuffer wäre dort nicht erlaubt).
 */
function urlBase64ToBytes(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function usePush() {
  const [state, setState] = useState<PushState>('busy');
  const [devices, setDevices] = useState(0);
  const [error, setError] = useState('');

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const refresh = useCallback(async () => {
    if (!supported) { setState('unsupported'); return; }
    if (!window.isSecureContext) { setState('insecure'); return; }
    if (Notification.permission === 'denied') { setState('denied'); return; }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
      const s = await api.get('/api/push/status');
      setDevices(s.data.devices ?? 0);
    } catch {
      setState('off');
    }
  }, [supported]);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(async () => {
    setError('');
    setState('busy');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return false;
      }

      const keyRes = await api.get('/api/push/key');
      if (!keyRes.data.enabled || !keyRes.data.publicKey) {
        setError('Der Server ist nicht für Benachrichtigungen eingerichtet.');
        setState('off');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(keyRes.data.publicKey),
      });

      await api.post('/api/push/subscribe', sub.toJSON());
      await refresh();
      return true;
    } catch (err: any) {
      setError(err?.message || 'Benachrichtigungen konnten nicht aktiviert werden.');
      setState('off');
      return false;
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/api/push/subscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
    } catch { /* egal – Hauptsache abgemeldet */ }
    await refresh();
  }, [refresh]);

  const sendTest = useCallback(async () => {
    setError('');
    try {
      await api.post('/api/push/test');
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Testmeldung fehlgeschlagen.');
      return false;
    }
  }, []);

  return { state, devices, error, enable, disable, sendTest, refresh, supported };
}
