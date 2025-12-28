import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface FederationInstance {
	host: string;
	usersCount?: number;
	notesCount?: number;
	isBlocked?: boolean;
	isSuspended?: boolean;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { seedServer?: string };
	const { seedServer } = body;

	if (!seedServer || typeof seedServer !== 'string') {
		return json({ error: 'seedServer is required' }, { status: 400 });
	}

	try {
		// ページネーションで複数回取得（最大300件）
		const allInstances: FederationInstance[] = [];
		let offset = 0;
		const limit = 30; // Misskey APIの最大値
		const maxFetches = 10; // 最大10回 = 300件

		for (let i = 0; i < maxFetches; i++) {
			const res = await fetch(`https://${seedServer}/api/federation/instances`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit, offset, sort: '+pubSub' })
			});

			if (!res.ok) {
				const errorText = await res.text();
				let errorData: { error?: { code?: string } } = {};
				try {
					errorData = JSON.parse(errorText);
				} catch {
					// ignore parse error
				}
				if (errorData?.error?.code === 'CREDENTIAL_REQUIRED') {
					return json(
						{
							error: 'CREDENTIAL_REQUIRED',
							message: `${seedServer} は連合情報を公開していません（認証が必要）`
						},
						{ status: 403 }
					);
				}
				// 最初のリクエストで失敗したらエラーを返す
				if (i === 0) {
					return json(
						{
							error: 'FETCH_FAILED',
							message: `${seedServer} から連合情報を取得できませんでした (${res.status})`
						},
						{ status: res.status }
					);
				}
				break;
			}

			const instances = (await res.json()) as FederationInstance[];
			allInstances.push(...instances);

			// 取得件数がlimit未満なら終了
			if (instances.length < limit) {
				break;
			}
			offset += limit;
		}

		// 正常な連合関係
		const normalFederations = allInstances
			.filter((inst) => !inst.isBlocked && !inst.isSuspended)
			.map((inst) => ({
				sourceHost: seedServer,
				targetHost: inst.host,
				usersCount: inst.usersCount ?? 0,
				notesCount: inst.notesCount ?? 0,
				isBlocked: false,
				isSuspended: false
			}));

		// ブロック関係も取得
		let blockedFederations: Array<{
			sourceHost: string;
			targetHost: string;
			usersCount: number;
			notesCount: number;
			isBlocked: boolean;
			isSuspended: boolean;
		}> = [];

		try {
			const blockedRes = await fetch(`https://${seedServer}/api/federation/instances`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ limit: 30, blocked: true })
			});

			if (blockedRes.ok) {
				const blockedInstances = (await blockedRes.json()) as FederationInstance[];
				blockedFederations = blockedInstances.map((inst) => ({
					sourceHost: seedServer,
					targetHost: inst.host,
					usersCount: inst.usersCount ?? 0,
					notesCount: inst.notesCount ?? 0,
					isBlocked: inst.isBlocked ?? true,
					isSuspended: inst.isSuspended ?? false
				}));
			}
		} catch {
			// ブロック情報取得に失敗しても続行
		}

		return json({ federations: [...normalFederations, ...blockedFederations] });
	} catch (e) {
		console.error(`Failed to fetch federations from ${seedServer}:`, e);
		return json(
			{
				error: 'CONNECTION_FAILED',
				message: `${seedServer} への接続に失敗しました`
			},
			{ status: 500 }
		);
	}
};
