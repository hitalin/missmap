<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let error = $state('');
	let status = $state<'loading' | 'success' | 'error'>('loading');

	onMount(async () => {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		const host = localStorage.getItem('missmap_auth_host');

		if (!token || !host) {
			error = '認証情報が見つかりません';
			status = 'error';
			return;
		}

		try {
			const res = await fetch('/api/auth/callback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, host })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || '認証に失敗しました';
				status = 'error';
				return;
			}

			// 成功 - 即座にリダイレクト
			status = 'success';
			localStorage.removeItem('missmap_auth_host');
			goto('/', { replaceState: true });
		} catch {
			error = '通信エラーが発生しました';
			status = 'error';
		}
	});
</script>

<svelte:head>
	<title>認証中... | missmap</title>
</svelte:head>

<div class="callback-container">
	<div class="stars-bg">
		{#each Array(20) as _, i}
			<span class="star-bg" style="--delay: {i * 0.15}s; --x: {Math.random() * 100}%; --y: {Math.random() * 100}%; --size: {2 + Math.random() * 2}px;"></span>
		{/each}
	</div>

	<div class="content">
		{#if status === 'error'}
			<div class="error-card">
				<div class="error-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="15" y1="9" x2="9" y2="15" />
						<line x1="9" y1="9" x2="15" y2="15" />
					</svg>
				</div>
				<h2>認証エラー</h2>
				<p>{error}</p>
				<a href="/" class="back-link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="19" y1="12" x2="5" y2="12" />
						<polyline points="12 19 5 12 12 5" />
					</svg>
					マップに戻る
				</a>
			</div>
		{:else}
			<div class="loading-card">
				<div class="orbit-container">
					<div class="orbit"></div>
					<div class="planet"></div>
				</div>
				<p class="loading-text">宇宙に接続中...</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.callback-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(180deg, #0c0818 0%, #1a1030 50%, #0c0818 100%);
		position: relative;
		overflow: hidden;
	}

	.stars-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.star-bg {
		position: absolute;
		width: var(--size);
		height: var(--size);
		background: white;
		border-radius: 50%;
		left: var(--x);
		top: var(--y);
		animation: twinkle 3s ease-in-out infinite;
		animation-delay: var(--delay);
	}

	@keyframes twinkle {
		0%, 100% { opacity: 0.2; }
		50% { opacity: 0.8; }
	}

	.content {
		position: relative;
		z-index: 1;
	}

	/* Loading Card */
	.loading-card {
		text-align: center;
		padding: 2.5rem;
	}

	.orbit-container {
		position: relative;
		width: 80px;
		height: 80px;
		margin: 0 auto 1.5rem;
	}

	.orbit {
		position: absolute;
		inset: 0;
		border: 2px solid rgba(134, 179, 0, 0.3);
		border-radius: 50%;
		animation: orbit-pulse 2s ease-in-out infinite;
	}

	.orbit::before {
		content: '';
		position: absolute;
		width: 12px;
		height: 12px;
		background: #86b300;
		border-radius: 50%;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		box-shadow: 0 0 12px rgba(134, 179, 0, 0.6);
		animation: orbit-spin 1.5s linear infinite;
		transform-origin: 50% calc(50% + 40px);
	}

	@keyframes orbit-spin {
		from { transform: translateX(-50%) rotate(0deg) translateY(0) rotate(0deg); }
		to { transform: translateX(-50%) rotate(360deg) translateY(0) rotate(-360deg); }
	}

	@keyframes orbit-pulse {
		0%, 100% { transform: scale(1); opacity: 0.5; }
		50% { transform: scale(1.05); opacity: 1; }
	}

	.planet {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 32px;
		height: 32px;
		background: linear-gradient(135deg, #86b300, #6a9000);
		border-radius: 50%;
		box-shadow:
			inset -4px -4px 8px rgba(0, 0, 0, 0.3),
			0 0 20px rgba(134, 179, 0, 0.4);
	}

	.loading-text {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.95rem;
		margin: 0;
		animation: fade-pulse 2s ease-in-out infinite;
	}

	@keyframes fade-pulse {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 1; }
	}

	/* Error Card */
	.error-card {
		text-align: center;
		padding: 2rem 2.5rem;
		background: linear-gradient(180deg, rgba(30, 25, 55, 0.95) 0%, rgba(20, 15, 40, 0.95) 100%);
		border: 1px solid rgba(255, 100, 100, 0.2);
		border-radius: 1.25rem;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.05),
			0 20px 60px rgba(0, 0, 0, 0.5);
		max-width: 320px;
	}

	.error-icon {
		width: 56px;
		height: 56px;
		margin: 0 auto 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 100, 100, 0.1);
		border-radius: 50%;
	}

	.error-icon svg {
		width: 28px;
		height: 28px;
		color: #ff6b6b;
	}

	.error-card h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		color: white;
	}

	.error-card p {
		margin: 0 0 1.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: rgba(134, 179, 0, 0.1);
		border: 1px solid rgba(134, 179, 0, 0.3);
		border-radius: 0.625rem;
		color: #86b300;
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.back-link svg {
		width: 16px;
		height: 16px;
	}

	.back-link:hover {
		background: rgba(134, 179, 0, 0.2);
		border-color: #86b300;
		transform: translateY(-1px);
	}
</style>
