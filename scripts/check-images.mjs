// 檢查每篇文章引用的照片是否存在，且檔名「大小寫完全相同」。
// Windows 不分大小寫、Vercel (Linux) 會分，所以在本機 build 前先抓出來。
// 會在 `npm run build` 之前自動執行（package.json 的 prebuild）。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const CONTENT = 'src/content/projects';
const errors = [];

for (const dir of readdirSync(CONTENT, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const mdPath = join(CONTENT, dir.name, 'index.md');
  if (!existsSync(mdPath)) continue;
  const md = readFileSync(mdPath, 'utf8');

  const refs = [
    ...[...md.matchAll(/!\[[^\]]*\]\((\.\/[^)\s]+)\)/g)].map((m) => m[1]),
    ...[...md.matchAll(/^image:\s*["']?(\.\/[^"'\r\n]+)["']?\s*$/gm)].map((m) => m[1]),
  ];

  for (const ref of refs) {
    const full = join(CONTENT, dir.name, decodeURI(ref));
    const folder = dirname(full);
    const name = basename(full);
    const actual = existsSync(folder) ? readdirSync(folder) : [];
    if (!actual.includes(name)) {
      const caseHit = actual.find((f) => f.toLowerCase() === name.toLowerCase());
      errors.push(
        caseHit
          ? `${mdPath}: "${ref}" 大小寫不符，實際檔名是 "${caseHit}"`
          : `${mdPath}: 找不到照片 "${ref}"`,
      );
    }
  }

  if (/<img[^>]+src=["']\/projects\//.test(md) || /^image:\s*["']?\/projects\//m.test(md)) {
    errors.push(`${mdPath}: 仍在使用舊的 /projects/... 路徑，請改成 ./檔名`);
  }
}

if (errors.length) {
  console.error('\n❌ 照片檢查失敗：\n' + errors.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log('✅ 照片檢查通過');
