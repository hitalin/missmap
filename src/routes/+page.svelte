<script lang="ts">
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
	<title>missmatch - Misskey Server Federation Map</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="page">
	<div class="layout">
		<aside class="sidebar">
			<h1 class="app-title">みすまっち</h1>
			<SettingsPanel bind:settings onApply={handleSeedChange} />
			<FilterPanel bind:filter availableRepositories={availableRepositories()} />
		</aside>

		<main>
			{#if federationError}
				<div class="error-banner">
					{federationError}
				</div>
			{/if}
			{#if isLoading}
				<div class="graph-placeholder loading">
					<div class="spinner"></div>
					<span>{settings.seedServer} から連合情報を取得中...</span>
				</div>
			{:else if filteredServers().length > 0}
				<FederationGraph
					servers={filteredServers()}
					federations={localFederations.length > 0 ? localFederations : (data.federations as FederationInfo[])}
					seedServer={settings.seedServer}
				/>
			{:else}
				<div class="graph-placeholder">
					<span>サーバーがありません</span>
				</div>
			{/if}
		</main>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		min-height: 100vh;
		font-family: 'Noto Sans JP', system-ui, sans-serif;
		color: #fff;
	}

	.page {
		min-height: 100vh;
	}

	.app-title {
		font-size: 1.3rem;
		margin: 0 0 1rem;
		font-weight: 700;
		background: linear-gradient(135deg, #86b300, #b4e900);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-align: center;
	}

	.layout {
		display: flex;
		gap: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.sidebar {
		width: 260px;
		flex-shrink: 0;
	}

	.sidebar :global(.filter-panel),
	.sidebar :global(.settings-panel) {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.sidebar :global(h3),
	.sidebar :global(h4) {
		color: rgba(255, 255, 255, 0.9);
	}

	.sidebar :global(label) {
		color: rgba(255, 255, 255, 0.8);
	}

	.sidebar :global(.description) {
		color: rgba(255, 255, 255, 0.5);
	}

	.error-banner {
		background: rgba(255, 100, 100, 0.2);
		border: 1px solid rgba(255, 100, 100, 0.4);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		color: #ffaaaa;
		font-size: 0.9rem;
	}

	main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.graph-placeholder {
		flex: 1;
		min-height: 600px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.graph-placeholder.loading {
		background: rgba(134, 179, 0, 0.05);
		border-color: rgba(134, 179, 0, 0.2);
		color: rgba(255, 255, 255, 0.6);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(134, 179, 0, 0.3);
		border-top-color: #86b300;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.layout {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
		}

		.app-title {
			font-size: 1.1rem;
		}
	}
</style>
