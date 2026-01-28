import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAppSecret } from '$lib/auth';
import { dev } from '$app/environment';

// Web Crypto APIを使用してSHA-256ハッシュを生成
async function sha256(message: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface MisskeyUser {
	id: string;
	username: string;
	name?: string;
	avatarUrl?: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	let data: { token: string; host: string };

	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { token, host } = data;

	if (!token || !host) {
		return json({ error: 'Token and host are required' }, { status: 400 });
	}

	try {
		// 共有モジュールからappSecretを取得
		const appSecret = getAppSecret(host);

		if (!appSecret) {
			return json(
				{ error: 'セッションが見つかりません。もう一度ログインしてください。' },
				{ status: 401 }
			);
		}

		// ユーザーキーを取得
		const userKeyRes = await fetch(`https://${host}/api/auth/session/userkey`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ appSecret, token })
		});

		if (!userKeyRes.ok) {
			const errorText = await userKeyRes.text();
			console.error('Failed to get userkey:', errorText);
			return json({ error: '認証に失敗しました' }, { status: 401 });
		}

		const { accessToken, user: misskeyUser }: { accessToken: string; user: MisskeyUser } =
			await userKeyRes.json();

		// アクセストークンのハッシュを生成（Misskey方式）
		const hashedToken = await sha256(accessToken + appSecret);

		// ユーザー情報
		const user = {
			host,
			username: misskeyUser.username,
			displayName: misskeyUser.name || misskeyUser.username,
			avatarUrl: misskeyUser.avatarUrl
		};

		// セッションCookieを設定（7日間有効）
		const sessionData = JSON.stringify({
			...user,
			token: hashedToken
		});

		cookies.set('missmap_session', sessionData, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 7日間
		});

		return json({
			success: true,
			user
		});
	} catch (error) {
		console.error('Callback error:', error);
		return json({ error: '認証処理中にエラーが発生しました' }, { status: 500 });
	}
};
