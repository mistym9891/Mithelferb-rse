import cron from 'node-cron';
import pool from '../db';

export const startCleanupCron = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running availability cleanup...');
    try {
      // "Heute" immer in deutscher Ortszeit bestimmen – der DB-Container läuft in UTC.
      const result = await pool.query(
        `DELETE FROM availabilities WHERE end_date < (now() AT TIME ZONE 'Europe/Berlin')::date`
      );
      console.log(`Deleted ${result.rowCount} expired availabilities`);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });
};
