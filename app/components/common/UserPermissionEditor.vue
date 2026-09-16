<template>
	<div class="flex flex-col gap-3">
		<p v-if="loading || !isLoaded" class="text-sm text-white/60">載入權限清單中...</p>
		<template v-else-if="groups.length">
			<div
				class="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-white/15 md:min-h-[320px] md:flex-row"
			>
				<nav
					class="flex max-h-[40vh] w-full shrink-0 flex-col overflow-y-auto border-b border-white/10 md:max-h-none md:w-[42%] md:border-b-0 md:border-r"
					aria-label="功能模組清單"
				>
					<div
						v-for="group in groups"
						:key="group.parent.id"
						class="flex w-full items-center gap-2.5 px-3 py-2.5 transition-colors 2xl:gap-3 2xl:px-4 2xl:py-3"
						:class="
							selectedParentId === group.parent.id
								? 'bg-cyan-400/15 text-white'
								: 'text-white/85 hover:bg-white/5'
						"
					>
						<input
							:ref="(el) => setParentCheckboxRef(group.parent.id, el)"
							type="checkbox"
							class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400"
							:checked="Boolean(modelValue[group.parent.id])"
							:aria-label="`訪問權限：${moduleLabel(group.parent)}`"
							@change="
								handleParentToggle(
									group.parent.id,
									($event.target as HTMLInputElement).checked,
									group.children
								)
							"
						/>
						<button
							type="button"
							class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-inherit"
							:aria-current="selectedParentId === group.parent.id ? 'true' : undefined"
							:aria-label="`選擇模組 ${moduleLabel(group.parent)}`"
							@click="handleSelectModule(group.parent.id)"
						>
							<span class="min-w-0 flex-1 truncate text-sm font-medium 2xl:text-base">
								{{ moduleLabel(group.parent) }}
							</span>
							<span
								class="shrink-0 rounded-md px-1.5 py-0.5 text-xs tabular-nums 2xl:text-sm"
								:class="childCountClass(group)"
								:aria-label="`${moduleLabel(group.parent)} 已選 ${childCheckedCount(group)} / ${group.children.length}`"
							>
								{{ childCheckedCount(group) }}/{{ group.children.length }}
							</span>
						</button>
					</div>
				</nav>

				<section
					v-if="selectedGroup"
					class="flex min-h-0 min-w-0 flex-1 flex-col bg-white/[0.02]"
					:aria-label="`${moduleLabel(selectedGroup.parent)} 細項權限`"
				>
					<header
						class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 2xl:px-5 2xl:py-3.5"
					>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-white 2xl:text-base">
								{{ moduleLabel(selectedGroup.parent) }}
							</p>
							<p class="mt-0.5 text-xs text-white/50 2xl:text-sm">
								<template v-if="!modelValue[selectedGroup.parent.id]">
									請先啟用左側訪問權限
								</template>
								<template v-else>
									已選 {{ childCheckedCount(selectedGroup) }} /
									{{ selectedGroup.children.length }} 項
								</template>
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2 text-xs 2xl:text-sm">
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-cyan-300/90 transition-opacity hover:text-cyan-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
								:disabled="!modelValue[selectedGroup.parent.id]"
								:aria-label="`全選 ${moduleLabel(selectedGroup.parent)} 細項權限`"
								@click="handleSelectAllChildren(selectedGroup)"
							>
								全選
							</button>
							<span class="text-white/20" aria-hidden="true">|</span>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-white/50 transition-opacity hover:text-white/80 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
								:disabled="!modelValue[selectedGroup.parent.id]"
								:aria-label="`清除 ${moduleLabel(selectedGroup.parent)} 細項權限`"
								@click="handleDeselectAllChildren(selectedGroup)"
							>
								清除
							</button>
						</div>
					</header>

					<div class="flex-1 overflow-y-auto p-3 2xl:p-4" role="group">
						<label
							v-for="item in selectedGroup.children"
							:key="item.id"
							class="mb-1.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors last:mb-0 2xl:gap-3 2xl:px-3.5 2xl:py-3 2xl:text-base"
							:class="[
								modelValue[item.id]
									? 'bg-cyan-400/10 text-white'
									: 'text-white/80 hover:bg-white/5',
								modelValue[selectedGroup.parent.id]
									? 'cursor-pointer'
									: 'cursor-not-allowed opacity-55',
							]"
						>
							<input
								type="checkbox"
								class="h-4 w-4 shrink-0 cursor-pointer rounded border-white/40 accent-cyan-400 disabled:cursor-not-allowed"
								:checked="Boolean(modelValue[item.id])"
								:disabled="!modelValue[selectedGroup.parent.id]"
								:aria-label="moduleLabel(item)"
								@change="
									handleChildToggle(item, ($event.target as HTMLInputElement).checked)
								"
							/>
							<span class="min-w-0 leading-snug">{{ moduleLabel(item) }}</span>
						</label>
					</div>
				</section>
			</div>
		</template>
		<p v-else class="text-sm text-white/50">尚無可設定的模組權限</p>
	</div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { PermissionDefinition } from "~/types/user";
import {
	usePermissionDefinitionsByCategory,
	type PermissionModuleGroup,
} from "~/composables/systems/users/usePermissionDefinitionsByCategory";

const props = defineProps<{
	modelValue: Record<number, boolean>;
	definitions: PermissionDefinition[];
	loading?: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: Record<number, boolean>];
}>();

const definitionsRef = toRef(props, "definitions");
const { groups, isLoaded } = usePermissionDefinitionsByCategory(definitionsRef);

const selectedParentId = ref<number | null>(null);
const parentCheckboxRefs = ref<Record<number, HTMLInputElement | null>>({});

const moduleLabel = (item: Pick<PermissionDefinition, "name" | "code">) =>
	item.name || item.code;

const selectedGroup = computed(
	() => groups.value.find(g => g.parent.id === selectedParentId.value) ?? null
);

const childCheckedCount = (group: PermissionModuleGroup) =>
	group.children.filter(child => props.modelValue[child.id]).length;

const childCountClass = (group: PermissionModuleGroup) => {
	const checked = childCheckedCount(group);
	if (checked === 0) return "bg-white/5 text-white/40";
	if (checked === group.children.length) return "bg-cyan-400/20 text-cyan-200";
	return "bg-amber-400/15 text-amber-200/90";
};

const handleSelectModule = (parentId: number) => {
	selectedParentId.value = parentId;
};

const setParentCheckboxRef = (
	parentId: number,
	el: Element | ComponentPublicInstance | null
) => {
	parentCheckboxRefs.value[parentId] = el instanceof HTMLInputElement ? el : null;
};

const syncParentIndeterminate = () => {
	for (const group of groups.value) {
		const el = parentCheckboxRefs.value[group.parent.id];
		if (!el) continue;
		const checkedCount = childCheckedCount(group);
		el.indeterminate = checkedCount > 0 && checkedCount < group.children.length;
	}
};

const ensureSelectedModule = () => {
	if (!groups.value.length) {
		selectedParentId.value = null;
		return;
	}
	const stillValid = groups.value.some(g => g.parent.id === selectedParentId.value);
	if (stillValid) return;

	const firstGranted = groups.value.find(
		g => props.modelValue[g.parent.id] || g.children.some(c => props.modelValue[c.id])
	);
	selectedParentId.value = (firstGranted ?? groups.value[0]).parent.id;
};

watch(
	[groups, () => props.modelValue],
	() => {
		ensureSelectedModule();
		syncParentIndeterminate();
	},
	{ deep: true, immediate: true, flush: "post" }
);

const handleParentToggle = (
	parentId: number,
	checked: boolean,
	children: PermissionDefinition[]
) => {
	selectedParentId.value = parentId;
	const next = { ...props.modelValue, [parentId]: checked };
	if (!checked) {
		for (const child of children) next[child.id] = false;
	}
	emit("update:modelValue", next);
};

const handleChildToggle = (item: PermissionDefinition, checked: boolean) => {
	if (item.parent_id != null && !props.modelValue[item.parent_id]) return;
	const next = { ...props.modelValue, [item.id]: checked };
	if (checked && item.parent_id != null) {
		next[item.parent_id] = true;
		selectedParentId.value = item.parent_id;
	}
	emit("update:modelValue", next);
};

const handleSelectAllChildren = (group: PermissionModuleGroup) => {
	if (!props.modelValue[group.parent.id]) return;
	const next = { ...props.modelValue, [group.parent.id]: true };
	for (const child of group.children) next[child.id] = true;
	emit("update:modelValue", next);
};

const handleDeselectAllChildren = (group: PermissionModuleGroup) => {
	if (!props.modelValue[group.parent.id]) return;
	const next = { ...props.modelValue };
	for (const child of group.children) next[child.id] = false;
	emit("update:modelValue", next);
};
</script>
