<template>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex min-w-0 items-end gap-2">
			<!-- 地點名稱 -->
			<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
				<span>地點名稱 *</span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：工地A、工地B"
					@blur="handleChange"
				/>
			</label>

			<!-- 入口設備 -->
			<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
				<span>入口設備</span>
				<FilterDropdown
					v-model="entryDoorIdString"
					:options="doorOptions"
					placeholder="無"
					@update:modelValue="handleEntryDoorChange"
				/>
			</label>

			<!-- 出口設備 -->
			<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
				<span>出口設備</span>
				<FilterDropdown
					v-model="exitDoorIdString"
					:options="doorOptions"
					placeholder="無"
					@update:modelValue="handleExitDoorChange"
				/>
			</label>
		</div>

		<!-- 人員群組列表（參考感測器參數列表的設計） -->
		<div class="mt-3 border-t border-white/10 pt-3">
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base">人員群組 *</span>
			</div>

			<!-- 載入中狀態 -->
			<div
				v-if="personGroups.length === 0"
				class="py-2 text-center text-xs text-white/50 2xl:text-sm"
			>
				載入中...
			</div>

			<!-- 人員群組選項（使用網格布局） -->
			<div v-else class="grid grid-cols-2 gap-2">
				<label
					v-for="group in personGroups"
					:key="group.id"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
					:class="{
						'border-cyan-400/50 bg-cyan-500/20': isPersonGroupSelected(group.id)
					}"
				>
					<input
						type="checkbox"
						:checked="isPersonGroupSelected(group.id)"
						@change="togglePersonGroup(group.id)"
						class="h-4 w-4 cursor-pointer accent-cyan-400"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">
						{{ group.name }}
					</span>
				</label>
			</div>

			<!-- 驗證提示 -->
			<p
				v-if="!localLocation.personGroupIds || localLocation.personGroupIds.length === 0"
				class="mt-2 text-xs text-amber-300 2xl:text-sm"
			>
				至少需要選擇一個人員群組
			</p>
		</div>

		<!-- 警告提示 -->
		<div
			v-if="localLocation.entryDoorId && !localLocation.exitDoorId"
			class="mt-3 rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300 2xl:text-sm"
		>
			已設定入口設備，建議同時設定出口設備
		</div>
		<div
			v-if="localLocation.exitDoorId && !localLocation.entryDoorId"
			class="mt-3 rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300 2xl:text-sm"
		>
			已設定出口設備，建議同時設定入口設備
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";
import FilterDropdown from "~/components/common/FilterDropdown.vue";

interface PersonGroup {
	id: number;
	name: string;
	is_deleted?: number;
}

interface Door {
	id: number;
	device_id: number;
	dev_name: string;
	door_index: number;
	is_deleted?: number;
}

interface Props {
	location: PeopleCountingLocation;
	personGroups?: PersonGroup[];
	doors?: Door[];
}

interface Emits {
	(e: "update", location: PeopleCountingLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => []
});

const emit = defineEmits<Emits>();

// 本地副本，用於雙向綁定
const localLocation = ref<PeopleCountingLocation>({ ...props.location });

// 設備 ID 字串（用於 FilterDropdown）- 必須在 watch 之前定義
const entryDoorIdString = ref("");
const exitDoorIdString = ref("");

// 監聽 props.location 變化
watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		// 確保 personGroupIds 陣列存在
		if (!localLocation.value.personGroupIds) {
			localLocation.value.personGroupIds = [];
		}
		// 更新設備 ID 字串（用於 FilterDropdown）
		entryDoorIdString.value = localLocation.value.entryDoorId ? String(localLocation.value.entryDoorId) : "";
		exitDoorIdString.value = localLocation.value.exitDoorId ? String(localLocation.value.exitDoorId) : "";
	},
	{ immediate: true, deep: true }
);

// 門禁設備選項（用於 FilterDropdown）
const doorOptions = computed(() => {
	const options = props.doors.map(door => ({
		value: String(door.id),
		label: door.dev_name
	}));
	// 添加空選項（用於清除選擇）
	return [
		{ value: "", label: "無" },
		...options
	];
});

// 檢查人員群組是否被選中
const isPersonGroupSelected = (groupId: number): boolean => {
	return localLocation.value.personGroupIds?.includes(groupId) || false;
};

// 切換人員群組選中狀態
const togglePersonGroup = (groupId: number) => {
	if (!localLocation.value.personGroupIds) {
		localLocation.value.personGroupIds = [];
	}

	const index = localLocation.value.personGroupIds.indexOf(groupId);
	if (index > -1) {
		// 移除
		localLocation.value.personGroupIds.splice(index, 1);
	} else {
		// 新增
		localLocation.value.personGroupIds.push(groupId);
	}
	handleChange();
};

// 處理入口設備變更
const handleEntryDoorChange = (value: string) => {
	localLocation.value.entryDoorId = value ? Number(value) : undefined;
	handleChange();
};

// 處理出口設備變更
const handleExitDoorChange = (value: string) => {
	localLocation.value.exitDoorId = value ? Number(value) : undefined;
	handleChange();
};

// 處理變更
const handleChange = () => {
	emit("update", { ...localLocation.value });
};
</script>