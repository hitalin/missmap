import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// セッションCookieを削除
	cookies.delete('missmap_session', { path: '/' });

	return json({ success: true });
};
