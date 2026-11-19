import fs from 'node:fs';
import path from 'node:path';
import type { MurdokuCase } from '../../src/engine/types';

export interface DailyStore {
  getCase(date: string): Promise<MurdokuCase | null>;
  saveCase(date: string, murdokuCase: MurdokuCase): Promise<void>;
  listArchive(): Promise<MurdokuCase[]>;
  acquireLock(date: string, ttlSeconds?: number): Promise<boolean>;
  releaseLock(date: string): Promise<void>;
}

/**
 * Primary backend: Upstash Redis / Vercel KV REST API (zero extra npm dependencies, works on Vercel Edge & Node).
 */
class UpstashRedisStore implements DailyStore {
  constructor(
    private readonly restUrl: string,
    private readonly restToken: string
  ) {}

  private async cmd<T = unknown>(args: (string | number)[]): Promise<T> {
    const res = await fetch(this.restUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.restToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis error: ${res.status}`);
    }
    const data = (await res.json()) as { result: T; error?: string };
    if (data.error) throw new Error(data.error);
    return data.result;
  }

  async getCase(date: string): Promise<MurdokuCase | null> {
    const raw = await this.cmd<string | null>(['GET', `murdoku:daily:${date}`]);
    if (!raw) return null;
    return JSON.parse(raw) as MurdokuCase;
  }

  async saveCase(date: string, murdokuCase: MurdokuCase): Promise<void> {
    await this.cmd(['SET', `murdoku:daily:${date}`, JSON.stringify(murdokuCase)]);
    // Track date in sorted set by numeric YYYYMMDD score for clean chronological ordering
    const score = Number(date.replace(/-/g, ''));
    await this.cmd(['ZADD', 'murdoku:archive:dates', score, date]);
  }

  async listArchive(): Promise<MurdokuCase[]> {
    const dates = await this.cmd<string[]>(['ZREVRANGE', 'murdoku:archive:dates', 0, 90]);
    if (!dates || dates.length === 0) return [];
    const keys = dates.map((d) => `murdoku:daily:${d}`);
    const values = await this.cmd<(string | null)[]>(['MGET', ...keys]);
    const out: MurdokuCase[] = [];
    for (const v of values ?? []) {
      if (v) out.push(JSON.parse(v) as MurdokuCase);
    }
    return out;
  }

  async acquireLock(date: string, ttlSeconds = 60): Promise<boolean> {
    const res = await this.cmd<string | null>([
      'SET',
      `murdoku:lock:${date}`,
      String(Date.now()),
      'NX',
      'EX',
      ttlSeconds,
    ]);
    return res === 'OK';
  }

  async releaseLock(date: string): Promise<void> {
    await this.cmd(['DEL', `murdoku:lock:${date}`]);
  }
}

/**
 * Fallback 1: Server-side JSONBin (never exposed to browser!)
 */
class ServerJsonBinStore implements DailyStore {
  private readonly locks = new Map<string, number>();

  constructor(
    private readonly binId: string,
    private readonly apiKey: string
  ) {}

  private async readAll(): Promise<Record<string, MurdokuCase>> {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${this.binId}/latest`, {
      headers: { 'X-Master-Key': this.apiKey },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { record?: { cases?: Record<string, MurdokuCase> } };
    return json.record?.cases ?? {};
  }

  private async writeAll(cases: Record<string, MurdokuCase>): Promise<void> {
    await fetch(`https://api.jsonbin.io/v3/b/${this.binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey,
      },
      body: JSON.stringify({ cases }),
    });
  }

  async getCase(date: string): Promise<MurdokuCase | null> {
    const all = await this.readAll();
    return all[date] ?? null;
  }

  async saveCase(date: string, murdokuCase: MurdokuCase): Promise<void> {
    const all = await this.readAll();
    all[date] = murdokuCase;
    await this.writeAll(all);
  }

  async listArchive(): Promise<MurdokuCase[]> {
    const all = await this.readAll();
    return Object.values(all).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }

  async acquireLock(date: string, ttlSeconds = 60): Promise<boolean> {
    const now = Date.now();
    const exp = this.locks.get(date);
    if (exp && exp > now) return false;
    this.locks.set(date, now + ttlSeconds * 1000);
    return true;
  }

  async releaseLock(date: string): Promise<void> {
    this.locks.delete(date);
  }
}

/**
 * Fallback 2: Local JSON file store (for local development or ephemeral preview without KV).
 */
class LocalFileStore implements DailyStore {
  private readonly locks = new Map<string, number>();
  private readonly filePath: string;

  constructor(filePath?: string) {
    const dir = process.env.VERCEL ? '/tmp/murdoku-data' : path.resolve(process.cwd(), '.data');
    this.filePath = filePath ?? path.join(dir, 'daily-archive.json');
  }

  private readAll(): Record<string, MurdokuCase> {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, MurdokuCase>;
    } catch {
      return {};
    }
  }

  private writeAll(cases: Record<string, MurdokuCase>): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(cases, null, 2), 'utf8');
    } catch {
      // ignore read-only FS errors in edge cases
    }
  }

  async getCase(date: string): Promise<MurdokuCase | null> {
    return this.readAll()[date] ?? null;
  }

  async saveCase(date: string, murdokuCase: MurdokuCase): Promise<void> {
    const all = this.readAll();
    all[date] = murdokuCase;
    this.writeAll(all);
  }

  async listArchive(): Promise<MurdokuCase[]> {
    return Object.values(this.readAll()).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }

  async acquireLock(date: string, ttlSeconds = 60): Promise<boolean> {
    const now = Date.now();
    const exp = this.locks.get(date);
    if (exp && exp > now) return false;
    this.locks.set(date, now + ttlSeconds * 1000);
    return true;
  }

  async releaseLock(date: string): Promise<void> {
    this.locks.delete(date);
  }
}

export function createDailyStore(): DailyStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisUrl && redisToken) {
    return new UpstashRedisStore(redisUrl, redisToken);
  }

  const binId = process.env.JSONBIN_BIN_ID;
  const binKey = process.env.JSONBIN_API_KEY;
  if (binId && binKey) {
    return new ServerJsonBinStore(binId, binKey);
  }

  return new LocalFileStore();
}
