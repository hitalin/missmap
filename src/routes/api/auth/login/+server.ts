import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { MiAuthSession } from '$lib/types';
import { getAppSecret, setAppSecret, deleteAppSecret } from '$lib/auth';

const APP_NAME = 'missmap';
const APP_DESCRIPTION = 'Fediverse連合マップ - あなたの宇宙を探索しよう';
const PERMISSIONS = ['read:account', 'read:federation'];

// インスタンスがMisskey系かどうかを確認
async function isMisskeyInstance(host: string): Promise<boolean> {
	try {
		const res = await fetch(`https://${host}/api/meta`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});
		if (!res.ok) return false;
		const data = await res.json();
		// Misskey系ならversionが存在する
		return !!data.version;
	} catch {
		return false;
	}
}

export const POST: RequestHandler = async ({ request, url }) => {
	let data: { host: string };

	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const host = data.host?.toLowerCase().trim();

	if (!host) {
		return json({ error: 'Host is required' }, { status: 400 });
	}

	try {
		// Misskey系インスタンスかチェック
		const isMisskey = await isMisskeyInstance(host);
		if (!isMisskey) {
			return json(
				{ error: 'このサーバーはMisskey系ではないようです' },
				{ status: 400 }
			);
		}

		// コールバックURL
		const callbackUrl = `${url.origin}/auth/callback`;

		// キャッシュからアプリシークレットを取得、なければ新規作成
		let appSecret = getAppSecret(host);

		if (!appSecret) {
			// アプリを新規登録
			const appRes = await fetch(`https://${host}/api/app/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: APP_NAME,
					description: APP_DESCRIPTION,
					permission: PERMISSIONS,
					callbackUrl
				})
			});

			if (!appRes.ok) {
				const errorText = await appRes.text();
				console.error('Failed to create app:', errorText);
				return json(
					{ error: 'アプリの登録に失敗しました' },
					{ status: 500 }
				);
			}

			const appData = await appRes.json();
			appSecret = appData.secret;
			setAppSecret(host, appSecret!);
		}

		// 認証セッションを生成
		const sessionRes = await fetch(`https://${host}/api/auth/session/generate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ appSecret })
		});

		if (!sessionRes.ok) {
			// アプリシークレットが無効な場合はキャッシュをクリアしてリトライを促す
			const errorData = await sessionRes.json().catch(() => ({}));
			if (errorData?.error?.code === 'NO_SUCH_APP') {
				deleteAppSecret(host);
				return json(
					{ error: 'アプリ登録が期限切れです。もう一度お試しください。' },
					{ status: 500 }
				);
			}
			return json(
				{ error: '認証セッションの作成に失敗しました' },
				{ status: 500 }
			);
		}

		const session: MiAuthSession = await sessionRes.json();

		return json({
			token: session.token,
			url: session.url,
			host
		});
	} catch (error) {
		console.error('Login error:', error);
		return json(
			{ error: 'ログイン処理中にエラーが発生しました' },
			{ status: 500 }
		);
	}
};
