<template>
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- 資料來源 -->
		<div class="mb-3">
			<span class="text-sm font-medium text-white/80 2xl:text-base">資料來源</span>
			<div class="mt-2 flex gap-4">
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="yscp"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">YSCP 資料庫（出入口設備）</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="access_control"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">門禁設備（本系統）</span>
				</label>
			</div>
		</div>

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

			<!-- YSCP：入口／出口設備 -->
			<template v-if="dataSource === 'yscp'">
				<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
					<span>入口設備</span>
					<FilterDropdown
						v-model="entryDoorIdString"
						:options="doorOptions"
						placeholder="無"
						@update:modelValue="(v: string) => setEntryExit('entry', v)"
					/>
				</label>
				<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
					<span>出口設備</span>
					<FilterDropdown
						v-model="exitDoorIdString"
						:options="doorOptions"
						placeholder="無"
						@update:modelValue="(v: string) => setEntryExit('exit', v)"
					/>
				</label>
			</template>

			<!-- 門禁設備：入口／出口設備（本系統） -->
			<template v-else>
				<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
					<span>入口設備 *</span>
					<FilterDropdown
						v-model="entryDeviceIdString"
						:options="accessControlDeviceOptions"
						:placeholder="accessControlDevices.length === 0 ? '請先在設備管理新增門禁設備' : '請選擇'"
						@update:modelValue="(v: string) => setEntryExit('entry', v)"
					/>
				</label>
				<label class="flex flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base min-w-0">
					<span>出口設備</span>
					<FilterDropdown
						v-model="exitDeviceIdString"
						:options="accessControlDeviceOptions"
						placeholder="無"
						@update:modelValue="(v: string) => setEntryExit('exit', v)"
					/>
				</label>
			</template>
		</div>

		<!-- 人員群組（僅 YSCP 使用；門禁設備之人員與權限改由「人員管理」處理） -->
		<div class="mt-3 border-t border-white/10 pt-3">
			<template v-if="dataSource === 'yscp'">
				<div class="mb-3">
					<span class="text-sm font-medium text-white/80 2xl:text-base">人員群組 *</span>
				</div>
				<div
					v-if="personGroups.length === 0"
					class="py-2 text-center text-xs text-white/50 2xl:text-sm"
				>
					載入中...
				</div>
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
						<span class="text-xs text-white/90 2xl:text-sm">{{ group.name }}</span>
					</label>
				</div>
				<p
					v-if="(!localLocation.personGroupIds || localLocation.personGroupIds.length === 0) && personGroups.length > 0"
					class="mt-2 text-xs text-amber-300 2xl:text-sm"
				>
					至少需要選擇一個人員群組
				</p>
			</template>
			<template v-else>
				<!-- 門禁設備（本系統）：人員與可進出權限改由「人員管理」設定與同步，此地點僅綁定入口／出口設備；事件由後端佈防訂閱 -->
				<div class="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100/90 2xl:text-base">
					<p class="font-medium">人員與門禁權限由「人員管理」處理</p>
					<p class="mt-1 text-white/70">
						此地點僅需綁定上方入口／出口設備。人員的新增、群組與「可進出此地點」的權限請至<strong>「人員管理」</strong>設定，並使用「設備同步」將人員寫入門禁設備。門禁事件由後端自動訂閱，不需在門禁機上設定事件監聽主機。
					</p>
				</div>
			</template>
		</div>

		<!-- 警告提示 -->
		<template v-if="dataSource === 'yscp'">
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
		</template>
		<template v-else>
			<div
				v-if="localLocation.entryDeviceId && localLocation.exitDeviceId && localLocation.entryDeviceId === localLocation.exitDeviceId"
				class="mt-3 rounded border border-amber-500/50 bg-amber-500/20 p-2 text-xs text-amber-300 2xl:text-sm"
			>
				入口與出口請勿選擇同一設備
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";
import type { Device } from "~/types/device";
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
	accessControlDevices?: Device[];
}

interface Emits {
	(e: "update", location: PeopleCountingLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
});

const emit = defineEmits<Emits>();

const localLocation = ref<PeopleCountingLocation>({ ...props.location });

const dataSource = ref<"yscp" | "access_control">(
	(props.location.dataSource as "yscp" | "access_control") || "yscp"
);

const entryDoorIdString = ref("");
const exitDoorIdString = ref("");
const entryDeviceIdString = ref("");
const exitDeviceIdString = ref("");

watch(
	() => props.location,
	(newLocation) => {
		localLocation.value = { ...newLocation };
		if (!localLocation.value.personGroupIds) localLocation.value.personGroupIds = [];
		dataSource.value = (newLocation.dataSource as "yscp" | "access_control") || "yscp";
		entryDoorIdString.value = newLocation.entryDoorId ? String(newLocation.entryDoorId) : "";
		exitDoorIdString.value = newLocation.exitDoorId ? String(newLocation.exitDoorId) : "";
		entryDeviceIdString.value = newLocation.entryDeviceId ? String(newLocation.entryDeviceId) : "";
		exitDeviceIdString.value = newLocation.exitDeviceId ? String(newLocation.exitDeviceId) : "";
	},
	{ immediate: true, deep: true }
);

const doorOptions = computed(() => {
	const options = props.doors.map((door) => ({
		value: String(door.id),
		label: door.dev_name,
	}));
	return [{ value: "", label: "無" }, ...options];
});

const accessControlDeviceOptions = computed(() => {
	const options = props.accessControlDevices.map((d) => ({
		value: String(d.id),
		label: d.name,
	}));
	return [{ value: "", label: "無" }, ...options];
});

const isPersonGroupSelected = (groupId: number): boolean => {
	return localLocation.value.personGroupIds?.includes(groupId) || false;
};

const togglePersonGroup = (groupId: number) => {
	if (!localLocation.value.personGroupIds) {
		localLocation.value.personGroupIds = [];
	}
	const index = localLocation.value.personGroupIds.indexOf(groupId);
	if (index > -1) {
		localLocation.value.personGroupIds.splice(index, 1);
	} else {
		localLocation.value.personGroupIds.push(groupId);
	}
	handleChange();
};

const handleDataSourceChange = () => {
	localLocation.value.dataSource = dataSource.value;
	if (dataSource.value === "access_control") {
		localLocation.value.entryDoorId = undefined;
		localLocation.value.exitDoorId = undefined;
		localLocation.value.entryDeviceId = entryDeviceIdString.value ? Number(entryDeviceIdString.value) : undefined;
		localLocation.value.exitDeviceId = exitDeviceIdString.value ? Number(exitDeviceIdString.value) : undefined;
	} else {
		localLocation.value.entryDeviceId = undefined;
		localLocation.value.exitDeviceId = undefined;
		localLocation.value.entryDoorId = entryDoorIdString.value ? Number(entryDoorIdString.value) : undefined;
		localLocation.value.exitDoorId = exitDoorIdString.value ? Number(exitDoorIdString.value) : undefined;
	}
	handleChange();
};

const setEntryExit = (role: "entry" | "exit", value: string) => {
	const num = value ? Number(value) : undefined;
	if (dataSource.value === "access_control") {
		if (role === "entry") localLocation.value.entryDeviceId = num;
		else localLocation.value.exitDeviceId = num;
	} else {
		if (role === "entry") localLocation.value.entryDoorId = num;
		else localLocation.value.exitDoorId = num;
	}
	handleChange();
};

const handleChange = () => {
	emit("update", { ...localLocation.value });
};
</script>