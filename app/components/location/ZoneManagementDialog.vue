<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">區域管理</h3>
						<div class="flex items-center gap-3">
							<!-- 變更提示 -->
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="sortedZones.length > 0" :key="`zones-${sortedZones.length}`">
									<div class="space-y-3">
										<div
											v-for="zone in sortedZones"
											:key="getZoneId(zone)"
											class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
											:class="{ 'bg-white/15': expandedZones.has(getZoneId(zone)) }"
										>
											<!-- 區域標題列（可點擊展開） -->
											<div
												class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
												@click="toggleZone(getZoneId(zone))"
											>
												<div class="flex flex-1 items-center gap-4">
													<!-- 展開/收起圖標 -->
													<svg
														class="h-5 w-5 text-white/70 transition-transform"
														:class="{ 'rotate-90': expandedZones.has(getZoneId(zone)) }"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M9 5l7 7-7 7"
														/>
													</svg>
													<!-- 區域名稱 -->
													<div
														class="flex h-16 min-w-[80px] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 shadow-lg"
													>
														<h4 v-if="zone.name" class="text-xl font-bold tracking-wider text-white 2xl:text-2xl">
															{{ zone.name }}
														</h4>
														<span v-else class="text-sm text-white/60 2xl:text-base">未命名</span>
													</div>

													<div class="flex-1">
														<div class="flex items-center gap-3">
															<span
																class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
															>
																{{ getLocationsCount(zone) }} 個{{ getLocationLabel() }}
															</span>
														</div>
													</div>
												</div>
												<div class="ml-4 flex gap-2 2xl:gap-3" @click.stop>
													<button
														type="button"
														class="p-2 text-rose-400 transition-colors hover:text-rose-300"
														@click.stop="handleDeleteZone(getZoneId(zone))"
														title="刪除區域"
													>
														<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
													</button>
												</div>
											</div>

											<!-- 展開內容 -->
											<Transition name="expand">
												<div
													v-if="expandedZones.has(getZoneId(zone))"
													class="space-y-3 border-t border-white/10 p-4"
												>
													<!-- 區域基本資訊 -->
													<ZoneFormFields
														:zone="getZoneForFormFields(zone)"
														:require-image-url="requireImageUrl"
														@update="handleZoneUpdate(getZoneId(zone), $event)"
													/>

													<!-- 系統特定的地點管理組件 -->
													<component
														:is="locationManagementComponent"
														:zone="zone"
														:devices="devices"
														:is-loading-devices="isLoadingDevices"
														:device-hint="deviceHint"
														:person-groups="personGroups"
														:doors="doors"
														:access-control-devices="accessControlDevices"
														@add-location="() => addLocation(zone)"
														@remove-location="(index: number) => removeLocation(getZoneId(zone), index)"
														@update-location="
															(index: number, location: SystemLocationType) =>
																handleLocationUpdate(getZoneId(zone), index, location)
														"
													/>
												</div>
											</Transition>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增區域」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="pr-7 text-base text-rose-300 2xl:pr-8 2xl:text-lg">
						{{ errorMessage }}
					</p>
					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:class="{ 'cursor-not-allowed opacity-50': !hasUnsavedChanges }"
							:disabled="!hasUnsavedChanges"
							@click="saveAllChanges"
						>
							儲存變更
						</button>
						<button type="button" class="btn-primary" @click="addNewZone">新增區域</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- 確認對話框 -->
	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="
			confirmAction === 'delete'
				? handleConfirmDelete()
				: confirmAction === 'deleteLocation'
					? handleConfirmDeleteLocation()
					: handleConfirmClose()
		"
	/>
</template>

<script setup lang="ts" generic="TZone extends SystemZoneType">
import type { SystemType, UnifiedZone } from "~/types/location";
import type { Device } from "~/types/device";
import type {
	SystemZoneType,
	SystemLocationType
} from "~/composables/systems/useZoneSystemAdapter";
import { useZoneSystemAdapter } from "~/composables/systems/useZoneSystemAdapter";
import { useZoneValidation } from "~/composables/systems/useZoneValidation";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { useExternalDataApi } from "~/composables/systems/useExternalDataApi";
import ZoneFormFields from "./ZoneFormFields.vue";
import EnvironmentLocationManagement from "./LocationManagement/EnvironmentLocationManagement.vue";
import LightingLocationManagement from "./LocationManagement/LightingLocationManagement.vue";
import PeopleCountingLocationManagement from "./LocationManagement/PeopleCountingLocationManagement.vue";
import VehicleAccessLocationManagement from "./LocationManagement/VehicleAccessLocationManagement.vue";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import type { Component } from "vue";
import { useLocationApi } from "~/composables/systems/location/useLocationApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

interface Props {
	modelValue: boolean;
	zones: TZone[];
	systemType: SystemType;
	requireImageUrl?: boolean;
	deviceHint?: string;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", zone: TZone): void;
	(e: "delete", zoneId: string): void;
}

const props = withDefaults(defineProps<Props>(), {
	requireImageUrl: false,
	deviceHint: "請先在「設備管理」中建立設備"
});

const emit = defineEmits<Emits>();

// 系統適配器
const adapter = useZoneSystemAdapter<TZone, SystemLocationType>(props.systemType);

// 本地狀態管理（簡化版本，直接使用系統特定類型）
const pendingChanges = ref<Map<string, TZone>>(new Map()) as Ref<Map<string, TZone>>;
const expandedZones = ref<Set<string>>(new Set());
const errorMessage = ref("");

// 待刪除地點
const pendingDeleteLocation = ref<{ zoneId: string; locationIndex: number } | null>(null);

// 驗證
const { validateZone } = useZoneValidation();

// 更新區域（加入待保存列表）
const updateZone = (zone: TZone) => {
	const zoneId = getZoneId(zone);
	if (!zoneId) return;

	// 驗證區域
	const validation = validateZone({
		name: zone.name,
		imageUrl: (zone as any).imageUrl,
		description: (zone as any).description
	});
	if (!validation.isValid) {
		errorMessage.value = validation.errors.join(", ");
		return;
	}

	errorMessage.value = "";
	// 使用 JSON 深拷貝，避免 structuredClone 無法處理某些對象的問題
	pendingChanges.value.set(zoneId, JSON.parse(JSON.stringify(zone)) as TZone);
};

// 合併原始 zones 和待保存的變更
const mergedZones = computed(() => {
	const zonesMap = new Map<string, TZone>();

	// 先添加所有原始 zones
	props.zones.forEach(zone => {
		const zoneId = getZoneId(zone);
		if (zoneId) {
			zonesMap.set(zoneId, { ...zone });
		}
	});

	// 然後用待保存的變更覆蓋
	pendingChanges.value.forEach((zone, zoneId) => {
		zonesMap.set(zoneId, { ...zone } as TZone);
	});

	return Array.from(zonesMap.values());
});

// 排序區域（過濾掉沒有地點的區域，但保留新區域）
const sortedZones = computed(() => {
	if (!mergedZones.value || mergedZones.value.length === 0) return [];

	// 過濾掉沒有地點的區域，但保留新區域（有 temp- ID 的）
	const zonesWithLocations = mergedZones.value.filter(zone => {
		const zoneId = getZoneId(zone);
		const hasLocations = adapter.getLocationsProperty(zone).length > 0;
		const isNewZone = zoneId?.startsWith("temp-");
		// 如果有地點或是新區域，則顯示
		return hasLocations || isNewZone;
	});

	// 如果所有區域都沒有地點且沒有新區域，顯示所有區域（用於顯示空狀態）
	const zonesToShow = zonesWithLocations.length > 0 ? zonesWithLocations : mergedZones.value;

	return [...zonesToShow].sort((a, b) => {
		const nameA = a.name || "";
		const nameB = b.name || "";
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
		return numA - numB;
	});
});

// 檢查是否有未保存的變更
const hasUnsavedChanges = computed(() => pendingChanges.value.size > 0);

// 確認對話框
const confirmDialog = useConfirmDialog();
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close");

const locationApi = useLocationApi();
const { handleError } = useErrorHandler();

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value;
	}
});

const confirmDialogConfig = computed(() => confirmDialog.config.value);

// 計算變更的欄位列表
const changedFieldsList = computed(() => {
	const fields: string[] = [];
	pendingChanges.value.forEach((zone, zoneId) => {
		const originalZone = props.zones.find(z => getZoneId(z) === zoneId);
		if (!originalZone) {
			fields.push(`新增區域: ${zone.name || "未命名"}`);
		} else {
			if (zone.name !== originalZone.name) {
				fields.push(`區域名稱: ${originalZone.name} → ${zone.name}`);
			}
			const zoneAny = zone as any;
			const originalAny = originalZone as any;
			if (zoneAny.imageUrl !== originalAny.imageUrl) {
				fields.push("區域示意圖");
			}
			// 檢查地點變更
			const originalLocations = adapter.getLocationsProperty(originalZone);
			const pendingLocations = adapter.getLocationsProperty(zone);
			if (JSON.stringify(originalLocations) !== JSON.stringify(pendingLocations)) {
				fields.push(`${getLocationLabel()}列表`);
			}
		}
	});
	return fields;
});

// 變更摘要訊息
const changeSummary = computed(() => {
	const count = pendingChanges.value.size;
	const hasNew = Array.from(pendingChanges.value.keys()).some(id => id.startsWith("temp-"));
	if (hasNew) {
		return `有 ${count} 個區域已修改，包含新增的區域`;
	}
	return `有 ${count} 個區域已修改`;
});

// 設備管理
const deviceApi = useDeviceApi();
const devices = ref<any[]>([]);
const isLoadingDevices = ref(false);

// 人員群組和門禁設備（僅用於人流統計系統）
const externalDataApi = useExternalDataApi();
const personGroups = ref<Array<{ id: number; name: string; is_deleted?: number }>>([]);
const doors = ref<
	Array<{ id: number; device_id: number; dev_name: string; door_index: number; is_deleted?: number }>
>([]);
const accessControlDevices = ref<Device[]>([]);

// 地點管理組件映射
const locationManagementComponentMap: Record<SystemType, Component> = {
	lighting: LightingLocationManagement,
	environment: EnvironmentLocationManagement,
	people_counting: PeopleCountingLocationManagement,
	vehicle_access: VehicleAccessLocationManagement
};

const locationManagementComponent = computed(
	() => locationManagementComponentMap[props.systemType]
);

// 載入設備列表
const loadDevices = async () => {
	isLoadingDevices.value = true;
	try {
		const deviceType = props.systemType === "lighting" ? "controller" : "sensor";
		const result = await deviceApi.getDevices({
			type_code: deviceType,
			status: "active",
			limit: 100
		});
		devices.value = result.devices;
	} catch (error) {
		console.error("載入設備列表失敗:", error);
		errorMessage.value = "載入設備列表失敗";
	} finally {
		isLoadingDevices.value = false;
	}
};

// 載入人員群組列表（僅用於人流統計系統）
const loadPersonGroups = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await externalDataApi.getPersonGroups({
			limit: 1000
		});
		personGroups.value = result.data || [];
	} catch (error) {
		console.error("載入人員群組列表失敗:", error);
		errorMessage.value = "載入人員群組列表失敗";
	}
};

// 載入門禁設備列表（僅用於人流統計系統）
const loadDoors = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await externalDataApi.getList("deviceaccess", "door", {
			limit: 1000
		});
		doors.value = result.data || [];
	} catch (error) {
		console.error("載入門禁設備列表失敗:", error);
		errorMessage.value = "載入門禁設備列表失敗";
	}
};

// 載入本系統門禁設備列表（僅用於人流統計系統「門禁設備」資料來源）
const loadAccessControlDevices = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await deviceApi.getDevices({
			type_code: "access_control",
			status: "active",
			limit: 100
		});
		accessControlDevices.value = result.devices || [];
	} catch (error) {
		console.error("載入門禁設備列表失敗:", error);
		accessControlDevices.value = [];
	}
};

// 當對話框打開時載入設備列表和相關資料
watch(
	() => props.modelValue,
	newValue => {
		if (newValue) {
			loadDevices();
			// 僅在人流統計系統時載入人員群組和門禁設備
			if (props.systemType === "people_counting") {
				loadPersonGroups();
				loadDoors();
				loadAccessControlDevices();
			}
			pendingChanges.value.clear();
			expandedZones.value.clear();
			errorMessage.value = "";
		}
	}
);

// 取得區域 ID
const getZoneId = (zone: TZone): string => {
	const zoneAny = zone as any;
	return zoneAny.id || zoneAny.name || `temp-${Date.now()}-${Math.random()}`;
};

// 取得地點數量（用於顯示）
const getLocationsCount = (zone: TZone): number => {
	return adapter.getLocationsProperty(zone).length;
};

// 取得地點標籤（用於顯示）
const getLocationLabel = (): string => {
	const labelMap: Record<SystemType, string> = {
		lighting: "點位",
		environment: "地點",
		people_counting: "地點",
		vehicle_access: "地點"
	};
	return labelMap[props.systemType] || "地點";
};

// 取得區域用於表單欄位（轉換為 UnifiedZone）
const getZoneForFormFields = (zone: TZone): UnifiedZone => {
	const zoneAny = zone as any;
	return {
		id: getZoneId(zone),
		name: zone.name,
		imageUrl: zoneAny.imageUrl,
		description: zoneAny.description,
		locations: []
	} as UnifiedZone;
};

// 切換區域展開/收起
const toggleZone = (zoneId: string) => {
	if (expandedZones.value.has(zoneId)) {
		expandedZones.value.delete(zoneId);
	} else {
		expandedZones.value.add(zoneId);
	}
};

// 處理關閉
const handleClose = () => {
	if (hasUnsavedChanges.value) {
		// ✅ 檢查是否有新增的區域（臨時 ID）
		const hasNewZones = Array.from(pendingChanges.value.keys()).some(id => id.startsWith("temp-"));

		confirmAction.value = "close";
		confirmDialog.show({
			title: "確認關閉",
			message: hasNewZones
				? "您有未保存的變更，包含新增的區域。確定要關閉嗎？"
				: "您有未保存的變更，確定要關閉嗎？",
			details: hasNewZones
				? "未保存的變更將會遺失，新增的區域不會寫入資料庫。"
				: "未保存的變更將會遺失。",
			type: "warning"
		});
		return;
	}

	closeDialog();
};

// 關閉對話框（清除狀態）
const closeDialog = () => {
	pendingChanges.value.clear();
	expandedZones.value.clear();
	errorMessage.value = "";
	emit("update:modelValue", false);
};

// 確認關閉
const handleConfirmClose = () => {
	closeDialog();
};

// 處理區域更新
const handleZoneUpdate = (zoneId: string, updates: Partial<UnifiedZone>) => {
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;

	const updatedZone = { ...zone, ...updates } as TZone;
	updateZone(updatedZone);
};

// 處理地點更新（從 LocationManagement 組件接收）
const handleLocationUpdate = (
	zoneId: string,
	locationIndex: number,
	updatedLocation: SystemLocationType
) => {
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;

	const locations = [...adapter.getLocationsProperty(zone)];
	locations[locationIndex] = updatedLocation;

	const updatedZone = adapter.setLocationsProperty(zone, locations);
	updateZone(updatedZone);
};

// 新增地點（從 LocationManagement 組件接收）
const addLocation = (zone: TZone) => {
	const newLocation = adapter.createNewLocation();
	const locations = [...adapter.getLocationsProperty(zone), newLocation];
	const updatedZone = adapter.setLocationsProperty(zone, locations);
	updateZone(updatedZone);
};

// 刪除地點（從 LocationManagement 組件接收）
const removeLocation = (zoneId: string, locationIndex: number) => {
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;
	pendingDeleteLocation.value = { zoneId, locationIndex };
	confirmAction.value = "deleteLocation";
	const locations = adapter.getLocationsProperty(zone);
	const target = locations?.[locationIndex] as any;
	const hasId = Boolean(target?.id);
	const systemCount = target?.systems?.length || 0;
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此地點嗎？",
		details: hasId
			? systemCount > 0
				? "此操作將刪除此地點並一併移除所有系統設定，且無法復原。"
				: "此操作將刪除此地點，且無法復原。"
			: "此地點尚未儲存，將直接從清單移除。",
		type: "danger"
	});
};

// 確認刪除地點
const handleConfirmDeleteLocation = async () => {
	if (!pendingDeleteLocation.value) return;
	const { zoneId, locationIndex } = pendingDeleteLocation.value;
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) {
		pendingDeleteLocation.value = null;
		return;
	}

	const locations = [...adapter.getLocationsProperty(zone)];
	// 檢查索引是否有效
	if (locationIndex < 0 || locationIndex >= locations.length) {
		pendingDeleteLocation.value = null;
		return;
	}

	const target = locations[locationIndex] as any;
	const targetId = target?.id ? String(target.id) : null;

	// 如果地點有 ID（已保存），立即調用 API 刪除
	if (targetId) {
		try {
			await locationApi.deleteLocation(targetId);
		} catch (error) {
			handleError(error, "刪除地點失敗");
			pendingDeleteLocation.value = null;
			return;
		}
	}
	// 如果地點沒有 ID（未保存），直接從列表中移除即可

	locations.splice(locationIndex, 1);
	const updatedZone = adapter.setLocationsProperty(zone, locations);
	updateZone(updatedZone);

	pendingDeleteLocation.value = null;
};

// 新增區域
const addNewZone = () => {
	// 生成不重複的臨時名稱
	let tempName = `${props.zones.length + 1}F`;
	let counter = 1;
	while (props.zones.some(z => z.name.trim() === tempName.trim())) {
		tempName = `${props.zones.length + 1 + counter}F`;
		counter++;
	}

	// 生成臨時 ID
	const tempId = `temp-${Date.now()}-${Math.random()}`;

	// 建立新區域，並賦值臨時 ID
	const newZone = {
		...adapter.createNewZone(tempName),
		id: tempId // ✅ 賦值臨時 ID
	} as TZone;

	// ✅ 只加入待保存列表，不立即寫入資料庫
	// 使用 JSON 深拷貝，避免 structuredClone 無法處理某些對象的問題
	pendingChanges.value.set(tempId, JSON.parse(JSON.stringify(newZone)) as TZone);

	// ✅ 自動展開新區域
	expandedZones.value.add(tempId);
};

// 儲存所有變更
const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0) return;

	errorMessage.value = "";
	const zoneAny = (zone: TZone) => zone as any;

	// 驗證所有待保存的區域
	for (const zone of pendingChanges.value.values()) {
		// 1. 驗證區域基本資訊
		const validation = validateZone({
			name: zone.name,
			imageUrl: zoneAny(zone).imageUrl,
			description: zoneAny(zone).description
		});
		if (!validation.isValid) {
			errorMessage.value = validation.errors.join("\n");
			return;
		}

		// 2. 驗證系統特定規則（例如：照明系統需要示意圖）
		if (props.requireImageUrl && !zoneAny(zone).imageUrl) {
			errorMessage.value = "照明系統必須上傳示意圖";
			return;
		}
	}

	// 複製待保存的區域列表（保留 zoneId；不要先清空，避免中途失敗丟失）
	const zonesToSave = Array.from(pendingChanges.value.entries());

	// 逐一儲存
	for (const [zoneId, zone] of zonesToSave) {
		const cleanedZone = adapter.filterEmptyLocations(zone as TZone);
		const isNewZone = zoneAny(zone).id?.startsWith("temp-");

		if (isNewZone) {
			// 新增區域：移除臨時 ID
			const { id, ...zoneWithoutId } = zoneAny(cleanedZone);
			emit("save", zoneWithoutId as TZone);
		} else {
			// 更新區域：保留 ID
			emit("save", cleanedZone);
		}
	}

	// 全部成功才清空 pendingChanges
	pendingChanges.value.clear();
};

// 刪除確認處理（使用 ref 追蹤待刪除的 zoneId）
const pendingDeleteZoneId = ref<string | null>(null);

// 刪除區域
const handleDeleteZone = (zoneId: string) => {
	pendingDeleteZoneId.value = zoneId;
	confirmAction.value = "delete";
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此區域嗎？",
		details: "此操作將刪除該區域的所有地點資料，且無法復原。",
		type: "danger"
	});
};

// 確認刪除
const handleConfirmDelete = () => {
	if (pendingDeleteZoneId.value) {
		emit("delete", pendingDeleteZoneId.value);
		pendingChanges.value.delete(pendingDeleteZoneId.value);
		expandedZones.value.delete(pendingDeleteZoneId.value);
		pendingDeleteZoneId.value = null;
	}
};
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

.btn-primary,
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 1rem;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-primary {
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}

/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	opacity: 0;
	max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
	opacity: 1;
	max-height: 1000px;
}

/* 淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* 對話框淡入淡出 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
