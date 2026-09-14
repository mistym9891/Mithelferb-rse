import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionState = 'connecting' | 'online' | 'offline';

/**
 * Socket.IO-Verbindung mit Authentifizierung und automatischem Neuverbinden.
 * Der Verbindungszustand wird mit zurückgegeben, damit die Oberfläche anzeigen
 * kann, ob die Daten gerade live sind.
 */
export const useSocket = (token?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    if (!token) { setState('offline'); return; }

    const instance = io(import.meta.env.VITE_API_URL || '/', {
      auth: { token },
      // Standardreihenfolge (erst polling, dann Upgrade auf WebSocket) ist
      // hinter Proxys am robustesten.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    instance.on('connect', () => setState('online'));
    instance.on('disconnect', () => setState('offline'));
    instance.on('connect_error', () => setState('offline'));
    instance.io.on('reconnect_attempt', () => setState('connecting'));

    setSocket(instance);
    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      setSocket(null);
    };
  }, [token]);

  return { socket, state };
};
