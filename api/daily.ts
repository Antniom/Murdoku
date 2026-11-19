import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDailyStore } from './_lib/store';
import { getOrCreateDailyCase, getTodayUtcDateString, isValidDateString } from './_lib/dailyService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const today = getTodayUtcDateString();
  const requested = typeof req.query.date === 'string' && isValidDateString(req.query.date)
    ? req.query.date
    : today;

  // Never allow generating future dates
  if (requested > today) {
    return res.status(400).json({ error: 'Cannot request future daily cases' });
  }

  try {
    const store = createDailyStore();
    if (requested < today) {
      const archived = await store.getCase(requested);
      if (!archived) {
        return res.status(404).json({ error: 'No archived daily case for that date' });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json({ case: archived, today });
    }

    const dailyCase = await getOrCreateDailyCase(today, { store });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ case: dailyCase, today });
  } catch (err) {
    console.error('GET /api/daily error:', err);
    return res.status(500).json({ error: 'Failed to load daily case' });
  }
}
