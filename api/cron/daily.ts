import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDailyStore } from '../_lib/store';
import { getOrCreateDailyCase, getTodayUtcDateString } from '../_lib/dailyService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const store = createDailyStore();
    const today = getTodayUtcDateString();
    const dailyCase = await getOrCreateDailyCase(today, { store });
    return res.status(200).json({
      ok: true,
      date: today,
      caseId: dailyCase.id,
      title: dailyCase.title.en,
      generatedBy: dailyCase.generatedBy,
    });
  } catch (err) {
    console.error('Cron daily generation failed:', err);
    return res.status(500).json({ error: 'Cron generation failed' });
  }
}
