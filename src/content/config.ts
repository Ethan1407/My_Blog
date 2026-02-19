import { defineCollection, z } from 'astro:content';

/**
 * 專案作品集 (對應 src/content/projects/*)
 * 使用 schema 回呼函數來取得 image 輔助工具
 */
const projectsCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    location: z.string().optional().nullable(),
    summary: z.string(), 
    date: z.string(), 
    category: z.string(),
    tags: z.array(z.string()),
    // 關鍵修正：使用 image() 而不是 z.string()
    // 這會讓 Astro 在編譯時去抓取相對路徑的圖檔並進行優化
    image: image().optional(), 
  }),
});

export const collections = {
  'projects': projectsCollection,
};