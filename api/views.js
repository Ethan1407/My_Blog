// api/views.js — Vercel Function：網站總訪客數（永久累計，每個裝置的每個瀏覽器只算一次）
// 數字存在 Upstash Redis（Vercel → Storage → Upstash Redis 連結到專案後，會自動加入下列環境變數）
//   POST /api/views → 訪客數 +1（只有瀏覽器第一次造訪時才會呼叫），回傳 { visitors }
//   GET  /api/views → 只讀取，不累加

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const VISITORS_KEY = 'site:visitors';
const BOT_UA = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

async function redis(command) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return Number((await res.json()).result ?? 0);
}

const reply = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function handle(increment) {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: 'not configured' }, 503);
  try {
    const visitors = await redis(increment ? ['INCR', VISITORS_KEY] : ['GET', VISITORS_KEY]);
    return reply({ visitors });
  } catch {
    return reply({ error: 'redis error' }, 502);
  }
}

export function GET() {
  return handle(false);
}

export function POST(request) {
  // 爬蟲只讀取、不累加
  const isBot = BOT_UA.test(request.headers.get('user-agent') ?? '');
  return handle(!isBot);
}
