// api/views.js — Vercel Function：網站總訪客數（永久累計，每個 IP 只算一次）
// 數字存在 Upstash Redis（Vercel → Storage → Upstash Redis 連結到專案後，會自動加入下列環境變數）
//   POST /api/views → 若此 IP 從未被計算過，訪客數 +1，回傳 { visitors }
//   GET  /api/views → 只讀取，不累加
//
// 隱私：Redis 裡不存原始 IP，只存「HMAC-SHA256(IP)」雜湊值；
// 金鑰是伺服器端的密鑰，外人即使拿到資料庫也無法反推出 IP。

import { createHmac } from 'node:crypto';

// Vercel 連結資料庫時可能會加上自訂前綴（例如 STORAGE_KV_REST_API_URL），所以用「結尾」比對
const findEnv = (...suffixes) => {
  for (const suffix of suffixes) {
    const hit = Object.entries(process.env).find(([key, value]) => key.endsWith(suffix) && value);
    if (hit) return hit[1];
  }
};
const REDIS_URL = findEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const REDIS_TOKEN = findEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
// 雜湊 IP 用的密鑰：可另外設定 VIEWS_IP_SECRET，沒設定就沿用 Redis token（同樣只存在伺服器端）
const IP_SECRET = process.env.VIEWS_IP_SECRET || REDIS_TOKEN;
const VISITORS_KEY = 'site:visitors';
const SEEN_IPS_KEY = 'site:visitor-ips'; // Redis Set，存放已計算過的 IP 雜湊
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

/** 取得訪客 IP（Vercel 會自行設定這些標頭，使用者無法偽造） */
function clientIp(request) {
  const h = request.headers;
  return (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || '').trim();
}

const hashIp = (ip) => createHmac('sha256', IP_SECRET).update(ip).digest('hex');

async function handle(request, increment) {
  if (!REDIS_URL || !REDIS_TOKEN) return reply({ error: 'not configured' }, 503);
  try {
    const ip = increment ? clientIp(request) : '';
    // SADD 回傳 1 代表這個 IP 是第一次出現，才累加；回傳 0 代表已經算過
    const isNew = ip ? (await redis(['SADD', SEEN_IPS_KEY, hashIp(ip)])) === 1 : false;
    const visitors = await redis(isNew ? ['INCR', VISITORS_KEY] : ['GET', VISITORS_KEY]);
    return reply({ visitors });
  } catch {
    return reply({ error: 'redis error' }, 502);
  }
}

export function GET(request) {
  return handle(request, false);
}

export function POST(request) {
  // 爬蟲只讀取、不累加
  const isBot = BOT_UA.test(request.headers.get('user-agent') ?? '');
  return handle(request, !isBot);
}
