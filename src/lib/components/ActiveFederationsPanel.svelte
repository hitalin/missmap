<script lang="ts">
	interface FederationInfo {
		sourceHost: string;
		targetHost: string;
		usersCount: number;
		notesCount: number;
	}

	let {
		federations = [],
		viewpointServers = [],
		onFocusServer,
		isMobile = false,
		defaultOpen = true
	}: {
		federations: FederationInfo[];
		viewpointServers: string[];
		onFocusServer: (host: string) => void;
		isMobile?: boolean;
		defaultOpen?: boolean;
	} = $props();

	let isExpanded = $state(defaultOpen);

	// 視点サーバーからの連合先を活動量順に取得（上位5件）
	let activeFederations = $derived(() => {
		// 視点サーバーからの連合のみを対象
		const viewpointFeds = federations.filter(f => viewpointServers.includes(f.sourceHost));

		// targetHostごとに活動量を集計
		const activityMap = new Map<string, { host: string; activity: number }>();

		for (const fed of viewpointFeds) {
			// 視点サーバー自身は除外
			if (viewpointServers.includes(fed.targetHost)) continue;

			const activity = (fed.usersCount || 0) + (fed.notesCount || 0);
			const existing = activityMap.get(fed.targetHost);

			if (existing) {
				existing.activity += activity;
			} else {
				activityMap.set(fed.targetHost, { host: fed.targetHost, activity });
			}
		}

		// 活動量順にソートして上位5件
		return Array.from(activityMap.values())
			.sort((a, b) => b.activity - a.activity)
			.slice(0, 5);
	});

	// 活動量を読みやすい形式に変換
	function formatActivity(activity: number): string {
		if (activity >= 1000000) {
			return `${(activity / 1000000).toFixed(1)}M`;
		}
		if (activity >= 1000) {
			return `${(activity / 1000).toFixed(1)}K`;
		}
		return activity.toString();
	}
</script>

{#if activeFederations().length > 0}
<div class="active-federations-panel">
	<button class="panel-header-toggle" onclick={() => isExpanded = !isExpanded}>
		<svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
		</svg>
		<h4>活発な連合先</h4>
		<svg class="toggle-icon" class:expanded={isExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if isExpanded}
	<ul class="federation-list">
		{#each activeFederations() as { host, activity } (host)}
			<li>
				<button class="federation-item" onclick={() => onFocusServer(host)}>
					<span class="host-name">{host}</span>
					<span class="activity-badge">{formatActivity(activity)}</span>
				</button>
			</li>
		{/each}
	</ul>
	{/if}
</div>
{/if}

<style>
	.active-federations-panel {
		padding: 0.5rem 0.625rem;
	}

	.panel-header-toggle {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
		padding: 0;
		margin-bottom: 0.375rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.panel-header-toggle h4 {
		flex: 1;
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--fg-primary);
	}

	.toggle-icon {
		width: 14px;
		height: 14px;
		color: var(--fg-muted);
		transition: transform var(--transition-fast);
	}

	.toggle-icon.expanded {
		transform: rotate(180deg);
	}

	.panel-icon {
		width: 16px;
		height: 16px;
		color: var(--accent-500);
	}

	h4 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.federation-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.federation-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.375rem 0.5rem;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--fg-secondary);
		text-align: left;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.federation-item:hover {
		background: rgba(134, 179, 0, 0.1);
		border-color: var(--accent-600);
		color: var(--fg-primary);
	}

	.host-name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.activity-badge {
		flex-shrink: 0;
		margin-left: 0.5rem;
		padding: 0.125rem 0.375rem;
		background: rgba(134, 179, 0, 0.15);
		border-radius: 8px;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--accent-400);
	}
</style>
