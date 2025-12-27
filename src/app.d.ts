/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				CACHE: KVNamespace;
			};
			context: ExecutionContext;
		}
	}
}

export {};
