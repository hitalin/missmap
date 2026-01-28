<script lang="ts">
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { DEFAULT_SETTINGS, type UserSettings, type ViewpointCriteria, type AuthState } from '$lib/types';
	import { logout } from '$lib/stores/auth.svelte';

	let { settings = $bindable(DEFAULT_SETTINGS), onAddViewpoint, onFocusViewpoint, onCriteriaChange, ssrViewpoints = [], defaultViewpoints = [], isMobile = false, defaultOpen = true, authState, onOpenLogin }: {
		settings: UserSettings;
		onAddViewpoint: (host: string) => void;
		onFocusViewpoint?: (host: string) => void;
		onCriteriaChange?: (criteria: ViewpointCriteria) => void;
		ssrViewpoints: string[];
		defaultViewpoints: string[];
		isMobile?: boolean;
		defaultOpen?: boolean;
		authState?: AuthState;
		onOpenLogin?: () => void;
	} = $props();

	async function handleLogout() {
		await logout();
	}

	let isExpanded = $state(defaultOpen);

	let inputValue = $state('');
	let isAdding = $state(false);

	function handleAdd() {
		const host = inputValue.trim().toLowerCase();
		if (host && !settings.viewpointServers.includes(host)) {
			settings.viewpointServers = [...settings.viewpointServers, host];
			onAddViewpoint(host);
			// 追加したサーバーにフォーカス
			onFocusViewpoint?.(host);
		}
		inputValue = '';
		isAdding = false;
	}

	function handleRemove(host: string) {
		settings.viewpointServers = settings.viewpointServers.filter(h => h !== host);
	}

	function handleFocus(host: string) {
		// クリックでそのサーバーにフォーカス（グラフをパン）
		onFocusViewpoint?.(host);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleAdd();
		} else if (e.key === 'Escape') {
			inputValue = '';
			isAdding = false;
		}
	}

	// SSRで取得済みかどうかを判定
	function isFromSSR(host: string): boolean {
		return ssrViewpoints.includes(host);
	}

	// デフォルトに戻す
	function handleResetToDefault() {
		if (defaultViewpoints.length > 0) {
			settings.viewpointServers = [...defaultViewpoints];
		}
	}

	// 現在の設定がデフォルトと同じかどうか
	function isDefault(): boolean {
		if (defaultViewpoints.length === 0) return false;
		if (settings.viewpointServers.length !== defaultViewpoints.length) return false;
		return defaultViewpoints.every(h => settings.viewpointServers.includes(h));
	}

	// 選定基準の選択肢
	const criteriaOptions: { value: ViewpointCriteria; label: string; description: string }[] = [
		{
			value: 'dru15',
			label: 'アクティブ',
			description: '実際に閲覧しているユーザー数（15日平均）'
		},
		{
			value: 'npd15',
			label: '投稿数',
			description: '1日あたりのノート数（15日平均）'
		},
		{
			value: 'users',
			label: '規模',
			description: '総ユーザー数（累計）'
		}
	];

	function handleCriteriaChange(criteria: ViewpointCriteria) {
		settings.viewpointCriteria = criteria;
		onCriteriaChange?.(criteria);
	}
</script>

<div class="settings-panel">
	<button class="panel-header-toggle" onclick={() => isExpanded = !isExpanded}>
		<svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3" />
			<path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
		</svg>
		<h4>視点</h4>
		<svg class="toggle-icon" class:expanded={isExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if isExpanded}
	<div class="panel-content" transition:slide={{ duration: 200, easing: cubicOut }}>
	<!-- ログインセクション（上部） -->
	{#if authState}
		<div class="auth-section-top">
			{#if authState.isLoading}
				<div class="auth-loading">
					<div class="spinner"></div>
				</div>
			{:else if authState.isLoggedIn && authState.user}
				<div class="user-bar">
					{#if authState.user.avatarUrl}
						<img src={authState.user.avatarUrl} alt="" class="avatar-small" />
					{:else}
						<span class="avatar-placeholder-small">👤</span>
					{/if}
					<span class="user-name">@{authState.user.username}@{authState.user.host}</span>
					<button class="icon-btn logout" onclick={handleLogout} title="ログアウト">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
					</button>
				</div>
			{:else}
				<button class="login-btn-compact" onclick={onOpenLogin}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
						<polyline points="10 17 15 12 10 7" />
						<line x1="15" y1="12" x2="3" y2="12" />
					</svg>
					ログインして自分の視点を設定
				</button>
			{/if}
		</div>
	{/if}

	<!-- 選定基準の選択 -->
	<div class="criteria-selector">
		<label>デフォルト視点の基準:</label>
		<div class="criteria-buttons">
			{#each criteriaOptions as option (option.value)}
				<button
					class="criteria-btn"
					class:active={settings.viewpointCriteria === option.value}
					onclick={() => handleCriteriaChange(option.value)}
					title={option.description}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="viewpoint-chips">
		{#each settings.viewpointServers as host (host)}
			<div class="viewpoint-chip">
				<button class="chip-main" onclick={() => handleFocus(host)} title="グラフ上でフォーカス">
					{host}
					{#if isFromSSR(host)}
						<span class="ssr-dot" title="SSRで取得済み"></span>
					{/if}
				</button>
				{#if settings.viewpointServers.length > 1}
					<button class="chip-remove" onclick={() => handleRemove(host)} title="削除">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				{/if}
			</div>
		{/each}
	</div>

	<!-- 追加UI -->
	{#if isAdding}
		<div class="input-group">
			<div class="input-wrapper">
				<svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="16" />
					<line x1="8" y1="12" x2="16" y2="12" />
				</svg>
				<input
					type="text"
					bind:value={inputValue}
					onkeydown={handleKeydown}
					placeholder="例: misskey.io"
				/>
			</div>
			<div class="button-group">
				<button class="apply-btn" onclick={handleAdd}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					追加
				</button>
				<button class="cancel-btn" onclick={() => { inputValue = ''; isAdding = false; }} title="キャンセル">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>
	{:else}
		<div class="action-buttons">
			<button class="add-viewpoint-btn" onclick={() => isAdding = true}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="16" />
					<line x1="8" y1="12" x2="16" y2="12" />
				</svg>
				サーバーを追加
			</button>
			{#if !isDefault()}
				<button class="reset-btn" onclick={handleResetToDefault} title="デフォルトに戻す">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
						<path d="M3 3v5h5" />
					</svg>
					リセット
				</button>
			{/if}
		</div>
	{/if}

	</div>
	{/if}
</div>

<style>
	.settings-panel {
		padding: 0.625rem 0.75rem;
	}

	.panel-header-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.25rem 0;
		margin-bottom: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.panel-header-toggle:hover {
		background: rgba(134, 179, 0, 0.05);
	}

	.panel-header-toggle h4 {
		flex: 1;
		margin: 0;
		color: var(--fg-primary);
	}

	.toggle-icon {
		width: 16px;
		height: 16px;
		color: var(--fg-muted);
		transition: transform var(--transition-bounce);
	}

	.toggle-icon.expanded {
		transform: rotate(180deg);
	}

	.panel-icon {
		width: 18px;
		height: 18px;
		color: var(--accent-500);
		filter: drop-shadow(0 0 4px rgba(134, 179, 0, 0.3));
	}

	h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	/* Criteria Selector */
	.criteria-selector {
		margin-bottom: 0.625rem;
	}

	.criteria-selector label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--fg-muted);
		letter-spacing: 0.02em;
	}

	.criteria-buttons {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
		background: var(--glass-bg-subtle);
		padding: 0.25rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-color);
	}

	.criteria-btn {
		flex: 1;
		min-width: fit-content;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--fg-secondary);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.criteria-btn:hover {
		background: var(--bg-card);
		color: var(--fg-primary);
	}

	.criteria-btn.active {
		background: rgba(134, 179, 0, 0.18);
		border-color: var(--accent-500);
		color: var(--accent-400);
		font-weight: 600;
		box-shadow: 0 0 12px rgba(134, 179, 0, 0.2);
	}

	/* Viewpoint Chips */
	.viewpoint-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}

	.viewpoint-chip {
		display: inline-flex;
		align-items: center;
		background: var(--glass-bg-subtle);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-full);
		overflow: hidden;
		transition: all var(--transition-bounce);
		box-shadow: var(--shadow-xs);
	}

	.viewpoint-chip:hover {
		border-color: var(--accent-500);
		box-shadow: var(--shadow-sm), 0 0 8px rgba(134, 179, 0, 0.15);
		transform: translateY(-1px);
	}

	.chip-main {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: transparent;
		border: none;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--fg-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.chip-main:hover {
		color: var(--accent-400);
	}

	.ssr-dot {
		width: 6px;
		height: 6px;
		background: var(--accent-500);
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 6px rgba(134, 179, 0, 0.5);
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		padding: 0;
		margin-right: 0.25rem;
		background: transparent;
		border: none;
		border-radius: 50%;
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.chip-remove svg {
		width: 10px;
		height: 10px;
	}

	.chip-remove:hover {
		background: rgba(255, 100, 100, 0.18);
		color: #fca5a5;
		transform: scale(1.1);
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		gap: 0.375rem;
	}

	.add-viewpoint-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem;
		background: transparent;
		border: 1.5px dashed var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.add-viewpoint-btn svg {
		width: 14px;
		height: 14px;
	}

	.add-viewpoint-btn:hover {
		background: rgba(134, 179, 0, 0.1);
		border-color: var(--accent-500);
		border-style: solid;
		color: var(--accent-400);
		transform: translateY(-1px);
		box-shadow: 0 0 12px rgba(134, 179, 0, 0.15);
	}

	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.reset-btn svg {
		width: 14px;
		height: 14px;
	}

	.reset-btn:hover {
		background: rgba(134, 179, 0, 0.1);
		border-color: var(--accent-500);
		color: var(--accent-400);
		transform: translateY(-1px);
	}

	/* Input group */
	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 0.875rem;
		width: 16px;
		height: 16px;
		color: var(--fg-muted);
		pointer-events: none;
		transition: color var(--transition-fast);
	}

	.input-wrapper:focus-within .input-icon {
		color: var(--accent-500);
	}

	input {
		width: 100%;
		padding: 0.75rem 0.875rem 0.75rem 2.5rem;
		background: var(--glass-bg-subtle);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		color: var(--fg-primary);
		transition: all var(--transition-fast);
		box-shadow: var(--shadow-inset);
	}

	input::placeholder {
		color: var(--fg-muted);
	}

	input:focus {
		outline: none;
		border-color: var(--accent-500);
		box-shadow: 0 0 0 3px rgba(134, 179, 0, 0.12), var(--shadow-inset);
		background: var(--bg-card);
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
		background: linear-gradient(135deg, var(--accent-600), var(--accent-500));
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		font-weight: 600;
		color: white;
		cursor: pointer;
		transition: all var(--transition-bounce);
		box-shadow: var(--shadow-sm);
	}

	.apply-btn svg {
		width: 14px;
		height: 14px;
	}

	.apply-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md), 0 0 16px rgba(134, 179, 0, 0.3);
	}

	.apply-btn:active {
		transform: translateY(0);
	}

	.cancel-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem;
		background: var(--glass-bg-subtle);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.cancel-btn svg {
		width: 16px;
		height: 16px;
	}

	.cancel-btn:hover {
		background: rgba(255, 100, 100, 0.12);
		border-color: rgba(255, 100, 100, 0.3);
		color: #fca5a5;
		transform: scale(1.05);
	}

	/* Auth Section (Top) */
	.auth-section-top {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.auth-loading {
		display: flex;
		justify-content: center;
		padding: 0.375rem;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--accent-500);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.user-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.avatar-small {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		object-fit: cover;
		border: 1.5px solid var(--accent-500);
		box-shadow: 0 0 6px rgba(134, 179, 0, 0.3);
	}

	.avatar-placeholder-small {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--glass-bg-subtle);
		border-radius: 50%;
		font-size: 12px;
	}

	.user-name {
		flex: 1;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fg-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.icon-btn svg {
		width: 14px;
		height: 14px;
	}

	.icon-btn:hover {
		background: rgba(134, 179, 0, 0.1);
		border-color: var(--accent-500);
		color: var(--accent-400);
	}

	.icon-btn.logout:hover {
		background: rgba(255, 100, 100, 0.1);
		border-color: rgba(255, 100, 100, 0.3);
		color: #fca5a5;
	}

	.login-btn-compact {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: rgba(134, 179, 0, 0.1);
		border: 1px dashed var(--accent-500);
		border-radius: var(--radius-md);
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--accent-400);
		cursor: pointer;
		transition: all var(--transition-bounce);
	}

	.login-btn-compact svg {
		width: 14px;
		height: 14px;
	}

	.login-btn-compact:hover {
		background: rgba(134, 179, 0, 0.18);
		border-style: solid;
		transform: translateY(-1px);
		box-shadow: 0 0 12px rgba(134, 179, 0, 0.2);
	}
</style>
