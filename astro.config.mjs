// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://vota.concriterio.blog',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  devToolbar: { enabled: false },
});
