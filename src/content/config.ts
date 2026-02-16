import { defineCollection, z } from 'astro:content';

/**
 * 專案作品集 (對應 src/content/projects/*)
 * 每個專案可以是一個 .md 檔案，或是一個包含 index.md 的資料夾。
 */
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    location: z.string().optional().nullable(),
    content: z.string(), // 用於列表顯示的簡短內文
    date: z.string(), 
    category: z.string(),
    tags: z.array(z.string()),
    image: z.string().optional().nullable(),
  }),
});

// 匯出集合：我們現在移除了 'about'，讓架構保持最簡潔
export const collections = {
  'projects': projectsCollection,
};