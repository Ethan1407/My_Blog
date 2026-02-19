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
    // 終極修正：image() 代表處理圖片物件
    // .optional() 允許「不寫這一行」
    // .nullable() 允許「寫了但填 null」
    image: image().optional().nullable(), 
  }),
});

export const collections = {
  'projects': projectsCollection,
};