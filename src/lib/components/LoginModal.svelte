<script lang="ts">
	import { startLogin } from '$lib/stores/auth.svelte';
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';

	let {
		isOpen = false,
		onClose
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let host = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let shake = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!host.trim()) {
			error = 'サーバーを入力してください';
			triggerShake();
			return;
		}

		isLoading = true;
		error = '';

		const result = await startLogin(host.trim());

		if (result.success && result.url) {
			window.location.href = result.url;
		} else {
			error = result.error || 'ログインに失敗しました';
			isLoading = false;
			triggerShake();
		}
	}

	function triggerShake() {
		shake = true;
		setTimeout(() => shake = false, 500);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	// モーダルが開いた時にフォームをリセット
	$effect(() => {
		if (isOpen) {
			host = '';
			error = '';
			isLoading = false;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick} transition:fade={{ duration: 200 }}>
		<div
			class="modal"
			class:shake
			role="dialog"
			aria-modal="true"
			aria-labelledby="login-title"
			transition:scale={{ duration: 300, start: 0.9, easing: backOut }}
		>
			<button class="close-btn" onclick={onClose} aria-label="閉じる">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>

			<div class="header">
				<div class="icon-container">
					<svg class="rocket-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
						<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
						<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
						<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
					</svg>
					<div class="stars">
						<span class="star" style="--delay: 0s; --x: 20%; --y: 30%;"></span>
						<span class="star" style="--delay: 0.3s; --x: 80%; --y: 20%;"></span>
						<span class="star" style="--delay: 0.6s; --x: 60%; --y: 70%;"></span>
						<span class="star" style="--delay: 0.9s; --x: 30%; --y: 80%;"></span>
					</div>
				</div>
				<h2 id="login-title">宇宙にログイン</h2>
				<p class="description">
					あなたのサーバーでログインして、宇宙を探索しましょう
				</p>
			</div>

			<form onsubmit={handleSubmit}>
				<div class="input-group">
					<label for="host-input">あなたのサーバー</label>
					<div class="input-wrapper" class:error class:focus={false}>
						<span class="prefix">https://</span>
						<input
							id="host-input"
							type="text"
							bind:value={host}
							placeholder="misskey.io"
							disabled={isLoading}
							autocomplete="off"
							autocapitalize="none"
							spellcheck="false"
						/>
					</div>
					{#if error}
						<p class="error-text" transition:fade={{ duration: 150 }}>{error}</p>
					{/if}
				</div>

				<button type="submit" class="submit-btn" disabled={isLoading}>
					{#if isLoading}
						<span class="spinner"></span>
						<span>接続中...</span>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
							<polyline points="10 17 15 12 10 7" />
							<line x1="15" y1="12" x2="3" y2="12" />
						</svg>
						<span>ログイン</span>
					{/if}
				</button>
			</form>

			<div class="benefits">
				<div class="benefit-item">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<circle cx="12" cy="12" r="3" />
						<line x1="12" y1="2" x2="12" y2="4" />
						<line x1="12" y1="20" x2="12" y2="22" />
						<line x1="2" y1="12" x2="4" y2="12" />
						<line x1="20" y1="12" x2="22" y2="12" />
					</svg>
					<span>視点が自動設定</span>
				</div>
				<div class="benefit-item">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
					<span>非公開サーバーの連合情報も取得</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: linear-gradient(180deg, rgba(30, 25, 55, 0.98) 0%, rgba(15, 12, 30, 0.98) 100%);
		border: 1px solid rgba(134, 179, 0, 0.2);
		border-radius: 1.25rem;
		padding: 2rem;
		max-width: 380px;
		width: 100%;
		position: relative;
		box-shadow:
			0 0 0 1px rgba(255, 255, 255, 0.05),
			0 20px 60px rgba(0, 0, 0, 0.5),
			0 0 40px rgba(134, 179, 0, 0.1);
	}

	.modal.shake {
		animation: shake 0.5s ease-in-out;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
		20%, 40%, 60%, 80% { transform: translateX(4px); }
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn svg {
		width: 16px;
		height: 16px;
	}

	.close-btn:hover {
		background: rgba(255, 100, 100, 0.1);
		border-color: rgba(255, 100, 100, 0.3);
		color: #fca5a5;
	}

	.header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.icon-container {
		position: relative;
		width: 64px;
		height: 64px;
		margin: 0 auto 1rem;
	}

	.rocket-icon {
		width: 100%;
		height: 100%;
		color: var(--accent-500, #86b300);
		filter: drop-shadow(0 0 8px rgba(134, 179, 0, 0.4));
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0) rotate(-45deg); }
		50% { transform: translateY(-4px) rotate(-45deg); }
	}

	.stars {
		position: absolute;
		inset: -10px;
		pointer-events: none;
	}

	.star {
		position: absolute;
		width: 4px;
		height: 4px;
		background: white;
		border-radius: 50%;
		left: var(--x);
		top: var(--y);
		animation: twinkle 2s ease-in-out infinite;
		animation-delay: var(--delay);
	}

	@keyframes twinkle {
		0%, 100% { opacity: 0.3; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.2); }
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: white;
		letter-spacing: 0.02em;
	}

	.description {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.875rem;
		margin: 0;
		line-height: 1.5;
	}

	.input-group {
		margin-bottom: 1.25rem;
	}

	label {
		display: block;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.8rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.625rem;
		overflow: hidden;
		transition: all 0.2s;
	}

	.input-wrapper:focus-within {
		border-color: var(--accent-500, #86b300);
		box-shadow: 0 0 0 3px rgba(134, 179, 0, 0.15);
	}

	.input-wrapper.error {
		border-color: rgba(255, 100, 100, 0.5);
	}

	.prefix {
		padding: 0.75rem 0.5rem 0.75rem 0.875rem;
		color: rgba(255, 255, 255, 0.35);
		font-size: 0.875rem;
		font-family: ui-monospace, monospace;
		user-select: none;
	}

	input {
		flex: 1;
		padding: 0.75rem 0.875rem 0.75rem 0;
		background: none;
		border: none;
		color: white;
		font-size: 0.95rem;
		outline: none;
		min-width: 0;
	}

	input::placeholder {
		color: rgba(255, 255, 255, 0.25);
	}

	input:disabled {
		opacity: 0.6;
	}

	.error-text {
		color: #ff6b6b;
		font-size: 0.8rem;
		margin: 0.5rem 0 0;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem 1rem;
		background: linear-gradient(135deg, var(--accent-500, #86b300), var(--accent-600, #6a9000));
		color: white;
		border: none;
		border-radius: 0.625rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.25s;
		box-shadow: 0 2px 8px rgba(134, 179, 0, 0.3);
	}

	.submit-btn svg {
		width: 18px;
		height: 18px;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(134, 179, 0, 0.4);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.benefits {
		margin-top: 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.benefit-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.8rem;
	}

	.benefit-item svg {
		width: 16px;
		height: 16px;
		color: var(--accent-500, #86b300);
		flex-shrink: 0;
	}
</style>
