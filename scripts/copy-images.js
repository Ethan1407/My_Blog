import fs from 'fs/promises';
import path from 'path';

const EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
const workspaceRoot = process.cwd();
const srcDir = path.join(workspaceRoot, 'src', 'content');
const destDir = path.join(workspaceRoot, 'public', 'images');
const destDir2 = path.join(workspaceRoot, 'public');

async function copyRec(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await copyRec(srcPath);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!EXTS.has(ext)) continue;
    const rel = path.relative(srcDir, srcPath);
    const outPath = path.join(destDir, rel);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.copyFile(srcPath, outPath);
    console.log('Copied', path.relative(workspaceRoot, outPath));

    const outPath2 = path.join(destDir2, rel);
    await fs.mkdir(path.dirname(outPath2), { recursive: true });
    await fs.copyFile(srcPath, outPath2);
    console.log('Copied', path.relative(workspaceRoot, outPath2));
  }
}

async function main() {
  try {
    await copyRec(srcDir);
    console.log('All images copied to', destDir);
  } catch (err) {
    console.error('Error copying images:', err);
    process.exitCode = 2;
  }
}

main();
