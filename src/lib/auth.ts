// 認証関連のユーティリティ

// アプリシークレットのキャッシュ（メモリ内）
// 注意: サーバー再起動で失われる。本番環境ではRedis等を使用すべき
const appSecretCache = new Map<string, string>();

export function getAppSecret(host: string): string | undefined {
	return appSecretCache.get(host);
}

export function setAppSecret(host: string, secret: string): void {
	appSecretCache.set(host, secret);
}

export function deleteAppSecret(host: string): void {
	appSecretCache.delete(host);
}

// セッションデータの型
export interface SessionData {
	host: string;
	username: string;
	displayName?: string;
	avatarUrl?: string;
	token: string;
}

// Cookieからセッションをパース
export function parseSession(cookieValue: string | undefined): SessionData | null {
	if (!cookieValue) return null;
	try {
		return JSON.parse(cookieValue);
	} catch {
		return null;
	}
}
