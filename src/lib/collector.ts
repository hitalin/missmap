// バニラMisskeyのリポジトリURL
const VANILLA_MISSKEY_REPO = 'https://github.com/misskey-dev/misskey';

/**
 * バニラMisskeyのリポジトリかどうかを判定
 */
export function isVanillaMisskeyRepo(repositoryUrl: string | null): boolean {
	if (!repositoryUrl) return false;
	return repositoryUrl.toLowerCase().includes('github.com/misskey-dev/misskey');
}

/**
 * リポジトリURLから原色ベースの色を生成（HSLでハッシュベース）
 * Fediverseロゴのような鮮やかな原色を動的に割り当て
 * バニラMisskeyは緑色に固定
 */
export function getRepositoryColor(repositoryUrl: string | null): string {
	// バニラMisskeyは緑色に固定
	if (!repositoryUrl || isVanillaMisskeyRepo(repositoryUrl)) {
		return 'hsl(80, 100%, 35%)'; // Misskeyグリーン
	}

	// 文字列のハッシュ値を計算
	let hash = 0;
	for (let i = 0; i < repositoryUrl.length; i++) {
		hash = ((hash << 5) - hash + repositoryUrl.charCodeAt(i)) | 0;
	}

	// 色相を0-360で決定（原色っぽくなるよう分割、緑(80付近)を避ける）
	const hueSteps = [0, 30, 60, 180, 200, 240, 280, 320]; // 赤、オレンジ、黄、シアン、青、紫、マゼンタ、ピンク（緑を除外）
	const hue = hueSteps[Math.abs(hash) % hueSteps.length];

	// 彩度と明度は固定（鮮やかな原色）
	return `hsl(${hue}, 85%, 55%)`;
}

/**
 * HSL文字列からH, S, L値を抽出
 */
export function parseHSL(hslString: string): { h: number; s: number; l: number } {
	const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
	if (match) {
		return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
	}
	return { h: 80, s: 100, l: 35 }; // デフォルト
}

/**
 * 2つの色の中間色を計算
 */
export function blendColors(color1: string, color2: string): string {
	const hsl1 = parseHSL(color1);
	const hsl2 = parseHSL(color2);

	// 色相の中間を計算（円周上で最短距離を取る）
	let hDiff = hsl2.h - hsl1.h;
	if (hDiff > 180) hDiff -= 360;
	if (hDiff < -180) hDiff += 360;
	let h = hsl1.h + hDiff / 2;
	if (h < 0) h += 360;
	if (h >= 360) h -= 360;

	const s = Math.round((hsl1.s + hsl2.s) / 2);
	const l = Math.round((hsl1.l + hsl2.l) / 2);

	return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

/**
 * リポジトリURLから表示名を抽出（例: "github.com/misskey-dev/misskey" → "misskey-dev/misskey"）
 */
export function getRepositoryDisplayName(repositoryUrl: string | null): string {
	if (!repositoryUrl) return 'unknown';
	// GitHubのURLからオーナー/リポジトリ名を抽出
	const match = repositoryUrl.match(/github\.com\/([^/]+\/[^/]+)/i);
	if (match) return match[1];
	// それ以外はURLそのまま
	return repositoryUrl.replace(/^https?:\/\//, '');
}

export interface ServerInfo {
	host: string;
	name: string | null;
	description: string | null;
	usersCount: number | null;
	notesCount: number | null;
	iconUrl: string | null;

	// ソフトウェア
	softwareName: string | null;
	softwareVersion: string | null;
	repositoryUrl: string | null; // GitHubリポジトリURL

	// 登録要件
	registrationOpen: boolean;
	emailRequired: boolean;
	approvalRequired: boolean;
	inviteOnly: boolean;

	// 年齢制限
	ageRestriction: 'all' | '13+' | '18+' | 'unknown';
}

export interface FederationInstance {
	host: string;
	isBlocked: boolean;
	isSuspended: boolean;
	usersCount: number;
	notesCount: number;
}

// 対象：Misskey純正およびMisskeyを名乗るフォークのみ
const SUPPORTED_SOFTWARE = ['misskey'];

// バニラMisskeyのバージョンパターン（例: 2024.11.0, 2025.1.0）
const VANILLA_VERSION_PATTERN = /^\d{4}\.\d{1,2}\.\d+$/;

/**
 * バニラMisskeyかどうかを判定
 * - バージョン形式が公式パターン（YYYY.MM.patch）
 * - カスタム文字列が含まれていない
 */
function isVanillaMisskey(version: string): boolean {
	// 公式のバージョン形式かチェック
	if (!VANILLA_VERSION_PATTERN.test(version)) {
		return false;
	}
	// フォーク特有の文字列が含まれていないか
	const forkIndicators = ['-', '+', 'custom', 'fork', 'mod'];
	return !forkIndicators.some((indicator) => version.toLowerCase().includes(indicator));
}

/**
 * NodeInfo を取得してソフトウェア情報を得る
 */
async function fetchNodeInfo(host: string): Promise<{ name: string; version: string } | null> {
	try {
		// まず well-known から NodeInfo URL を取得
		const wellKnownRes = await fetch(`https://${host}/.well-known/nodeinfo`, {
			headers: { Accept: 'application/json' }
		});
		if (!wellKnownRes.ok) return null;

		const wellKnown = (await wellKnownRes.json()) as {
			links?: Array<{ rel: string; href: string }>;
		};
		const nodeInfoUrl = wellKnown.links?.find((l) =>
			l.rel.includes('nodeinfo')
		)?.href;

		if (!nodeInfoUrl) return null;

		// NodeInfo を取得
		const nodeInfoRes = await fetch(nodeInfoUrl, {
			headers: { Accept: 'application/json' }
		});
		if (!nodeInfoRes.ok) return null;

		const nodeInfo = (await nodeInfoRes.json()) as {
			software?: { name?: string; version?: string };
		};
		const software = nodeInfo.software;

		if (!software?.name) return null;

		return {
			name: software.name.toLowerCase(),
			version: software.version ?? ''
		};
	} catch {
		return null;
	}
}

/**
 * サーバーのメタ情報を取得
 */
export async function fetchServerInfo(host: string): Promise<ServerInfo | null> {
	try {
		// NodeInfo でソフトウェアを確認
		const nodeInfo = await fetchNodeInfo(host);
		if (!nodeInfo || !SUPPORTED_SOFTWARE.includes(nodeInfo.name)) {
			return null; // Misskey系以外は無視
		}

		// Misskey API でメタ情報を取得
		const res = await fetch(`https://${host}/api/meta`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({})
		});

		if (!res.ok) return null;

		const data = (await res.json()) as Record<string, unknown>;

		// 年齢制限の判定
		let ageRestriction: 'all' | '13+' | '18+' | 'unknown' = 'unknown';

		// policies.ltlAvailability など様々な場所に年齢情報がある可能性
		const policies = data.policies as Record<string, unknown> | undefined;

		// 名前や説明からの推測
		const nameAndDesc = `${data.name ?? ''} ${data.description ?? ''}`.toLowerCase();
		if (/18\+|nsfw|r-?18|adult|成人|アダルト/.test(nameAndDesc)) {
			ageRestriction = '18+';
		} else if (/13歳|13才|13\+|中学生以上/.test(nameAndDesc)) {
			ageRestriction = '13+';
		} else if (policies && 'requireSetup' in policies) {
			// 何らかの登録制限があれば13+と推測（多くのサーバーは13歳以上）
			ageRestriction = '13+';
		}

		// emailRequiredForSignupがtrueのサーバーは多くが13歳以上制限
		if (ageRestriction === 'unknown' && (data.emailRequiredForSignup as boolean) === true) {
			ageRestriction = '13+';
		}

		// アイコンURLを取得
		let iconUrl = (data.iconUrl as string) ?? null;
		if (iconUrl && !iconUrl.startsWith('http')) {
			iconUrl = `https://${host}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
		}

		return {
			host,
			name: (data.name as string) ?? null,
			description: (data.description as string) ?? null,
			usersCount: (data.originalUsersCount as number) ?? null,
			notesCount: (data.originalNotesCount as number) ?? null,
			iconUrl,

			softwareName: nodeInfo.name,
			softwareVersion: nodeInfo.version,
			repositoryUrl: (data.repositoryUrl as string) ?? null,

			registrationOpen: (data.disableRegistration as boolean) !== true,
			emailRequired: (data.emailRequiredForSignup as boolean) === true,
			approvalRequired: (data.approvalRequiredForSignup as boolean) === true,
			inviteOnly:
				(data.policies as Record<string, unknown>)?.canInvite === false ||
				(data.enableRecaptcha as boolean) === false, // 簡易判定

			ageRestriction
		};
	} catch {
		return null;
	}
}

/**
 * サーバーの連合インスタンス一覧を取得
 */
export async function fetchFederationInstances(
	host: string
): Promise<FederationInstance[] | null> {
	try {
		const res = await fetch(`https://${host}/api/federation/instances`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				limit: 100,
				sort: '+pubSub'
			})
		});

		if (!res.ok) return null;

		const data = (await res.json()) as Array<Record<string, unknown>>;
		return data.map((instance) => ({
			host: instance.host as string,
			isBlocked: (instance.isBlocked as boolean) ?? false,
			isSuspended: (instance.isSuspended as boolean) ?? false,
			usersCount: (instance.usersCount as number) ?? 0,
			notesCount: (instance.notesCount as number) ?? 0
		}));
	} catch {
		return null;
	}
}

/**
 * サーバーの規模を判定
 * Misskeyセットアップウィザードの区分に準拠:
 * - 小規模: 100人以下
 * - 中規模: 100人以上1000人以下
 * - 大規模: 1000人以上
 */
export function getServerScale(usersCount: number | null): 'large' | 'medium' | 'small' {
	if (usersCount === null) return 'small';
	if (usersCount >= 1000) return 'large';
	if (usersCount > 100) return 'medium';
	return 'small';
}
