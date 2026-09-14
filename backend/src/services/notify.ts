import { Server } from 'socket.io';
import pool from '../db';

/**
 * Zentrale Stelle für Echtzeit-Benachrichtigungen.
 *
 * Jeder angemeldete Client betritt zwei Socket.IO-Räume:
 *   - `ring:<id>`  – Ereignisse des eigenen Rings
 *   - `role:<name>`– Ereignisse für Administratoren
 * Zusätzlich gibt es Ereignisse, die alle angehen (freie Mitarbeiter).
 */

let io: Server | null = null;
export const setIo = (server: Server) => { io = server; };
export const getIo = () => io;

/** Alle angemeldeten Clients – z. B. neue/entfallene Freimeldungen. */
export function broadcast(event: string, payload: unknown) {
  io?.emit(event, payload);
}

/** Nur die Clients eines bestimmten Rings. */
export function toRing(ringId: number, event: string, payload: unknown) {
  io?.to(`ring:${ringId}`).emit(event, payload);
}

/**
 * Die zuständigen Administratoren: die Ring-Admins des betroffenen Rings sowie
 * alle Super-Admins.
 */
export function toAdminsOfRing(ringId: number, event: string, payload: unknown) {
  io?.to(`ringadmin:${ringId}`).emit(event, payload);
  io?.to('role:super_admin').emit(event, payload);
}

export function toSuperAdmins(event: string, payload: unknown) {
  io?.to('role:super_admin').emit(event, payload);
}

/** Schreibt einen Eintrag ins Administrationsprotokoll. */
export async function audit(
  actorId: number | null,
  action: string,
  target?: string,
  detail?: Record<string, unknown>
) {
  try {
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, target, detail) VALUES ($1,$2,$3,$4)',
      [actorId, action, target ?? null, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    console.error('Audit-Log fehlgeschlagen:', err);
  }
}
