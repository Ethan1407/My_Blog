import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// 本機開發（npm run dev）時，讓 /api/views 也能運作。
// 線上是由 Vercel 執行 api/views.js；本機則由這個整合讀取 .env 的 Redis 連線資訊後呼叫同一支程式。
// 本機只讀取數字、不會累加，避免開發時的瀏覽灌水到正式的訪客數。
function localViewsApi() {
  return {
    name: 'local-views-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        Object.assign(process.env, loadEnv('development', process.cwd(), ''));
        server.middlewares.use('/api/views', async (_req, res) => {
          const { GET } = await import('./api/views.js');
          const response = await GET();
          res.statusCode = response.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(await response.text());
        });
      },
    },
  };
}

export default defineConfig({
  integrations: [localViewsApi()],
  // 舊的中文網址導向新的英文網址，避免既有連結失效
  redirects: {
    '/hobbies/單車': '/hobbies/cycling',
    '/hobbies/慢跑': '/hobbies/running',
    '/hobbies/保齡球': '/hobbies/bowling',
    '/hobbies/撞球': '/hobbies/billiard',
    '/hobbies/手作': '/hobbies/diy',
  },
});
