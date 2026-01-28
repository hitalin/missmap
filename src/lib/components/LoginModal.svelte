<script lang="ts">
	import { startLogin } from '$lib/stores/auth.svelte';

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

	async function handleSubmit(e: Event) {
		e.preventDefault();

		if (!host.trim()) {
			error = 'サーバーを入力してください';
			return;
		}

		isLoading = true;
		error = '';

		const result = await startLogin(host.trim());

		if (result.success && result.url) {
			// Misskey認証ページにリダイレクト
			window.location.href = result.url;
		} else {
			error = result.error || 'ログインに失敗しました';
			isLoading = false;
		}
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
			<button class="close-btn" onclick={onClose} aria-label="閉じる">×</button>

			<h2 id="login-title">🌌 宇宙にログイン</h2>

			<p class="description">
				あなたのサーバーでログインすると、視点が自動設定され、設定が保存されます。
			</p>

			<form onsubmit={handleSubmit}>
				<div class="input-group">
					<label for="host-input">あなたのサーバー</label>
					<div class="input-wrapper">
						<span class="prefix">https://</span>
						<input
							id="host-input"
							type="text"
							bind:value={host}
							placeholder="misskey.io"
							disabled={isLoading}
							autocomplete="off"
							autocapitalize="none"
						/>
					</div>
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				<button type="submit" class="submit-btn" disabled={isLoading}>
					{#if isLoading}
						<span class="spinner"></span>
						接続中...
					{:else}
						ログイン
					{/if}
				</button>
			</form>

			<div class="benefits">
				<p class="benefits-title">ログインすると:</p>
				<ul>
					<li>✓ 視点が自動設定されます</li>
					<li>✓ 非公開サーバーの連合情報も取得</li>
				</ul>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: linear-gradient(180deg, rgba(25, 20, 45, 0.98) 0%, rgba(15, 12, 30, 0.98) 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		padding: 2rem;
		max-width: 400px;
		width: 100%;
		position: relative;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.5);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		line-height: 1;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: white;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
		color: white;
	}

	.description {
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.input-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.input-wrapper:focus-within {
		border-color: #86b300;
	}

	.prefix {
		padding: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.9rem;
		background: rgba(255, 255, 255, 0.03);
	}

	input {
		flex: 1;
		padding: 0.75rem;
		padding-left: 0;
		background: none;
		border: none;
		color: white;
		font-size: 1rem;
		outline: none;
	}

	input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.error {
		color: #ff4757;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem;
		background: linear-gradient(135deg, #86b300, #6a9000);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: opacity 0.2s, transform 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
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
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.benefits-title {
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
	}

	.benefits ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.benefits li {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.85rem;
		padding: 0.25rem 0;
	}

	.privacy {
		margin-top: 1rem;
		text-align: center;
	}

	.privacy small {
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.75rem;
	}
</style>
