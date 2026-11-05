import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
/**
 * 專案作品集 (對應 src/content/projects/<資料夾>/index.md)
 * id 沿用舊版 slug 規則（資料夾名稱轉小寫、空白換成 -），確保既有網址不變。
 */
const projectsCollection = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.split('/')[0].toLowerCase().replace(/\s+/g, '-'),
  }),
  // image：與 index.md 同資料夾的照片（"./xxx.jpg"）或完整網址；空字串視為沒有封面
  schema: ({ image }) => z.object({
    title: z.string(),
    location: z.string().optional().nullable(),
    summary: z.string(),
    date: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    image: z.preprocess(
      (v) => (v === '' ? null : v),
      z.union([z.string().url(), image()]).optional().nullable(),
    ),
  }),
});
export const collections = {
  'projects': projectsCollection,
};
