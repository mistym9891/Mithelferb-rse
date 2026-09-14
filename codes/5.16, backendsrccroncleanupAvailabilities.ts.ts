import cron from 'node-cron';
import pool from '../db';

export const startCleanupCron = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running availability cleanup...');
    try {
      const result = await pool.query(
        'DELETE FROM availabilities WHERE end_date < CURRENT_DATE'
      );
      console.log(`Deleted ${result.rowCount} expired availabilities`);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });
};