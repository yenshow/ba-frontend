<template>
	<div class="flex min-w-0 flex-1 flex-col gap-3">
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
		</div>

		<!-- personGroupIds -->
		<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>人員群組 ID 列表 *</span>
			<div class="flex flex-wrap gap-2">
				<div
					v-for="(groupId, index) in localLocation.personGroupIds"
					:key="index"
					class="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-1 transition-colors hover:bg-white/10"
				>
					<input
						v-model.number="localLocation.personGroupIds[index]"
						type="number"
						min="1"
						class="form-input-small w-20"
						placeholder="ID"
						@blur="handleChange"
					/>
					<button
						type="button"
						class="p-1 text-rose-400 transition-colors hover:text-rose-300"
						@click="removePersonGroupId(index)"
						title="移除"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<button
					type="button"
					class="btn-secondary text-sm 2xl:text-base"
					@click="addPersonGroupId"
					title="新增人員群組 ID"
				>
					+ 新增
				</button>
			</div>
			<p v-if="!localLocation.personGroupIds || localLocation.personGroupIds.length === 0" class="text-xs text-amber-300">
				至少需要一個人員群組 ID
			</p>
		</label>

		<!-- 入口設備 ID -->
		<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>入口設備 ID</span>
			<input
				v-model.number="localLocation.entryDoorId"
				type="number"
				min="1"
				class="form-input-small"
				placeholder="選填"
				@blur="handleChange"
			/>
		</label>

		<!-- 出口設備 ID -->
		<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>出口設備 ID</span>
			<input
				v-model.number="localLocation.exitDoorId"
				type="number"
				min="1"
				class="form-input-small"
				placeholder="選填"
				@blur="handleChange"
			/>
		</label>

		<!-- 警告提示 -->
		<div
			v-if="localLocation.entryDoorId && !localLocation.exitDoorId"
			class="rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300"
		>
			已設定入口設備，建議同時設定出口設備
		</div>
		<div
			v-if="localLocation.exitDoorId && !localLocation.entryDoorId"
			class="rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300"
		>
			已設定出口設備，建議同時設定入口設備
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";

interface Props {
	location: PeopleCountingLocation;
}

interface Emits {
	(e: "update", location: PeopleCountingLocation): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 本地副本，用於雙向綁定
const localLocation = ref<PeopleCountingLocation>({ ...props.location });

// 監聽 props.location 變化
watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		// 確保 personGroupIds 陣列存在
		if (!localLocation.value.personGroupIds) {
			localLocation.value.personGroupIds = [];
		}
	},
	{ immediate: true, deep: true }
);

// 處理變更
const handleChange = () => {
	emit("update", { ...localLocation.value });
};

// 新增人員群組 ID
const addPersonGroupId = () => {
	if (!localLocation.value.personGroupIds) {
		localLocation.value.personGroupIds = [];
	}
	localLocation.value.personGroupIds.push(0);
	handleChange();
};

// 移除人員群組 ID
const removePersonGroupId = (index: number) => {
	if (localLocation.value.personGroupIds && localLocation.value.personGroupIds.length > index) {
		localLocation.value.personGroupIds.splice(index, 1);
		handleChange();
	}
};
</script>