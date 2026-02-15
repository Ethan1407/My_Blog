/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'about-bg': '#424242',
        'about-card': '#5a5a5a',
      }
    },
  },
  plugins: [],
};