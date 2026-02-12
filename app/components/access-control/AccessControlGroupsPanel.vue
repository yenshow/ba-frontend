<template>
	<div class="rounded border border-white/10 bg-white/5 p-3">
		<div class="mb-2 flex items-center justify-between">
			<h4 class="text-sm font-medium text-white 2xl:text-base">人員群組（選填）</h4>
			<button type="button" class="btn-secondary text-xs 2xl:text-sm" @click="handleAddGroup">新增群組</button>
		</div>

		<p class="mb-2 text-xs text-white/60">僅能勾選「入口與出口設備皆有」之人員，以利統計一致。</p>

		<div v-if="groups.length === 0" class="py-2 text-xs text-white/50">尚無群組，請先新增群組</div>

		<div v-else class="space-y-3">
			<div v-for="(grp, gIdx) in groups" :key="gIdx" class="rounded border border-white/10 p-2">
				<div class="mb-2 flex items-center gap-2">
					<input
						v-model="grp.name"
						type="text"
						class="form-input-small max-w-[200px]"
						placeholder="群組名稱"
						@blur="emitChange"
					/>
					<button
						type="button"
						class="rounded px-2 py-0.5 text-rose-300 hover:bg-white/10"
						@click="handleRemoveGroup(gIdx)"
					>
						刪除群組
					</button>
				</div>

				<div v-if="personnelInBoth.length === 0" class="text-xs text-white/50">
					請先選擇入口與出口設備並載入人員，僅兩邊皆有之人員可加入群組
				</div>
				<div v-else class="grid grid-cols-2 gap-1 text-xs 2xl:text-sm">
					<label
						v-for="p in personnelInBoth"
						:key="p.employeeNo"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 p-1.5"
						:class="{ 'border-cyan-400/50 bg-cyan-500/20': isInGroup(grp, p.employeeNo!) }"
					>
						<input
							type="checkbox"
							:checked="isInGroup(grp, p.employeeNo!)"
							class="h-3.5 w-3.5 accent-cyan-400"
							@change="toggleMember(gIdx, p.employeeNo!)"
						/>
						<span class="text-white/90">{{ p.employeeNo }} - {{ p.name || "-" }}</span>
					</label>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AccessControlGroup } from "~/types/peopleCounting";
import type { AccessControlUserInfo } from "~/composables/systems/useAccessControlApi";

interface Props {
	groups: AccessControlGroup[];
	entryPersonnel: AccessControlUserInfo[];
	exitPersonnel: AccessControlUserInfo[];
}

interface Emits {
	(e: "update:groups", groups: AccessControlGroup[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const personnelInBoth = computed(() => {
	const exitSet = new Set(props.exitPersonnel.map((p) => p.employeeNo).filter(Boolean));
	return props.entryPersonnel.filter((p) => p.employeeNo && exitSet.has(p.employeeNo));
});

const emitChange = () => {
	emit("update:groups", [...props.groups]);
};

const handleAddGroup = () => {
	emit("update:groups", [...props.groups, { name: "新群組", employeeNos: [] }]);
};

const handleRemoveGroup = (index: number) => {
	const next = [...props.groups];
	next.splice(index, 1);
	emit("update:groups", next);
};

const isInGroup = (grp: AccessControlGroup, employeeNo: string) => {
	return grp.employeeNos?.includes(employeeNo) ?? false;
};

const toggleMember = (groupIndex: number, employeeNo: string) => {
	const next = props.groups.map((g) => ({ ...g, employeeNos: [...(g.employeeNos || [])] }));
	const grp = next[groupIndex];
	if (!grp) return;
	const i = grp.employeeNos.indexOf(employeeNo);
	if (i > -1) grp.employeeNos.splice(i, 1);
	else grp.employeeNos.push(employeeNo);
	emit("update:groups", next);
};
</script>

