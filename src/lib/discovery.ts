import { fetchServerInfo, fetchFederationInstances, type ServerInfo } from './collector';

const SEED_SERVERS = ['misskey.io'];

// 除外するドメイン（Mastodonなど他のActivityPub実装）
const EXCLUDED_DOMAINS = [
	'mastodon.social',
	'mstdn.jp',
	'pawoo.net',
	'fedibird.com'
];

/**
 * 日本語サーバーかどうかを判定
 */
function isJapaneseServer(info: ServerInfo): boolean {
	const text = `${info.name ?? ''} ${info.description ?? ''}`.toLowerCase();

	// 日本語文字が含まれているか
	const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

	// .jp ドメイン
	const isJpDomain = info.host.endsWith('.jp');

	// 日本語キーワード
	const hasJapaneseKeywords = /日本|japan|japanese|にほん|ニホン/.test(text);

	return hasJapanese || isJpDomain || hasJapaneseKeywords;
}

/**
 * 除外ドメインかどうか
 */
function isExcludedDomain(host: string): boolean {
	return EXCLUDED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export interface DiscoveryResult {
	newServers: ServerInfo[];
	federations: Array<{
		sourceHost: string;
		targetHost: string;
		usersCount: number;
		notesCount: number;
		isBlocked: boolean;
		isSuspended: boolean;
	}>;
}

/**
 * 既知のサーバーから新しいサーバーを発見する
 */
export async function discoverServers(
	knownHosts: string[],
	maxNewServers: number = 50
): Promise<DiscoveryResult> {
	const result: DiscoveryResult = {
		newServers: [],
		federations: []
	};

	const hostsToCheck = knownHosts.length > 0 ? knownHosts : SEED_SERVERS;
	const discoveredHosts = new Set<string>();

	for (const host of hostsToCheck) {
		// 連合インスタンス一覧を取得
		const instances = await fetchFederationInstances(host);
		if (!instances) continue;

		for (const instance of instances) {
			// 既知または発見済みならスキップ
			if (knownHosts.includes(instance.host) || discoveredHosts.has(instance.host)) {
				// 連合関係は記録
				result.federations.push({
					sourceHost: host,
					targetHost: instance.host,
					usersCount: instance.usersCount,
					notesCount: instance.notesCount,
					isBlocked: instance.isBlocked,
					isSuspended: instance.isSuspended
				});
				continue;
			}

			// 除外ドメインならスキップ
			if (isExcludedDomain(instance.host)) continue;

			// 上限チェック
			if (discoveredHosts.size >= maxNewServers) continue;

			// サーバー情報を取得
			const info = await fetchServerInfo(instance.host);
			if (!info) continue; // Misskey系以外は null が返る

			// 日本語サーバーかチェック
			if (!isJapaneseServer(info)) continue;

			discoveredHosts.add(instance.host);
			result.newServers.push(info);

			// 連合関係を記録
			result.federations.push({
				sourceHost: host,
				targetHost: instance.host,
				usersCount: instance.usersCount,
				notesCount: instance.notesCount,
				isBlocked: instance.isBlocked,
				isSuspended: instance.isSuspended
			});
		}
	}

	return result;
}

/**
 * シードサーバーを取得
 */
export function getSeedServers(): string[] {
	return SEED_SERVERS;
}
