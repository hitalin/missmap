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

	let prevServersLength = 0;
	let prevFederationsLength = 0;
	let prevSeedServer = '';

	onMount(() => {
		prevServersLength = servers.length;
		prevFederationsLength = federations.length;
		prevSeedServer = seedServer;
		initGraph();

		return () => {
			if (cy) {
				cy.destroy();
				cy = null;
			}
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

			if (cy) {
				cy.destroy();
				cy = null;
			}
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
</div>

<style>
	.graph-wrapper {
		position: relative;
		flex: 1;
		min-height: 600px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		overflow: hidden;
	}

	.graph {
		width: 100%;
		height: 100%;
	}
</style>
