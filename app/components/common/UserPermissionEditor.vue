<template>
	<div class="flex flex-col gap-3">
		<p v-if="loading || !isLoaded" class="text-sm text-white/60">載入權限清單中...</p>
		<template v-else-if="groups.length">
			<div class="overflow-hidden rounded-xl border border-white/15">
				<div class="divide-y divide-white/10">
					<section
						v-for="group in groups"
						:key="group.parent.id"
						class="px-4 py-3.5 transition-colors 2xl:px-5 2xl:py-4"
						:class="modelValue[group.parent.id] ? 'bg-white/[0.03]' : ''"
					>
						<div class="flex items-start justify-between gap-3">
							<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
								<input
									type="checkbox"
									class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400"
									:checked="Boolean(modelValue[group.parent.id])"
									:aria-label="`訪問權限：${group.parent.name || group.parent.code}`"
									@change="
										handleParentToggle(
											group.parent.id,
											($event.target as HTMLInputElement).checked,
											group.children
										)
									"
								/>
								<span class="font-medium text-white 2xl:text-base">
									{{ group.parent.name || group.parent.code }}
								</span>
							</label>

							<div
								v-if="group.children.length && modelValue[group.parent.id]"
								class="flex shrink-0 items-center gap-2 text-xs 2xl:text-sm"
							>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-cyan-300/90 transition-opacity hover:text-cyan-200 hover:opacity-90"
									:aria-label="`全選 ${group.parent.name || group.parent.code} 細項權限`"
									@click="handleSelectAllChildren(group)"
								>
									全選
								</button>
								<span class="text-white/20" aria-hidden="true">|</span>
								<button
									type="button"
									class="cursor-pointer border-none bg-transparent text-white/50 transition-opacity hover:text-white/80 hover:opacity-90"
									:aria-label="`清除 ${group.parent.name || group.parent.code} 細項權限`"
									@click="handleDeselectAllChildren(group)"
								>
									清除
								</button>
							</div>
						</div>

						<div
							v-if="group.children.length && modelValue[group.parent.id]"
							class="mt-3 grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2"
							role="group"
							:aria-label="`${group.parent.name || group.parent.code} 細項權限`"
						>
							<label
								v-for="item in group.children"
								:key="item.id"
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors 2xl:gap-2.5 2xl:px-3.5 2xl:py-2.5 2xl:text-base"
								:class="
									modelValue[item.id]
										? 'border-cyan-400/35 bg-cyan-400/10 text-white'
										: 'border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/5'
								"
							>
								<input
									type="checkbox"
									class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400"
									:checked="Boolean(modelValue[item.id])"
									:aria-label="`${item.name || item.code}`"
									@change="handleChildToggle(item, ($event.target as HTMLInputElement).checked)"
								/>
								<span class="min-w-0 leading-snug">{{ item.name || item.code }}</span>
							</label>
						</div>
					</section>
				</div>
			</div>
		</template>
		<p v-else class="text-sm text-white/50">尚無可設定的模組權限</p>
	</div>
</template>

<script setup lang="ts">
import type { PermissionDefinition } from "~/types/user"
import {
	usePermissionDefinitionsByCategory,
	type PermissionModuleGroup,
} from "~/composables/systems/users/usePermissionDefinitionsByCategory"

const props = defineProps<{
	modelValue: Record<number, boolean>
	definitions: PermissionDefinition[]
	loading?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: Record<number, boolean>]
}>()

const definitionsRef = toRef(props, "definitions")
const { groups, isLoaded } = usePermissionDefinitionsByCategory(definitionsRef)

const handleParentToggle = (
	parentId: number,
	checked: boolean,
	children: PermissionDefinition[]
) => {
	const next = { ...props.modelValue, [parentId]: checked }
	if (!checked) {
		for (const child of children) {
			next[child.id] = false
		}
	}
	emit("update:modelValue", next)
}

const handleChildToggle = (item: PermissionDefinition, checked: boolean) => {
	const next = { ...props.modelValue, [item.id]: checked }
	if (checked && item.parent_id != null) {
		next[item.parent_id] = true
	}
	emit("update:modelValue", next)
}

const handleSelectAllChildren = (group: PermissionModuleGroup) => {
	const next = { ...props.modelValue, [group.parent.id]: true }
	for (const child of group.children) {
		next[child.id] = true
	}
	emit("update:modelValue", next)
}

const handleDeselectAllChildren = (group: PermissionModuleGroup) => {
	const next = { ...props.modelValue }
	for (const child of group.children) {
		next[child.id] = false
	}
	emit("update:modelValue", next)
}
</script>
