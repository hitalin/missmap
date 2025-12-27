import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV !== 'production';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// ローカル開発時はplatformProxyを無効化
			platformProxy: dev ? undefined : {
				configPath: 'wrangler.toml',
				persist: { path: '.wrangler/state/v3' }
			}
		})
	}
};

export default config;
