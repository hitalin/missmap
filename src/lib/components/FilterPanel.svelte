<script lang="ts">
	import { DEFAULT_FILTER, type ServerFilter, type ServerScale } from '$lib/types';
	import { getRepositoryDisplayName, getRepositoryColor } from '$lib/collector';

	let {
		filter = $bindable(DEFAULT_FILTER),
		availableRepositories = []
	}: {
		filter: ServerFilter;
		availableRepositories: string[];
	} = $props();

	let softwareExpanded = $state(false);

	const scaleOptions: { value: ServerScale; label: string }[] = [
		{ value: 'large', label: '大規模 (1000人以上)' },
		{ value: 'medium', label: '中規模 (100〜1000人)' },
		{ value: 'small', label: '小規模 (100人以下)' }
	];

	function toggleScale(value: ServerScale) {
		if (filter.scale.includes(value)) {
			filter.scale = filter.scale.filter((s) => s !== value);
		} else {
			filter.scale = [...filter.scale, value];
		}
	}

	// 選択中のソフトウェア数
	let selectedCount = $derived(filter.repositoryUrls.length);
</script>

<aside class="filter-panel">
	<div class="panel-header">
		<svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
		</svg>
		<h3>フィルター</h3>
	</div>

	<section>
		<h4>登録要件</h4>
		<div class="checkbox-group">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={filter.registrationOpen} />
				<span class="checkbox-custom"></span>
				<span class="checkbox-text">登録受付中のみ</span>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={filter.emailNotRequired} />
				<span class="checkbox-custom"></span>
				<span class="checkbox-text">メアド不要</span>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={filter.approvalRequired} />
				<span class="checkbox-custom"></span>
				<span class="checkbox-text">承認制</span>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={filter.inviteOnly} />
				<span class="checkbox-custom"></span>
				<span class="checkbox-text">招待制</span>
			</label>
		</div>
	</section>

	<section>
		<h4>年齢制限</h4>
		<div class="radio-group">
			<label class="radio-label">
				<input
					type="radio"
					name="age"
					checked={filter.ageRestriction === null}
					onchange={() => (filter.ageRestriction = null)}
				/>
				<span class="radio-custom"></span>
				<span class="radio-text">すべて</span>
			</label>
			<label class="radio-label">
				<input
					type="radio"
					name="age"
					checked={filter.ageRestriction === 'all'}
					onchange={() => (filter.ageRestriction = 'all')}
				/>
				<span class="radio-custom"></span>
				<span class="radio-text">全年齢</span>
			</label>
			<label class="radio-label">
				<input
					type="radio"
					name="age"
					checked={filter.ageRestriction === '13+'}
					onchange={() => (filter.ageRestriction = '13+')}
				/>
				<span class="radio-custom"></span>
				<span class="radio-text">13歳以上</span>
			</label>
			<label class="radio-label">
				<input
					type="radio"
					name="age"
					checked={filter.ageRestriction === '18+'}
					onchange={() => (filter.ageRestriction = '18+')}
				/>
				<span class="radio-custom"></span>
				<span class="radio-text">18+</span>
			</label>
		</div>
	</section>

	<section class="accordion-section">
		<button class="accordion-header" onclick={() => softwareExpanded = !softwareExpanded}>
			<h4>ソフトウェア</h4>
			{#if selectedCount > 0}
				<span class="selected-badge">{selectedCount}</span>
			{/if}
			<svg class="accordion-icon" class:expanded={softwareExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>
		{#if softwareExpanded}
			<div class="accordion-content">
				<div class="software-chips">
					{#each availableRepositories as url}
						<button
							class="software-chip"
							class:selected={filter.repositoryUrls.includes(url)}
							style="--chip-color: {getRepositoryColor(url)}"
							onclick={() => {
								if (filter.repositoryUrls.includes(url)) {
									filter.repositoryUrls = filter.repositoryUrls.filter(u => u !== url);
								} else {
									filter.repositoryUrls = [...filter.repositoryUrls, url];
								}
							}}
						>
							<span class="chip-dot"></span>
							{getRepositoryDisplayName(url)}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<section>
		<h4>規模</h4>
		<div class="scale-buttons">
			{#each scaleOptions as { value, label }}
				<button
					class="scale-btn"
					class:active={filter.scale.includes(value)}
					onclick={() => toggleScale(value)}
				>
					{label}
				</button>
			{/each}
		</div>
	</section>
</aside>

<style>
	.filter-panel {
		padding: 0.875rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.panel-icon {
		width: 18px;
		height: 18px;
		color: var(--accent-500);
	}

	h3 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	h4 {
		margin: 0.75rem 0 0.375rem;
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	section:first-of-type h4 {
		margin-top: 0;
	}

	/* Accordion styles */
	.accordion-section {
		margin-top: 0.625rem;
	}

	.accordion-header {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 0.375rem 0.5rem;
		margin: 0 -0.5rem;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.accordion-header:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.accordion-header h4 {
		margin: 0;
		flex: 1;
		text-align: left;
	}

	.selected-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		margin-right: 0.5rem;
		background: var(--accent-600);
		border-radius: 10px;
		font-size: 0.7rem;
		font-weight: 700;
		color: white;
	}

	.accordion-icon {
		width: 16px;
		height: 16px;
		color: var(--fg-muted);
		transition: transform var(--transition-fast);
		flex-shrink: 0;
	}

	.accordion-icon.expanded {
		transform: rotate(180deg);
	}

	.accordion-content {
		padding-top: 0.5rem;
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Checkbox styles */
	.checkbox-group,
	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.checkbox-label,
	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		margin: 0 -0.5rem;
		cursor: pointer;
		font-size: 0.8rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.checkbox-label:hover,
	.radio-label:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.checkbox-label input,
	.radio-label input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.checkbox-custom,
	.radio-custom {
		width: 18px;
		height: 18px;
		border: 2px solid var(--border-color-hover);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.radio-custom {
		border-radius: 50%;
	}

	.checkbox-label input:checked + .checkbox-custom {
		background: var(--accent-600);
		border-color: var(--accent-600);
	}

	.checkbox-label input:checked + .checkbox-custom::after {
		content: '';
		width: 5px;
		height: 9px;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg) translateY(-1px);
	}

	.radio-label input:checked + .radio-custom {
		border-color: var(--accent-600);
	}

	.radio-label input:checked + .radio-custom::after {
		content: '';
		width: 8px;
		height: 8px;
		background: var(--accent-500);
		border-radius: 50%;
	}

	.checkbox-text,
	.radio-text {
		color: var(--fg-secondary);
		transition: color var(--transition-fast);
	}

	.checkbox-label:hover .checkbox-text,
	.radio-label:hover .radio-text {
		color: var(--fg-primary);
	}

	.checkbox-label input:checked ~ .checkbox-text,
	.radio-label input:checked ~ .radio-text {
		color: var(--fg-primary);
	}

	/* Software chips */
	.software-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.software-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid var(--border-color);
		border-radius: 20px;
		font-size: 0.75rem;
		color: var(--fg-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.software-chip:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--border-color-hover);
	}

	.software-chip.selected {
		background: color-mix(in srgb, var(--chip-color) 20%, transparent);
		border-color: var(--chip-color);
		color: var(--fg-primary);
	}

	.chip-dot {
		width: 8px;
		height: 8px;
		background: var(--chip-color);
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* Scale buttons */
	.scale-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.scale-btn {
		width: 100%;
		padding: 0.375rem 0.625rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		color: var(--fg-secondary);
		text-align: left;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.scale-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--border-color-hover);
	}

	.scale-btn.active {
		background: rgba(134, 179, 0, 0.15);
		border-color: var(--accent-600);
		color: var(--accent-400);
	}
</style>
