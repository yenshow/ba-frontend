<template>
	<div class="flex flex-col gap-3">
		<p v-if="loading" class="text-sm text-white/60">載入權限清單中...</p>
		<template v-else-if="groups.length">
			<section
				v-for="group in groups"
				:key="group.key"
				class="rounded-xl border border-white/15 bg-white/5 p-4"
			>
				<h4 class="mb-3 text-sm font-medium text-white/90">{{ group.label }}</h4>
				<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<li v-for="item in group.items" :key="item.id">
						<label
							class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/85 hover:bg-white/10"
						>
							<input
								type="checkbox"
								class="h-4 w-4 rounded border-white/40"
								:checked="Boolean(modelValue[item.id])"
								:aria-label="`允許進入：${item.name || item.code}`"
								@change="handleToggle(item.id, ($event.target as HTMLInputElement).checked)"
							/>
							<span>{{ item.name || item.code }}</span>
						</label>
					</li>
				</ul>
			</section>
		</template>
		<p v-else class="text-sm text-white/50">尚無可設定的模組權限</p>
	</div>
</template>

<script setup lang="ts">
import type { PermissionDefinition } from "~/types/user"
import { usePermissionDefinitionsByCategory } from "~/composables/systems/users/usePermissionDefinitionsByCategory"

const props = defineProps<{
	modelValue: Record<number, boolean>
	definitions: PermissionDefinition[]
	loading?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: Record<number, boolean>]
}>()

const definitionsRef = toRef(props, "definitions")
const { groups } = usePermissionDefinitionsByCategory(definitionsRef)

const handleToggle = (permissionId: number, checked: boolean) => {
	emit("update:modelValue", {
		...props.modelValue,
		[permissionId]: checked,
	})
}
</script>
