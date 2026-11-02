// src/utils/lastUpdated.ts
// 取得 GitHub 最新 commit 日期。結果會快取，整次 build 只打一次 API，
// 避免超過未驗證請求每小時 60 次的上限而默默退回預設日期。
let cached: Promise<string | null> | undefined;

async function fetchLatestCommitDate(): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/Ethan1407/My_Blog/commits?per_page=1`, {
      headers: { 'User-Agent': 'Astro-App' }
    });
    if (!response.ok) return null;
    const commits = await response.json();
    if (commits.length === 0) return null;
    const date = new Date(commits[0].commit.committer.date);
    // 固定台灣時區，避免在 UTC 的建置環境（如 Vercel）差一天
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Taipei',
    }).replace(/\//g, '.');
  } catch (e) {
    console.error("GitHub API Error:", e);
    return null;
  }
}

export async function getLastUpdated(fallback: string): Promise<string> {
  cached ??= fetchLatestCommitDate();
  return (await cached) ?? fallback;
}
