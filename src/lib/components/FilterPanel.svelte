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

	function handleSoftwareChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const selected: string[] = [];
		for (const option of select.selectedOptions) {
			selected.push(option.value);
		}
		filter.repositoryUrls = selected;
	}
</script>

<aside class="filter-panel">
	<h3>フィルター</h3>

	<section>
		<h4>登録要件</h4>
		<label>
			<input type="checkbox" bind:checked={filter.registrationOpen} />
			登録受付中のみ
		</label>
		<label>
			<input type="checkbox" bind:checked={filter.emailNotRequired} />
			メアド不要
		</label>
		<label>
			<input type="checkbox" bind:checked={filter.approvalRequired} />
			承認制
		</label>
		<label>
			<input type="checkbox" bind:checked={filter.inviteOnly} />
			招待制
		</label>
	</section>

	<section>
		<h4>年齢制限</h4>
		<label>
			<input
				type="radio"
				name="age"
				checked={filter.ageRestriction === null}
				onchange={() => (filter.ageRestriction = null)}
			/>
			すべて
		</label>
		<label>
			<input
				type="radio"
				name="age"
				checked={filter.ageRestriction === 'all'}
				onchange={() => (filter.ageRestriction = 'all')}
			/>
			全年齢
		</label>
		<label>
			<input
				type="radio"
				name="age"
				checked={filter.ageRestriction === '13+'}
				onchange={() => (filter.ageRestriction = '13+')}
			/>
			13歳以上
		</label>
		<label>
			<input
				type="radio"
				name="age"
				checked={filter.ageRestriction === '18+'}
				onchange={() => (filter.ageRestriction = '18+')}
			/>
			18+
		</label>
	</section>

	<section>
		<h4>ソフトウェア</h4>
		<select
			multiple
			class="software-select"
			onchange={handleSoftwareChange}
		>
			{#each availableRepositories as url}
				<option
					value={url}
					selected={filter.repositoryUrls.includes(url)}
					style="background: {getRepositoryColor(url)}; color: #fff;"
				>
					{getRepositoryDisplayName(url)}
				</option>
			{/each}
		</select>
		<span class="select-hint">Ctrl+クリックで複数選択</span>
	</section>

	<section>
		<h4>規模</h4>
		{#each scaleOptions as { value, label }}
			<label>
				<input
					type="checkbox"
					checked={filter.scale.includes(value)}
					onchange={() => toggleScale(value)}
				/>
				{label}
			</label>
		{/each}
	</section>
</aside>

<style>
	.filter-panel {
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 8px;
		min-width: 200px;
	}

	h3 {
		margin: 0 0 1rem;
		font-size: 1.1rem;
	}

	h4 {
		margin: 1rem 0 0.5rem;
		font-size: 0.9rem;
		color: #666;
	}

	section:first-of-type h4 {
		margin-top: 0;
	}

	label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		cursor: pointer;
		font-size: 0.9rem;
	}

	input[type='checkbox'],
	input[type='radio'] {
		cursor: pointer;
	}

	.software-select {
		width: 100%;
		min-height: 100px;
		max-height: 150px;
		padding: 0.25rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.2);
		color: #fff;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.software-select option {
		padding: 0.35rem 0.5rem;
		border-radius: 3px;
		margin: 1px 0;
	}

	.software-select option:checked {
		background: linear-gradient(0deg, rgba(134, 179, 0, 0.8), rgba(134, 179, 0, 0.8)) !important;
	}

	.select-hint {
		display: block;
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 0.25rem;
	}
</style>
