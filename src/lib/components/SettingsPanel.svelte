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
	<h4>視点サーバー</h4>

	{#if isEditing}
		<div class="input-group">
			<input
				type="text"
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder="例: misskey.io"
			/>
			<button onclick={handleApply}>適用</button>
			<button class="cancel" onclick={() => { inputValue = settings.seedServer; isEditing = false; }}>
				キャンセル
			</button>
		</div>
	{:else}
		<div class="current-value">
			<span>{settings.seedServer}</span>
			<button onclick={() => isEditing = true}>変更</button>
		</div>
	{/if}
</div>

<style>
	.settings-panel {
		padding: 1rem;
		background: #e8f4e8;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	h4 {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
	}

	.description {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		color: #666;
	}

	.input-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	input {
		flex: 1;
		min-width: 150px;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
		background: #4a9;
		color: white;
	}

	button:hover {
		background: #3a8;
	}

	button.cancel {
		background: #888;
	}

	button.cancel:hover {
		background: #666;
	}

	.current-value {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.current-value span {
		font-weight: 500;
		font-size: 0.95rem;
	}

	.current-value button {
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		background: #666;
	}
</style>
