<script lang="ts">
	import { onMount } from 'svelte';
	import type { ServerInfo } from '$lib/collector';
	import { getRepositoryColor, blendColors } from '$lib/collector';

	interface Federation {
		sourceHost: string;
		targetHost: string;
		usersCount: number;
		notesCount: number;
	}

	let {
		servers,
		federations,
		seedServer = ''
	}: {
		servers: ServerInfo[];
		federations: Federation[];
		seedServer?: string;
	} = $props();

	let container: HTMLDivElement;
	let cy: import('cytoscape').Core | null = null;
	let isDestroying = false;

	let prevServersLength = 0;
	let prevFederationsLength = 0;
	let prevSeedServer = '';

	function destroyCy() {
		if (cy && !isDestroying) {
			isDestroying = true;
			try {
				// レイアウトを停止してから破棄
				cy.stop();
				cy.destroy();
			} catch {
				// 破棄中のエラーは無視
			}
			cy = null;
			isDestroying = false;
		}
	}

	onMount(() => {
		prevServersLength = servers.length;
		prevFederationsLength = federations.length;
		prevSeedServer = seedServer;
		initGraph();

		return () => {
			destroyCy();
		};
	});

	// props が変更されたらグラフを再描画
	$effect(() => {
		const serversChanged = servers.length !== prevServersLength;
		const federationsChanged = federations.length !== prevFederationsLength;
		const seedChanged = seedServer !== prevSeedServer;

		if ((serversChanged || federationsChanged || seedChanged) && container) {
			prevServersLength = servers.length;
			prevFederationsLength = federations.length;
			prevSeedServer = seedServer;

			destroyCy();
			initGraph();
		}
	});

	async function initGraph() {
		const cytoscape = (await import('cytoscape')).default;

		// 既知のサーバーホスト
		const serverHosts = new Set(servers.map((s) => s.host));

		// 種サーバーからの連合先を収集（未知のサーバーも含む）
		const federatedHosts = new Set<string>();
		for (const fed of federations) {
			if (fed.sourceHost === seedServer) {
				federatedHosts.add(fed.targetHost);
			}
			if (fed.targetHost === seedServer) {
				federatedHosts.add(fed.sourceHost);
			}
		}

		// 重複エッジを除去し、重みを計算
		const edgeMap = new Map<string, { source: string; target: string; weight: number }>();
		for (const fed of federations) {
			// 種サーバーが関与するエッジは常に作成
			const involveSeed = fed.sourceHost === seedServer || fed.targetHost === seedServer;
			// それ以外は両方が既知の場合のみ
			if (!involveSeed && (!serverHosts.has(fed.sourceHost) || !serverHosts.has(fed.targetHost))) {
				continue;
			}

			// 双方向エッジを正規化（アルファベット順で小さい方をsourceに）
			const [source, target] =
				fed.sourceHost < fed.targetHost
					? [fed.sourceHost, fed.targetHost]
					: [fed.targetHost, fed.sourceHost];
			const key = `${source}-${target}`;

			const existing = edgeMap.get(key);
			// リモートユーザー数に基づいて重み計算（1〜15の範囲）
			const activity = fed.usersCount + fed.notesCount / 50;
			const rawWeight = Math.log10(Math.max(activity, 1)) * 3;
			const weight = Math.min(Math.max(rawWeight, 1), 15);
			if (existing) {
				existing.weight = Math.max(existing.weight, weight);
			} else {
				edgeMap.set(key, { source, target, weight });
			}
		}

		// ホストからリポジトリURLへのマッピングを作成（エッジの色計算用）
		const hostToRepoForEdge = new Map<string, string | null>();
		for (const server of servers) {
			hostToRepoForEdge.set(server.host, server.repositoryUrl);
		}

		const edges = Array.from(edgeMap.values()).map((e) => {
			// 2つのノードの色の中間色を計算
			const sourceRepo = hostToRepoForEdge.get(e.source);
			const targetRepo = hostToRepoForEdge.get(e.target);
			const sourceColor = getRepositoryColor(sourceRepo ?? null);
			const targetColor = getRepositoryColor(targetRepo ?? null);
			const edgeColor = blendColors(sourceColor, targetColor);

			return {
				data: {
					id: `${e.source}-${e.target}`,
					source: e.source,
					target: e.target,
					weight: e.weight,
					color: edgeColor
				}
			};
		});

		// 連合関係があるサーバーのみをノードとして表示
		// 種サーバーは常に表示、種サーバーからの連合先も表示
		const connectedHosts = new Set<string>();
		if (seedServer) {
			connectedHosts.add(seedServer);
		}
		for (const edge of edgeMap.values()) {
			connectedHosts.add(edge.source);
			connectedHosts.add(edge.target);
		}

		// サーバー情報のマップを作成
		const serverMap = new Map(servers.map((s) => [s.host, s]));

		const nodes: Array<{ data: Record<string, unknown> }> = [];

		for (const host of connectedHosts) {
			const server = serverMap.get(host);
			const isSeed = host === seedServer;

			let size: number;
			let label: string;
			let repositoryUrl: string | null;
			let iconUrl: string;
			let hasIcon: boolean;

			if (server) {
				// 既知のサーバー
				const users = server.usersCount ?? 1;
				size = Math.min(Math.max(20 + Math.log10(Math.max(users, 1)) * 20, 20), 120);
				label = server.name ?? server.host;
				repositoryUrl = server.repositoryUrl;
				iconUrl = server.iconUrl || `https://${host}/favicon.ico`;
				hasIcon = !!server.iconUrl;
			} else {
				// 未知のサーバー（種サーバーからの連合先）
				size = 25;
				label = host;
				repositoryUrl = null;
				iconUrl = `https://${host}/favicon.ico`;
				hasIcon = false;
			}

			if (isSeed) {
				size = Math.max(size, 80);
			}

			nodes.push({
				data: {
					id: host,
					label,
					size,
					repositoryUrl,
					color: getRepositoryColor(repositoryUrl),
					iconUrl,
					hasIcon,
					isSeed
				}
			});
		}

		cy = cytoscape({
			container,
			elements: [...nodes, ...edges],
			style: [
				{
					selector: 'node',
					style: {
						'background-color': 'data(color)',
						label: 'data(label)',
						width: 'data(size)',
						height: 'data(size)',
						'font-size': '10px',
						color: '#fff',
						'text-outline-color': '#1a1a2e',
						'text-outline-width': 2,
						'text-valign': 'bottom',
						'text-margin-y': 5,
						'border-width': 3,
						'border-color': 'data(color)',
						'transition-property': 'border-color, width, height',
						'transition-duration': 200
					}
				},
				{
					selector: 'node[iconUrl]',
					style: {
						'background-image': 'data(iconUrl)',
						'background-fit': 'cover',
						'background-clip': 'node'
					}
				},
				{
					selector: 'node:active',
					style: {
						'overlay-opacity': 0.2,
						'overlay-color': '#fff'
					}
				},
				{
					selector: 'node:selected',
					style: {
						'border-width': 4,
						'border-color': '#fff'
					}
				},
				{
					selector: 'node[?isSeed]',
					style: {
						'border-width': 4,
						'border-color': '#fff',
						'border-style': 'double'
					}
				},
				{
					selector: 'edge',
					style: {
						width: 'data(weight)',
						'line-color': 'data(color)',
						'curve-style': 'bezier',
						opacity: 0.5,
						'transition-property': 'line-color, opacity',
						'transition-duration': 200
					}
				},
				{
					selector: 'edge:selected',
					style: {
						'line-color': 'rgba(255, 255, 255, 0.8)',
						opacity: 1
					}
				}
			],
			layout: {
				name: 'cose',
				animate: true,
				animationDuration: 1500,
				nodeRepulsion: () => 20000,
				idealEdgeLength: (edge: { data: (key: string) => number }) => {
					const weight = edge.data('weight') || 1;
					// 重みが大きいほど短く（強い繋がり）
					return 200 / (weight + 1);
				},
				edgeElasticity: (edge: { data: (key: string) => number }) => {
					const weight = edge.data('weight') || 1;
					return weight * 100;
				},
				gravity: 1.0,
				numIter: 1000,
				coolingFactor: 0.95,
				padding: 50,
				randomize: false
			},
			// インタラクティブ設定
			minZoom: 0.3,
			maxZoom: 3,
			boxSelectionEnabled: true,
			selectionType: 'single'
		});

		// ノードホバー時のハイライト
		cy.on('mouseover', 'node', (evt) => {
			const node = evt.target;
			node.style({
				'border-width': 4,
				'border-color': '#fff'
			});
			// 接続エッジをハイライト
			node.connectedEdges().style({
				'line-color': 'rgba(255, 255, 255, 0.7)',
				opacity: 1
			});
		});

		cy.on('mouseout', 'node', (evt) => {
			const node = evt.target;
			const isSeed = node.data('isSeed');
			const nodeColor = node.data('color');
			node.style({
				'border-width': isSeed ? 4 : 3,
				'border-color': isSeed ? '#fff' : nodeColor
			});
			// 元の色に戻す
			node.connectedEdges().forEach((edge: { data: (key: string) => string; style: (styles: Record<string, unknown>) => void }) => {
				edge.style({
					'line-color': edge.data('color'),
					opacity: 0.5
				});
			});
		});

		// ノードクリックでサーバーに遷移
		cy.on('tap', 'node', (evt) => {
			const host = evt.target.id();
			window.open(`https://${host}`, '_blank');
		});

		// ノードドラッグ可能に
		cy.nodes().ungrabify();
		cy.on('layoutstop', () => {
			cy?.nodes().grabify();

			// 視点サーバーを中心に配置
			if (seedServer && cy) {
				const seedNode = cy.getElementById(seedServer);
				if (seedNode.length > 0) {
					cy.center(seedNode);
				}
			}
		});
	}
</script>

<div class="graph-wrapper">
	<div class="graph" bind:this={container}></div>

	<!-- Graph controls overlay -->
	<div class="graph-controls">
		<button class="control-btn" onclick={() => cy?.fit()} title="全体表示">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
			</svg>
		</button>
		<button class="control-btn" onclick={() => cy?.zoom(cy.zoom() * 1.3)} title="拡大">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
				<line x1="11" y1="8" x2="11" y2="14" />
				<line x1="8" y1="11" x2="14" y2="11" />
			</svg>
		</button>
		<button class="control-btn" onclick={() => cy?.zoom(cy.zoom() * 0.7)} title="縮小">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
				<line x1="8" y1="11" x2="14" y2="11" />
			</svg>
		</button>
		<button class="control-btn" onclick={() => { if (seedServer && cy) { const node = cy.getElementById(seedServer); if (node.length) cy.center(node); } }} title="中心に戻る">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<circle cx="12" cy="12" r="3" />
			</svg>
		</button>
	</div>

	<!-- Legend -->
	<div class="graph-legend">
		<div class="legend-item">
			<span class="legend-dot seed"></span>
			<span>視点サーバー</span>
		</div>
		<div class="legend-item">
			<span class="legend-line"></span>
			<span>連合関係（太さ＝強度）</span>
		</div>
	</div>
</div>

<style>
	.graph-wrapper {
		position: relative;
		flex: 1;
		min-height: 0;
		height: 100%;
		background: radial-gradient(ellipse at center, rgba(134, 179, 0, 0.03) 0%, transparent 70%);
	}

	.graph {
		width: 100%;
		height: 100%;
	}

	/* Controls */
	.graph-controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 10;
	}

	.control-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-card);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--fg-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.control-btn:hover {
		background: var(--bg-card-hover);
		border-color: var(--border-color-hover);
		color: var(--fg-primary);
		transform: scale(1.05);
	}

	.control-btn:active {
		transform: scale(0.95);
	}

	.control-btn svg {
		width: 18px;
		height: 18px;
	}

	/* Legend */
	.graph-legend {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--bg-card);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.75rem;
		color: var(--fg-muted);
		z-index: 10;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent-500);
	}

	.legend-dot.seed {
		border: 2px solid white;
		box-shadow: 0 0 8px rgba(134, 179, 0, 0.5);
	}

	.legend-line {
		width: 24px;
		height: 3px;
		background: linear-gradient(90deg, var(--accent-600), var(--accent-400));
		border-radius: 2px;
	}

	@media (max-width: 768px) {
		.graph-controls {
			top: 0.75rem;
			right: 0.75rem;
		}

		.control-btn {
			width: 32px;
			height: 32px;
		}

		.control-btn svg {
			width: 16px;
			height: 16px;
		}

		.graph-legend {
			bottom: 0.75rem;
			left: 0.75rem;
			padding: 0.5rem 0.75rem;
			font-size: 0.7rem;
		}
	}
</style>
