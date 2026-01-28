import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseSession } from '$lib/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	const sessionCookie = cookies.get('missmap_session');
	const session = parseSession(sessionCookie);

	if (!session) {
		return json({ user: null });
	}

	// トークンは返さない（セキュリティ）
	const { token: _, ...user } = session;

	return json({ user });
};
