<template>
	<div class="flex min-w-0 flex-1 flex-col gap-3">
		<!-- 基本資訊 -->
		<div class="flex min-w-0 flex-col gap-3">
			<label :class="fieldLabelClass">
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

			<span class="text-sm font-medium text-white/80 2xl:text-base">資料來源 *</span>
			<div class="flex flex-wrap gap-4">
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
					<span class="text-sm text-white/90 2xl:text-base">門禁設備</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="isapi_camera"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">攝影機人流（ISAPI PeopleCounting）</span>
				</label>
			</div>
		</div>

		<!-- YSCP：入口／出口設備 -->
		<template v-if="dataSource === 'yscp'">
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<div :class="fieldLabelClass">
					<span>入口設備（可複選）*</span>
					<div v-if="props.doors.length === 0" :class="emptyHintClass">無可用門設備</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="door in props.doors"
							:key="`entry-${door.id}`"
							:class="[
								selectCardBaseClass,
								isDoorSelected('entry', door.id) && selectCardSelectedClass,
								isDoorOverlapped(door.id) && selectCardOverlapClass
							]"
						>
							<div
								v-if="isDoorOverlapped(door.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isDoorSelected('entry', door.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleDoor('entry', door.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ door.dev_name }}</span>
						</label>
					</div>
				</div>

				<div :class="fieldLabelClass">
					<span>出口設備（可複選）*</span>
					<div v-if="props.doors.length === 0" :class="emptyHintClass">無可用門設備</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="door in props.doors"
							:key="`exit-${door.id}`"
							:class="[
								selectCardBaseClass,
								isDoorSelected('exit', door.id) && selectCardSelectedClass,
								isDoorOverlapped(door.id) && selectCardOverlapClass
							]"
						>
							<div
								v-if="isDoorOverlapped(door.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isDoorSelected('exit', door.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleDoor('exit', door.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ door.dev_name }}</span>
						</label>
					</div>
					<p v-if="props.doors.length > 0 && !hasExitSelected" :class="warnHintClass">
						至少需要選擇一個出口設備
					</p>
				</div>
			</div>
		</template>

		<!-- 門禁設備：入口／出口設備（本系統） -->
		<template v-else-if="dataSource === 'access_control'">
			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<div :class="fieldLabelClass">
					<span>入口設備（可複選）*</span>
					<div v-if="props.accessControlDevices.length === 0" :class="emptyHintClass">
						請先在設備管理新增門禁設備
					</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="dev in props.accessControlDevices"
							:key="`ac-entry-${dev.id}`"
							:class="[
								selectCardBaseClass,
								isAccessControlSelected('entry', dev.id) && selectCardSelectedClass,
								isAccessControlOverlapped(dev.id) && selectCardOverlapClass
							]"
						>
							<div
								v-if="isAccessControlOverlapped(dev.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isAccessControlSelected('entry', dev.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleAccessControl('entry', dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
				</div>

				<div :class="fieldLabelClass">
					<span>出口設備（可複選）*</span>
					<div v-if="props.accessControlDevices.length === 0" :class="emptyHintClass">
						請先在設備管理新增門禁設備
					</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="dev in props.accessControlDevices"
							:key="`ac-exit-${dev.id}`"
							:class="[
								selectCardBaseClass,
								isAccessControlSelected('exit', dev.id) && selectCardSelectedClass,
								isAccessControlOverlapped(dev.id) && selectCardOverlapClass
							]"
						>
							<div
								v-if="isAccessControlOverlapped(dev.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isAccessControlSelected('exit', dev.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleAccessControl('exit', dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
					<p v-if="props.accessControlDevices.length > 0 && !hasExitSelected" :class="warnHintClass">
						至少需要選擇一個出口設備
					</p>
				</div>
			</div>
		</template>

		<!-- 攝影機人流（ISAPI PeopleCounting）：channel 固定由後端設定為 1，不提供欄位 -->

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
					v-if="
						(!localLocation.personGroupIds || localLocation.personGroupIds.length === 0) &&
						personGroups.length > 0
					"
					class="mt-2 text-xs text-amber-300 2xl:text-sm"
				>
					至少需要選擇一個人員群組
				</p>
			</template>
			<template v-else-if="dataSource === 'access_control'">
				<!-- 門禁設備（本系統）：人員與可進出權限改由「人員管理」設定與同步，此地點僅綁定入口／出口設備；事件由後端佈防訂閱 -->
				<div
					class="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100/90 2xl:text-base"
				>
					<p class="font-medium">人員與門禁權限由「人員管理」處理</p>
					<p class="mt-1 text-white/70">
						此地點僅需綁定上方入口／出口設備。人員的新增、群組與「可進出此地點」的權限請至<strong>「人員管理」</strong>設定，並使用「設備同步」將人員寫入門禁設備。門禁事件由後端自動訂閱，不需在門禁機上設定事件監聽主機。
					</p>
				</div>
			</template>
			<template v-else>
				<!-- 攝影機人流：攝影機設備（可複選） -->
				<div class="mb-3">
					<span class="text-sm font-medium text-white/80 2xl:text-base">攝影機設備（可複選）*</span>
				</div>
				<div
					v-if="isapiCameraDevices.length === 0"
					class="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
				>
					請先在設備管理新增支援 ISAPI 的攝影機
				</div>
				<div v-else class="grid grid-cols-2 gap-2">
					<label
						v-for="dev in isapiCameraDevices"
						:key="dev.id"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
						:class="{
							'border-cyan-400/50 bg-cyan-500/20': isCameraSelected(dev.id)
						}"
					>
						<input
							type="checkbox"
							:checked="isCameraSelected(dev.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleCamera(dev.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
					</label>
				</div>
				<p
					v-if="isapiCameraDevices.length > 0 && !hasSelectedCamera"
					class="mt-2 text-xs text-amber-300 2xl:text-sm"
				>
					至少需要選擇一台攝影機設備
				</p>
			</template>
		</div>

		<!-- 警告提示 -->
		<div
			v-if="dataSource !== 'isapi_camera' && (hasDoorOverlap || hasAccessControlOverlap)"
			:class="dangerHintClass"
		>
			入口與出口請勿選擇同一設備
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting";
import type { Device } from "~/types/device";

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
	isapiCameraDevices?: Device[];
}

interface Emits {
	(e: "update", location: PeopleCountingLocation): void;
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
	isapiCameraDevices: () => []
});

const emit = defineEmits<Emits>();

const localLocation = ref<PeopleCountingLocation>({ ...props.location });

const fieldLabelClass =
	"flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base";
const emptyHintClass =
	"rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm";
const selectCardBaseClass =
	"relative flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 pr-10 transition-colors hover:bg-white/10";
const selectCardSelectedClass = "border-cyan-400/50 bg-cyan-500/20";
const selectCardOverlapClass =
	"border-rose-500 bg-rose-500/15 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]";
const dangerHintClass =
	"mt-3 rounded border border-rose-500/60 bg-rose-500/15 p-2 text-xs text-rose-200 2xl:text-sm";
const warnHintClass = "mt-2 text-xs text-amber-300 2xl:text-sm";
const dataSource = ref<"yscp" | "access_control" | "isapi_camera">(
	(props.location.dataSource as "yscp" | "access_control" | "isapi_camera") || "yscp"
);

watch(
	() => props.location,
	newLocation => {
		localLocation.value = { ...newLocation };
		if (!localLocation.value.personGroupIds) localLocation.value.personGroupIds = [];
		if (!Array.isArray(localLocation.value.entryDoorIds)) localLocation.value.entryDoorIds = [];
		if (!Array.isArray(localLocation.value.exitDoorIds)) localLocation.value.exitDoorIds = [];
		if (!Array.isArray(localLocation.value.entryDeviceIds)) localLocation.value.entryDeviceIds = [];
		if (!Array.isArray(localLocation.value.exitDeviceIds)) localLocation.value.exitDeviceIds = [];
		if (
			(newLocation.dataSource as string) === "isapi_camera" &&
			!Array.isArray(localLocation.value.cameraDeviceIds)
		) {
			localLocation.value.cameraDeviceIds =
				localLocation.value.cameraDeviceId != null ? [localLocation.value.cameraDeviceId] : [];
		}
		dataSource.value =
			(newLocation.dataSource as "yscp" | "access_control" | "isapi_camera") || "yscp";
		if ((newLocation.dataSource as string) === "isapi_camera") {
			localLocation.value.preferRegion = true;
		}
	},
	{ immediate: true, deep: true }
);

const getEffectiveCameraDeviceIds = (): number[] => {
	if (Array.isArray(localLocation.value.cameraDeviceIds)) {
		return localLocation.value.cameraDeviceIds;
	}
	if (localLocation.value.cameraDeviceId != null) {
		return [localLocation.value.cameraDeviceId];
	}
	return [];
};

const hasSelectedCamera = computed(() => getEffectiveCameraDeviceIds().length > 0);

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
		localLocation.value.entryDoorIds = [];
		localLocation.value.exitDoorIds = [];
		localLocation.value.cameraDeviceId = undefined;
		localLocation.value.cameraDeviceIds = undefined;
		localLocation.value.preferRegion = undefined;
		if (!Array.isArray(localLocation.value.entryDeviceIds)) localLocation.value.entryDeviceIds = [];
		if (!Array.isArray(localLocation.value.exitDeviceIds)) localLocation.value.exitDeviceIds = [];
	} else if (dataSource.value === "isapi_camera") {
		localLocation.value.personGroupIds = [];
		localLocation.value.entryDoorIds = [];
		localLocation.value.exitDoorIds = [];
		localLocation.value.entryDeviceIds = [];
		localLocation.value.exitDeviceIds = [];
		if (!Array.isArray(localLocation.value.cameraDeviceIds)) {
			localLocation.value.cameraDeviceIds = getEffectiveCameraDeviceIds();
		}
		localLocation.value.cameraDeviceId = localLocation.value.cameraDeviceIds[0] ?? undefined;
		localLocation.value.preferRegion = true;
	} else {
		localLocation.value.entryDeviceIds = [];
		localLocation.value.exitDeviceIds = [];
		localLocation.value.cameraDeviceId = undefined;
		localLocation.value.cameraDeviceIds = undefined;
		localLocation.value.preferRegion = undefined;
		if (!Array.isArray(localLocation.value.entryDoorIds)) localLocation.value.entryDoorIds = [];
		if (!Array.isArray(localLocation.value.exitDoorIds)) localLocation.value.exitDoorIds = [];
	}
	handleChange();
};

const normalizeIdList = (value: number[] | undefined): number[] => {
	if (!Array.isArray(value)) return [];
	return value
		.map(v => Number(v))
		.filter(n => Number.isFinite(n) && n > 0)
		.map(n => Math.trunc(n));
};

const normalizedEntryDoorIds = computed(() => normalizeIdList(localLocation.value.entryDoorIds));
const normalizedExitDoorIds = computed(() => normalizeIdList(localLocation.value.exitDoorIds));
const normalizedEntryDeviceIds = computed(() =>
	normalizeIdList(localLocation.value.entryDeviceIds)
);
const normalizedExitDeviceIds = computed(() => normalizeIdList(localLocation.value.exitDeviceIds));

const doorOverlapSet = computed(() => {
	const entry = new Set(normalizedEntryDoorIds.value);
	const exit = new Set(normalizedExitDoorIds.value);
	const overlap = new Set<number>();
	for (const id of entry) {
		if (exit.has(id)) overlap.add(id);
	}
	return overlap;
});

const hasDoorOverlap = computed(() => doorOverlapSet.value.size > 0);

const isDoorOverlapped = (doorId: number): boolean => {
	return doorOverlapSet.value.has(Number(doorId));
};

const isDoorSelected = (role: "entry" | "exit", doorId: number): boolean => {
	const ids = role === "entry" ? normalizedEntryDoorIds.value : normalizedExitDoorIds.value;
	return ids.includes(doorId);
};

const handleToggleDoor = (role: "entry" | "exit", doorId: number) => {
	const key = role === "entry" ? "entryDoorIds" : "exitDoorIds";
	const current =
		role === "entry" ? [...normalizedEntryDoorIds.value] : [...normalizedExitDoorIds.value];
	const idx = current.indexOf(doorId);
	if (idx >= 0) current.splice(idx, 1);
	else current.push(doorId);
	localLocation.value[key] = current;
	handleChange();
};

const isAccessControlSelected = (role: "entry" | "exit", deviceId: number): boolean => {
	const ids = role === "entry" ? normalizedEntryDeviceIds.value : normalizedExitDeviceIds.value;
	return ids.includes(deviceId);
};

const handleToggleAccessControl = (role: "entry" | "exit", deviceId: number) => {
	const key = role === "entry" ? "entryDeviceIds" : "exitDeviceIds";
	const current =
		role === "entry" ? [...normalizedEntryDeviceIds.value] : [...normalizedExitDeviceIds.value];
	const idx = current.indexOf(deviceId);
	if (idx >= 0) current.splice(idx, 1);
	else current.push(deviceId);
	localLocation.value[key] = current;
	handleChange();
};

const accessControlOverlapSet = computed(() => {
	const entry = new Set(normalizedEntryDeviceIds.value);
	const exit = new Set(normalizedExitDeviceIds.value);
	const overlap = new Set<number>();
	for (const id of entry) {
		if (exit.has(id)) overlap.add(id);
	}
	return overlap;
});

const hasAccessControlOverlap = computed(() => accessControlOverlapSet.value.size > 0);

const isAccessControlOverlapped = (deviceId: number): boolean => {
	return accessControlOverlapSet.value.has(Number(deviceId));
};

const hasEntrySelected = computed(() => {
	if (dataSource.value === "access_control") return normalizedEntryDeviceIds.value.length > 0;
	return normalizedEntryDoorIds.value.length > 0;
});

const hasExitSelected = computed(() => {
	if (dataSource.value === "access_control") return normalizedExitDeviceIds.value.length > 0;
	return normalizedExitDoorIds.value.length > 0;
});

const isCameraSelected = (deviceId: number): boolean => {
	return getEffectiveCameraDeviceIds().includes(deviceId);
};

const handleToggleCamera = (deviceId: number) => {
	if (!Array.isArray(localLocation.value.cameraDeviceIds)) {
		localLocation.value.cameraDeviceIds = getEffectiveCameraDeviceIds();
	}
	const ids = localLocation.value.cameraDeviceIds;
	const idx = ids.indexOf(deviceId);
	if (idx >= 0) ids.splice(idx, 1);
	else ids.push(deviceId);

	localLocation.value.cameraDeviceId = ids[0] ?? undefined;
	handleChange();
};

const handleChange = () => {
	emit("update", { ...localLocation.value });
};
</script>
