<script lang="ts">
	import { DEFAULT_SETTINGS, type UserSettings } from '$lib/types';

	let { settings = $bindable(DEFAULT_SETTINGS), onApply }: {
		settings: UserSettings;
		onApply: () => void;
	} = $props();

	let inputValue = $state(settings.seedServer);
	let isEditing = $state(false);

	function handleApply() {
		const host = inputValue.trim().toLowerCase();
		if (host && host !== settings.seedServer) {
			settings.seedServer = host;
			onApply();
		}
		isEditing = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleApply();
		} else if (e.key === 'Escape') {
			inputValue = settings.seedServer;
			isEditing = false;
		}
	}
</script>

<div class="settings-panel">
	<div class="panel-header">
		<svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3" />
			<path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
		</svg>
		<h4>視点サーバー</h4>
	</div>

	<p class="description">連合グラフの中心となるサーバーを選択</p>

	{#if isEditing}
		<div class="input-group">
			<div class="input-wrapper">
				<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="2" y1="12" x2="22" y2="12" />
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
				</svg>
				<input
					type="text"
					bind:value={inputValue}
					onkeydown={handleKeydown}
					placeholder="例: misskey.io"
				/>
			</div>
			<div class="button-group">
				<button class="apply-btn" onclick={handleApply}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					適用
				</button>
				<button class="cancel-btn" onclick={() => { inputValue = settings.seedServer; isEditing = false; }} title="キャンセル">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<button class="server-display" onclick={() => isEditing = true}>
			<div class="server-info">
				<svg class="server-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="2" y1="12" x2="22" y2="12" />
					<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
				</svg>
				<span class="server-name">{settings.seedServer}</span>
			</div>
			<svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
				<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
			</svg>
		</button>
	{/if}
</div>

<style>
	.settings-panel {
		padding: 0.875rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.375rem;
	}

	.panel-icon {
		width: 18px;
		height: 18px;
		color: var(--accent-500);
	}

	h4 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.description {
		margin: 0 0 0.625rem;
		font-size: 0.75rem;
		color: var(--fg-muted);
	}

	/* Server display button */
	.server-display {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(134, 179, 0, 0.1);
		border: 1px solid rgba(134, 179, 0, 0.3);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.server-display:hover {
		background: rgba(134, 179, 0, 0.15);
		border-color: var(--accent-500);
		transform: translateY(-1px);
	}

	.server-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.server-icon {
		width: 20px;
		height: 20px;
		color: var(--accent-500);
	}

	.server-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--fg-primary);
	}

	.edit-icon {
		width: 16px;
		height: 16px;
		color: var(--fg-muted);
		transition: color var(--transition-fast);
	}

	.server-display:hover .edit-icon {
		color: var(--accent-400);
	}

	/* Input group */
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 0.75rem;
		width: 18px;
		height: 18px;
		color: var(--fg-muted);
		pointer-events: none;
	}

	input {
		width: 100%;
		padding: 0.75rem 0.75rem 0.75rem 2.5rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		color: var(--fg-primary);
		transition: all var(--transition-fast);
	}

	input::placeholder {
		color: var(--fg-muted);
	}

	input:focus {
		outline: none;
		border-color: var(--accent-500);
		box-shadow: 0 0 0 3px rgba(134, 179, 0, 0.15);
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
	}

	.apply-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.625rem 1rem;
		background: var(--accent-600);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		font-weight: 600;
		color: white;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.apply-btn svg {
		width: 16px;
		height: 16px;
	}

	.apply-btn:hover {
		background: var(--accent-500);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(134, 179, 0, 0.3);
	}

	.cancel-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.cancel-btn svg {
		width: 18px;
		height: 18px;
	}

	.cancel-btn:hover {
		background: rgba(255, 100, 100, 0.1);
		border-color: rgba(255, 100, 100, 0.3);
		color: #fca5a5;
	}
</style>
