import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchServerInfo } from '$lib/collector';
import { discoverServers } from '$lib/discovery';

export const POST: RequestHandler = async ({ request, platform }) => {
	const body = await request.json() as { seedServer?: string };
	const { seedServer } = body;

	if (!seedServer || typeof seedServer !== 'string') {
		return json({ error: 'seedServer is required' }, { status: 400 });
	}

	// サーバーが有効かチェック
	const serverInfo = await fetchServerInfo(seedServer);
	if (!serverInfo) {
		return json({ error: 'Invalid or unsupported server' }, { status: 400 });
	}

	// 芋づる式発見
	const discovery = await discoverServers([seedServer], 50);

	// プラットフォーム環境がある場合はDBに保存
	if (platform?.env) {
		const { DB } = platform.env;

		// 種サーバーを保存
		await saveServer(DB, serverInfo);

		// 発見したサーバーを保存
		for (const server of discovery.newServers) {
			await saveServer(DB, server);
		}

		// 連合関係を保存
		for (const fed of discovery.federations) {
			await DB.prepare(
				`INSERT OR REPLACE INTO federations (
					source_host, target_host, users_count, notes_count,
					is_blocked, is_suspended, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
			)
				.bind(
					fed.sourceHost,
					fed.targetHost,
					fed.usersCount,
					fed.notesCount,
					fed.isBlocked ? 1 : 0,
					fed.isSuspended ? 1 : 0
				)
				.run();
		}
	}

	return json({
		seedServer: serverInfo,
		discovered: discovery.newServers.length,
		servers: [serverInfo, ...discovery.newServers],
		federations: discovery.federations
	});
};

async function saveServer(DB: App.Platform['env']['DB'], info: {
	host: string;
	name: string | null;
	description: string | null;
	usersCount: number | null;
	notesCount: number | null;
	softwareName: string | null;
	softwareVersion: string | null;
	registrationOpen: boolean;
	emailRequired: boolean;
	approvalRequired: boolean;
	inviteOnly: boolean;
	ageRestriction: string;
}) {
	await DB.prepare(
		`INSERT OR REPLACE INTO servers (
			host, name, description, users_count, notes_count,
			software_name, software_version,
			registration_open, email_required, approval_required, invite_only,
			age_restriction, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
	)
		.bind(
			info.host,
			info.name,
			info.description,
			info.usersCount,
			info.notesCount,
			info.softwareName,
			info.softwareVersion,
			info.registrationOpen ? 1 : 0,
			info.emailRequired ? 1 : 0,
			info.approvalRequired ? 1 : 0,
			info.inviteOnly ? 1 : 0,
			info.ageRestriction
		)
		.run();
}
