import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDailyStore } from './_lib/store';
import { getOrCreateDailyCase, getTodayUtcDateString } from './_lib/dailyService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const store = createDailyStore();
    const today = getTodayUtcDateString();

    // Ensure today's case is present in the Daily Volume archive
    await getOrCreateDailyCase(today, { store });
    const cases = await store.listArchive();

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ today, cases });
  } catch (err) {
    console.error('GET /api/archive error:', err);
    return res.status(500).json({ error: 'Failed to load daily archive' });
  }
}
