<script lang="ts">
	import '../app.css';
	import type { PageData } from './$types';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import FederationGraph from '$lib/components/FederationGraph.svelte';
	import {
		DEFAULT_FILTER,
		DEFAULT_SETTINGS,
		type ServerFilter,
		type ServerScale,
		type UserSettings
	} from '$lib/types';
	import { getServerScale, type ServerInfo } from '$lib/collector';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	interface FederationInfo {
		sourceHost: string;
		targetHost: string;
		usersCount: number;
		notesCount: number;
	}

	let filter: ServerFilter = $state({ ...DEFAULT_FILTER });
	let settings: UserSettings = $state({ ...DEFAULT_SETTINGS });
	let isLoading = $state(false);
	let localServers = $state<ServerInfo[]>([]);
	let localFederations = $state<FederationInfo[]>([]);
	let initialized = $state(false);

	// ブラウザ環境で設定を読み込み、初期連合情報を取得（一度だけ）
	$effect(() => {
		if (browser && !initialized) {
			initialized = true;
			const saved = localStorage.getItem('missmatch_settings');
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					settings = parsed;
				} catch {
					// ignore
				}
			}
			// 初期ロード時に種サーバーから連合情報を取得
			fetchSeedFederations(settings.seedServer).then((feds) => {
				localFederations = feds;
			});
		}
	});

	// 設定変更時に保存
	function saveSettings() {
		if (browser) {
			localStorage.setItem('missmatch_settings', JSON.stringify(settings));
		}
	}

	let federationError = $state<string | null>(null);

	// 種サーバーから連合情報を取得（サーバーサイドAPI経由でCORSを回避）
	async function fetchSeedFederations(seedHost: string): Promise<FederationInfo[]> {
		federationError = null;
		try {
			const res = await fetch('/api/federation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seedServer: seedHost })
			});

			if (!res.ok) {
				const errorData = (await res.json().catch(() => ({}))) as { message?: string };
				federationError = errorData.message ?? `${seedHost} から連合情報を取得できませんでした`;
				return [];
			}

			const result = (await res.json()) as { federations: FederationInfo[] };
			return result.federations;
		} catch {
			federationError = `${seedHost} への接続に失敗しました`;
			return [];
		}
	}

	// 種サーバー変更時の処理
	async function handleSeedChange() {
		saveSettings();
		isLoading = true;

		try {
			// 種サーバーから連合情報を直接取得
			const federations = await fetchSeedFederations(settings.seedServer);
			localFederations = federations;

			// サーバー情報も取得（discover APIから）
			const res = await fetch('/api/discover', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ seedServer: settings.seedServer })
			});

			if (res.ok) {
				const result = (await res.json()) as { servers: ServerInfo[] };
				localServers = result.servers;
			}
		} catch (e) {
			console.error('Failed to discover servers:', e);
		} finally {
			isLoading = false;
		}
	}

	// 表示するサーバー一覧
	let displayServers = $derived(() => {
		const servers = localServers.length > 0 ? localServers : (data.servers as ServerInfo[]);
		return servers;
	});

	// 利用可能なリポジトリURLを抽出
	let availableRepositories = $derived(() => {
		const repos = new Set<string>();
		for (const server of displayServers()) {
			if (server.repositoryUrl) {
				repos.add(server.repositoryUrl);
			}
		}
		return Array.from(repos).sort();
	});

	// フィルター適用後のサーバー一覧
	let filteredServers = $derived(() => {
		return displayServers().filter((server: ServerInfo) => {
			// 登録受付中のみ
			if (filter.registrationOpen && !server.registrationOpen) return false;

			// メアド不要
			if (filter.emailNotRequired && server.emailRequired) return false;

			// 承認制
			if (filter.approvalRequired && !server.approvalRequired) return false;

			// 招待制
			if (filter.inviteOnly && !server.inviteOnly) return false;

			// 年齢制限
			if (filter.ageRestriction && server.ageRestriction !== filter.ageRestriction) return false;

			// リポジトリURL
			if (filter.repositoryUrls.length > 0) {
				if (!server.repositoryUrl || !filter.repositoryUrls.includes(server.repositoryUrl)) {
					return false;
				}
			}

			// 規模
			if (filter.scale.length > 0) {
				const scale: ServerScale = getServerScale(server.usersCount);
				if (!filter.scale.includes(scale)) return false;
			}

			return true;
		});
	});
</script>

<svelte:head>
	<title>みすまっち - Misskey サーバー連合マップ</title>
	<meta name="description" content="Misskeyサーバーの連合関係を視覚的に表示するインタラクティブマップ" />
</svelte:head>

<div class="page">
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<div class="logo-section">
				<div class="logo-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3" />
						<circle cx="5" cy="6" r="2" />
						<circle cx="19" cy="6" r="2" />
						<circle cx="5" cy="18" r="2" />
						<circle cx="19" cy="18" r="2" />
						<line x1="9.5" y1="10" x2="6.5" y2="7.5" />
						<line x1="14.5" y1="10" x2="17.5" y2="7.5" />
						<line x1="9.5" y1="14" x2="6.5" y2="16.5" />
						<line x1="14.5" y1="14" x2="17.5" y2="16.5" />
					</svg>
				</div>
				<h1 class="app-title">みすまっち</h1>
			</div>
			<p class="app-subtitle">Misskey サーバー連合マップ</p>
		</div>
	</header>

	<div class="layout">
		<aside class="sidebar">
			<SettingsPanel bind:settings onApply={handleSeedChange} />
			<FilterPanel bind:filter availableRepositories={availableRepositories()} />

			<!-- Stats -->
			<div class="stats-card">
				<div class="stat">
					<span class="stat-value">{filteredServers().length}</span>
					<span class="stat-label">サーバー</span>
				</div>
				<div class="stat">
					<span class="stat-value">{localFederations.length || data.federations.length}</span>
					<span class="stat-label">連合関係</span>
				</div>
			</div>
		</aside>

		<main>
			{#if federationError}
				<div class="error-banner">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="error-icon">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<span>{federationError}</span>
				</div>
			{/if}
			{#if isLoading}
				<div class="graph-placeholder loading">
					<div class="spinner"></div>
					<span class="loading-text">{settings.seedServer} から連合情報を取得中...</span>
				</div>
			{:else if filteredServers().length > 0}
				<div class="graph-container">
					<FederationGraph
						servers={filteredServers()}
						federations={localFederations.length > 0 ? localFederations : (data.federations as FederationInfo[])}
						seedServer={settings.seedServer}
					/>
				</div>
			{:else}
				<div class="graph-placeholder empty">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
						<circle cx="12" cy="12" r="10" />
						<path d="M8 15s1.5-2 4-2 4 2 4 2" />
						<line x1="9" y1="9" x2="9.01" y2="9" />
						<line x1="15" y1="9" x2="15.01" y2="9" />
					</svg>
					<span>条件に一致するサーバーがありません</span>
					<button class="reset-btn" onclick={() => filter = { ...DEFAULT_FILTER }}>
						フィルターをリセット
					</button>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		background: linear-gradient(180deg, var(--bg-primary) 0%, #0d1117 100%);
	}

	/* Header */
	.header {
		background: var(--bg-card);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--border-color);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		max-width: 1600px;
		margin: 0 auto;
		padding: 0.5rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.logo-icon {
		width: 28px;
		height: 28px;
		color: var(--accent-500);
		animation: pulse-glow 3s ease-in-out infinite;
		border-radius: 50%;
	}

	.logo-icon svg {
		width: 100%;
		height: 100%;
	}

	.app-title {
		font-size: 1.25rem;
		margin: 0;
		font-weight: 800;
		background: linear-gradient(135deg, var(--accent-400), var(--accent-600));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}

	.app-subtitle {
		margin: 0;
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 500;
	}

	/* Layout */
	.layout {
		display: flex;
		gap: 1rem;
		max-width: 1600px;
		margin: 0 auto;
		padding: 0.75rem 1rem;
		height: calc(100vh - 52px);
	}

	/* Sidebar */
	.sidebar {
		width: 260px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: auto;
	}

	.sidebar :global(.filter-panel),
	.sidebar :global(.settings-panel) {
		background: var(--bg-card);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		color: var(--fg-primary);
		transition: border-color var(--transition-normal), box-shadow var(--transition-normal);
	}

	.sidebar :global(.filter-panel:hover),
	.sidebar :global(.settings-panel:hover) {
		border-color: var(--border-color-hover);
		box-shadow: var(--shadow-md);
	}

	.sidebar :global(h3),
	.sidebar :global(h4) {
		color: var(--fg-primary);
	}

	.sidebar :global(label) {
		color: var(--fg-secondary);
	}

	.sidebar :global(.description) {
		color: var(--fg-muted);
	}

	/* Stats Card */
	.stats-card {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-card);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
	}

	.stat {
		flex: 1;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--accent-400);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Main */
	main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(248, 113, 113, 0.1);
		border: 1px solid rgba(248, 113, 113, 0.3);
		border-radius: var(--radius-md);
		padding: 0.875rem 1.25rem;
		margin-bottom: 1rem;
		color: #fca5a5;
		font-size: 0.9rem;
		animation: fadeIn 0.3s ease-out;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	/* Graph Container */
	.graph-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-card);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-lg);
		animation: fadeIn 0.4s ease-out;
	}

	.graph-container :global(.graph-wrapper) {
		flex: 1;
		min-height: 0;
	}

	/* Placeholder states */
	.graph-placeholder {
		flex: 1;
		min-height: 0;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: var(--fg-muted);
	}

	.graph-placeholder.loading {
		background: linear-gradient(135deg, rgba(134, 179, 0, 0.05), rgba(134, 179, 0, 0.02));
		border-color: rgba(134, 179, 0, 0.2);
	}

	.graph-placeholder.empty {
		background: var(--bg-card);
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgba(134, 179, 0, 0.2);
		border-top-color: var(--accent-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.loading-text {
		color: var(--fg-secondary);
		font-size: 0.95rem;
	}

	.empty-icon {
		width: 64px;
		height: 64px;
		color: var(--fg-muted);
		opacity: 0.5;
	}

	.reset-btn {
		margin-top: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--accent-600);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.reset-btn:hover {
		background: var(--accent-500);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(134, 179, 0, 0.3);
	}

	@keyframes pulse-glow {
		0%, 100% {
			filter: drop-shadow(0 0 8px rgba(134, 179, 0, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 16px rgba(134, 179, 0, 0.6));
		}
	}

	@media (max-width: 1024px) {
		.header-content {
			padding: 0.5rem 1rem;
		}

		.app-subtitle {
			display: none;
		}

		.layout {
			padding: 0.5rem 0.75rem;
		}

		.sidebar {
			width: 220px;
		}
	}

	@media (max-width: 768px) {
		.layout {
			flex-direction: column;
			height: auto;
		}

		.sidebar {
			width: 100%;
		}

		.stats-card {
			order: -1;
		}

		.app-title {
			font-size: 1.1rem;
		}

		.logo-icon {
			width: 24px;
			height: 24px;
		}
	}
</style>
