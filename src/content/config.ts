import { defineCollection, z } from 'astro:content';

// 專案作品集 (對應 src/content/projects/*.md)
const projectsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    location: z.string().optional().nullable(),
    content: z.string(), // 對應專案內文簡述
    date: z.string(), 
    category: z.string(),
    tags: z.array(z.string()),
    image: z.string().optional().nullable(),
  }),
});

// 關於/經驗 (對應 src/content/about/*.md)
const aboutCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    location: z.string().optional().nullable(),
    summary: z.string(), // 關於頁面使用的簡述
    category: z.string(),
    tags: z.array(z.string()),
  }),
});

// 匯出所有的集合
export const collections = {
  'projects': projectsCollection,
  'about': aboutCollection,
};