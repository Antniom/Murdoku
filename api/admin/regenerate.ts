import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDailyStore } from '../_lib/store';
import { getOrCreateDailyCase, getTodayUtcDateString, isValidDateString } from '../_lib/dailyService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || req.headers['x-admin-secret'] !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const targetDate =
    typeof req.query.date === 'string' && isValidDateString(req.query.date)
      ? req.query.date
      : getTodayUtcDateString();

  try {
    const store = createDailyStore();
    const regenerated = await getOrCreateDailyCase(targetDate, { store }, { forceRegenerate: true });
    return res.status(200).json({ ok: true, case: regenerated });
  } catch (err) {
    console.error('Admin regenerate failed:', err);
    return res.status(500).json({ error: 'Regeneration failed' });
  }
}
