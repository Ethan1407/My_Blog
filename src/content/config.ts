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
    
    // --- 終極修正版 ---
    // 使用 z.union 同時支援「本地圖片物件」與「外部 URL 字串」
    image: z.union([
      image(),           // 處理如 "./photo.jpg" 的本地優化
      z.string().url()   // 處理如 "https://..." 的外部連結
    ]).optional().nullable(), 
  }),
});

export const collections = {
  'projects': projectsCollection,
};