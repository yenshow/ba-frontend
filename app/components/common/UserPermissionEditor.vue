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

						:class="isExpanded(group.parent.id) ? 'bg-white/[0.03]' : ''"

					>

						<div class="flex items-start justify-between gap-3">

							<div class="flex min-w-0 flex-1 items-center gap-2">

								<button

									v-if="group.children.length"

									type="button"

									class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-white/60 transition-colors hover:bg-white/10 hover:text-white"

									:aria-expanded="isExpanded(group.parent.id)"

									:aria-label="`${isExpanded(group.parent.id) ? '收合' : '展開'}${group.parent.name || group.parent.code}細項`"

									@click="toggleExpanded(group.parent.id)"

								>

									<svg

										class="h-4 w-4 transition-transform"

										:class="isExpanded(group.parent.id) ? 'rotate-90' : ''"

										viewBox="0 0 24 24"

										fill="none"

										stroke="currentColor"

										aria-hidden="true"

									>

										<path

											stroke-linecap="round"

											stroke-linejoin="round"

											stroke-width="2"

											d="M9 5l7 7-7 7"

										/>

									</svg>

								</button>

								<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">

									<input

										:ref="(el) => setParentCheckboxRef(group.parent.id, el)"

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

							</div>



							<div

								v-if="group.children.length && isExpanded(group.parent.id)"

								class="flex shrink-0 items-center gap-2 text-xs 2xl:text-sm"

							>

								<button

									type="button"

									class="cursor-pointer border-none bg-transparent text-cyan-300/90 transition-opacity hover:text-cyan-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"

									:disabled="!modelValue[group.parent.id]"

									:aria-label="`全選 ${group.parent.name || group.parent.code} 細項權限`"

									@click="handleSelectAllChildren(group)"

								>

									全選

								</button>

								<span class="text-white/20" aria-hidden="true">|</span>

								<button

									type="button"

									class="cursor-pointer border-none bg-transparent text-white/50 transition-opacity hover:text-white/80 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"

									:disabled="!modelValue[group.parent.id]"

									:aria-label="`清除 ${group.parent.name || group.parent.code} 細項權限`"

									@click="handleDeselectAllChildren(group)"

								>

									清除

								</button>

							</div>

						</div>



						<div

							v-if="group.children.length && isExpanded(group.parent.id)"

							class="mt-3 grid grid-cols-1 gap-2 pl-9 sm:grid-cols-2"

							role="group"

							:aria-label="`${group.parent.name || group.parent.code} 細項權限`"

						>

							<label

								v-for="item in group.children"

								:key="item.id"

								class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors 2xl:gap-2.5 2xl:px-3.5 2xl:py-2.5 2xl:text-base"

								:class="[

									modelValue[item.id]

										? 'border-cyan-400/35 bg-cyan-400/10 text-white'

										: 'border-white/10 bg-white/[0.02] text-white/80 hover:border-white/20 hover:bg-white/5',

									modelValue[group.parent.id]

										? 'cursor-pointer'

										: 'cursor-not-allowed opacity-60',

								]"

							>

								<input

									type="checkbox"

									class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400 disabled:cursor-not-allowed"

									:checked="Boolean(modelValue[item.id])"

									:disabled="!modelValue[group.parent.id]"

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

import type { ComponentPublicInstance } from "vue"

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



const expandedParentIds = ref<Set<number>>(new Set())

const parentCheckboxRefs = ref<Record<number, HTMLInputElement | null>>({})



const isExpanded = (parentId: number) => expandedParentIds.value.has(parentId)



const toggleExpanded = (parentId: number) => {

	const next = new Set(expandedParentIds.value)

	if (next.has(parentId)) next.delete(parentId)

	else next.add(parentId)

	expandedParentIds.value = next

}



const setParentCheckboxRef = (

	parentId: number,

	el: Element | ComponentPublicInstance | null

) => {

	parentCheckboxRefs.value[parentId] = el instanceof HTMLInputElement ? el : null

}



const syncParentIndeterminate = () => {

	for (const group of groups.value) {

		const el = parentCheckboxRefs.value[group.parent.id]

		if (!el || group.children.length === 0) continue

		const checkedCount = group.children.filter((child) => props.modelValue[child.id]).length

		el.indeterminate = checkedCount > 0 && checkedCount < group.children.length

	}

}



const seedExpandedFromModel = () => {

	const next = new Set(expandedParentIds.value)

	for (const group of groups.value) {

		const hasGrant =

			props.modelValue[group.parent.id] ||

			group.children.some((child) => props.modelValue[child.id])

		if (hasGrant) next.add(group.parent.id)

	}

	expandedParentIds.value = next

}



watch(

	[groups, () => props.modelValue],

	() => {

		seedExpandedFromModel()

		syncParentIndeterminate()

	},

	{ deep: true, immediate: true, flush: "post" },

)



const handleParentToggle = (

	parentId: number,

	checked: boolean,

	children: PermissionDefinition[]

) => {

	const next = { ...props.modelValue, [parentId]: checked }

	if (checked) {

		expandedParentIds.value = new Set(expandedParentIds.value).add(parentId)

	} else {

		for (const child of children) {

			next[child.id] = false

		}

	}

	emit("update:modelValue", next)

}



const handleChildToggle = (item: PermissionDefinition, checked: boolean) => {

	if (item.parent_id != null && !props.modelValue[item.parent_id]) return

	const next = { ...props.modelValue, [item.id]: checked }

	if (checked && item.parent_id != null) {

		next[item.parent_id] = true

		expandedParentIds.value = new Set(expandedParentIds.value).add(item.parent_id)

	}

	emit("update:modelValue", next)

}



const handleSelectAllChildren = (group: PermissionModuleGroup) => {

	if (!props.modelValue[group.parent.id]) return

	const next = { ...props.modelValue, [group.parent.id]: true }

	for (const child of group.children) {

		next[child.id] = true

	}

	emit("update:modelValue", next)

}



const handleDeselectAllChildren = (group: PermissionModuleGroup) => {

	if (!props.modelValue[group.parent.id]) return

	const next = { ...props.modelValue }

	for (const child of group.children) {

		next[child.id] = false

	}

	emit("update:modelValue", next)

}

</script>

