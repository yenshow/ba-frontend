<template>
	<div class="flex flex-col gap-3">
		<p v-if="loading" class="text-sm text-white/60">載入權限清單中...</p>
		<template v-else-if="groups.length">
			<div class="overflow-hidden rounded-xl border border-white/15">
				<table class="w-full text-left text-sm text-white/90">
					<thead>
						<tr class="border-b border-white/15 bg-white/5">
							<th class="w-[28%] px-4 py-3 font-medium 2xl:text-base">系統名稱</th>
							<th class="px-4 py-3 font-medium 2xl:text-base">權限設定</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="group in groups"
							:key="group.parent.id"
							class="border-b border-white/10 align-top last:border-b-0"
						>
							<td class="px-4 py-4">
								<label
									class="flex cursor-pointer items-center gap-2 font-medium text-white"
								>
									<input
										type="checkbox"
										class="h-4 w-4 rounded border-white/40"
										:checked="Boolean(modelValue[group.parent.id])"
										:aria-label="`模組進入：${group.parent.name || group.parent.code}`"
										@change="
											handleParentToggle(group.parent.id, ($event.target as HTMLInputElement).checked, group.children)
										"
									/>
									<span>{{ group.parent.name || group.parent.code }}</span>
								</label>
							</td>
							<td class="px-4 py-4">
								<div
									v-if="modelValue[group.parent.id]"
									class="flex flex-wrap gap-x-4 gap-y-2"
								>
									<label
										v-for="item in group.children"
										:key="item.id"
										class="inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-white/10"
									>
										<input
											type="checkbox"
											class="h-4 w-4 rounded border-white/40"
											:checked="Boolean(modelValue[item.id])"
											:aria-label="`${item.name || item.code}`"
											@change="
												handleChildToggle(
													item,
													($event.target as HTMLInputElement).checked
												)
											"
										/>
										<span class="whitespace-nowrap">{{ item.name || item.code }}</span>
									</label>
								</div>
								<p v-else class="text-xs text-white/40">請先勾選模組以設定細項權限</p>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
		<p v-else class="text-sm text-white/50">尚無可設定的模組權限</p>
	</div>
</template>

<script setup lang="ts">
import type { PermissionDefinition } from "~/types/user";
import { usePermissionDefinitionsByCategory } from "~/composables/systems/users/usePermissionDefinitionsByCategory";

const props = defineProps<{
	modelValue: Record<number, boolean>;
	definitions: PermissionDefinition[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: Record<number, boolean>];
}>();

const definitionsRef = toRef(props, "definitions");
const { groups } = usePermissionDefinitionsByCategory(definitionsRef);

const handleParentToggle = (
	parentId: number,
	checked: boolean,
	children: PermissionDefinition[]
) => {
	const next = { ...props.modelValue, [parentId]: checked };
	if (!checked) {
		for (const child of children) {
			next[child.id] = false;
		}
	}
	emit("update:modelValue", next);
};

const handleChildToggle = (item: PermissionDefinition, checked: boolean) => {
	const next = { ...props.modelValue, [item.id]: checked };
	if (checked && item.parent_id != null) {
		next[item.parent_id] = true;
	}
	emit("update:modelValue", next);
};
</script>
