<template>
	<div class="flex flex-col gap-3">
		<p v-if="loading" class="text-sm text-white/60">載入人員群組中…</p>
		<template v-else-if="groups.length">
			<div class="overflow-hidden rounded-xl border border-white/15">
				<div class="divide-y divide-white/10">
					<section
						v-for="group in groups"
						:key="group.id"
						class="px-4 py-3.5 transition-colors 2xl:px-5 2xl:py-4"
						:class="isGroupSelected(group.id) ? 'bg-white/[0.03]' : ''"
					>
						<div class="flex items-start justify-between gap-3">
							<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
								<input
									type="checkbox"
									class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400"
									:checked="isGroupSelected(group.id)"
									:disabled="disabled"
									:aria-label="`人員群組：${group.name}`"
									@change="
										handleParentToggle(
											group,
											($event.target as HTMLInputElement).checked
										)
									"
								/>
								<span class="font-medium text-white 2xl:text-base">{{ group.name }}</span>
							</label>

							<div
								v-if="group.children?.length && isGroupSelected(group.id)"
								class="flex shrink-0 items-center gap-2 text-xs 2xl:text-sm"
							>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-cyan-300/90 transition-opacity hover:text-cyan-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
									:disabled="disabled"
									:aria-label="`全選 ${group.name} 子群組`"
									@click="handleSelectAllChildren(group)"
								>
									全選
								</button>
								<span class="text-white/20" aria-hidden="true">|</span>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-white/50 transition-opacity hover:text-white/80 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
									:disabled="disabled"
									:aria-label="`清除 ${group.name} 子群組`"
									@click="handleDeselectAllChildren(group)"
								>
									清除
								</button>
							</div>
						</div>

						<div
							v-if="group.children?.length && isGroupSelected(group.id)"
							class="mt-3 grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2"
							role="group"
							:aria-label="`${group.name} 子群組`"
						>
							<label
								v-for="child in group.children"
								:key="child.id"
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors 2xl:gap-2.5 2xl:px-3.5 2xl:py-2.5 2xl:text-base"
								:class="
									isGroupSelected(child.id)
										? 'border-cyan-400/35 bg-cyan-400/10 text-white'
										: 'border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/5'
								"
							>
								<input
									type="checkbox"
									class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400"
									:checked="isGroupSelected(child.id)"
									:disabled="disabled"
									:aria-label="child.name"
									@change="
										handleChildToggle(
											group,
											child.id,
											($event.target as HTMLInputElement).checked
										)
									"
								/>
								<span class="min-w-0 leading-snug">{{ child.name }}</span>
							</label>
						</div>
					</section>
				</div>
			</div>
		</template>
		<p v-else class="text-sm text-white/50">尚無人員群組</p>
	</div>
</template>

<script setup lang="ts">
import type { PersonGroup } from "~/types/personnel"

const props = defineProps<{
	modelValue: number[]
	groups: PersonGroup[]
	loading?: boolean
	disabled?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: number[]]
}>()

const isGroupSelected = (id: number) => props.modelValue.includes(id)

const emitNext = (next: Set<number>) => {
	emit("update:modelValue", [...next])
}

const handleParentToggle = (group: PersonGroup, checked: boolean) => {
	const next = new Set(props.modelValue)
	if (checked) {
		next.add(group.id)
	} else {
		next.delete(group.id)
		for (const child of group.children || []) {
			next.delete(child.id)
		}
	}
	emitNext(next)
}

const handleChildToggle = (group: PersonGroup, childId: number, checked: boolean) => {
	const next = new Set(props.modelValue)
	if (checked) {
		next.add(childId)
		next.add(group.id)
	} else {
		next.delete(childId)
	}
	emitNext(next)
}

const handleSelectAllChildren = (group: PersonGroup) => {
	const next = new Set(props.modelValue)
	next.add(group.id)
	for (const child of group.children || []) {
		next.add(child.id)
	}
	emitNext(next)
}

const handleDeselectAllChildren = (group: PersonGroup) => {
	const next = new Set(props.modelValue)
	for (const child of group.children || []) {
		next.delete(child.id)
	}
	emitNext(next)
}
</script>
