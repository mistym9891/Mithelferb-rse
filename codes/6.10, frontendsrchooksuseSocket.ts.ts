import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useSocket = (token?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    if (!token) return;
    const socketInstance = io(import.meta.env.VITE_API_URL || '/', {
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
    };
  }, [token]);
  return socket;
};