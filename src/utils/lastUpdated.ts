// src/utils/lastUpdated.ts
// 取得網站「最後更新時間」= 目前部署版本的最新 commit 時間。
// 1. 優先讀取建置環境中的 git 紀錄：Vercel 建置時會 clone 你 push 上去的 commit，
//    所以這就是最後一次 commit 並 push 到 GitHub 的時間（不需打 API，private repo 也能用）。
// 2. 讀不到 git 時，改用 GitHub API（private repo 需設定 GITHUB_TOKEN 環境變數）。
// 3. 都失敗才使用呼叫端給的預設日期。
// 結果會快取，整次 build 只取一次。
import { execSync } from 'node:child_process';

let cached: Promise<string | null> | undefined;

function formatDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  // 固定台灣時區，避免在 UTC 的建置環境（如 Vercel）差一天
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei',
  }).replace(/\//g, '.');
}

function readGitCommitDate(): string | null {
  try {
    const iso = execSync('git log -1 --format=%cI', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return iso ? formatDate(new Date(iso)) : null;
  } catch {
    return null;
  }
}

async function fetchGitHubCommitDate(): Promise<string | null> {
  try {
    const owner = process.env.VERCEL_GIT_REPO_OWNER ?? 'Ethan1407';
    const repo = process.env.VERCEL_GIT_REPO_SLUG ?? 'My_Blog';
    const ref = process.env.VERCEL_GIT_COMMIT_SHA ?? 'main';
    const headers: Record<string, string> = { 'User-Agent': 'Astro-App' };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${ref}`, { headers });
    if (!response.ok) return null;
    const commit = await response.json();
    return formatDate(new Date(commit.commit.committer.date));
  } catch (e) {
    console.error('GitHub API Error:', e);
    return null;
  }
}

async function getLatestCommitDate(): Promise<string | null> {
  return readGitCommitDate() ?? (await fetchGitHubCommitDate());
}

export async function getLastUpdated(fallback: string): Promise<string> {
  cached ??= getLatestCommitDate();
  return (await cached) ?? fallback;
}
