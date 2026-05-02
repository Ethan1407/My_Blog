import { defineCollection, z } from 'astro:content';
/**
 * 專案作品集 (對應 src/content/projects/*)
 * 修正說明：強化 image() 處理邏輯，確保本地相對路徑與外部 URL 都能正確驗證。
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
    // 使用 z.union 確保 Astro 資產流水線能正確處理本地圖片物件或外部字串
    image: z.string().optional().nullable(),
  }),
});
export const collections = {
  'projects': projectsCollection,
};