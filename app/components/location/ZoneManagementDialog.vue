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
											class="overflow-hidden rounded-lg border transition-all"
											:class="[
												isNewZone(zone)
													? 'border-2 border-amber-400/90 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]'
													: 'border border-white/20 bg-white/10',
												{ 'bg-white/15': !isNewZone(zone) && expandedZones.has(getZoneId(zone)) },
												{
													'bg-amber-500/15': isNewZone(zone) && expandedZones.has(getZoneId(zone))
												}
											]"
										>
											<div
												class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
												@click="toggleZone(getZoneId(zone))"
											>
												<div class="flex flex-1 items-center gap-4">
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
													<div class="btn-reorder-stack">
														<button
															type="button"
															class="btn-reorder-arrow"
															:disabled="isFirstZoneInList(zone)"
															title="上移"
															aria-label="此區域上移"
															@click.stop="moveZoneOrder(zone, -1)"
														>
															↑
														</button>
														<button
															type="button"
															class="btn-reorder-arrow"
															:disabled="isLastZoneInList(zone)"
															title="下移"
															aria-label="此區域下移"
															@click.stop="moveZoneOrder(zone, 1)"
														>
															↓
														</button>
													</div>
													<IconTrashButton
														:allowed="canRemoveZone"
														title="刪除區域"
														aria-label="刪除區域"
														@click.stop="handleDeleteZone(getZoneId(zone))"
													/>
												</div>
											</div>

											<Transition name="expand">
												<div
													v-if="expandedZones.has(getZoneId(zone))"
													class="space-y-3 border-t border-white/10 p-4"
												>
													<ZoneFormFields
														:zone="getZoneForFormFields(zone)"
														:require-image-url="requireImageUrl"
														@update="handleZoneUpdate(getZoneId(zone), $event)"
													/>

													<component
														:is="locationManagementComponent"
														:zone="zone"
														:devices="devices"
														:is-loading-devices="isLoadingDevices"
														:device-hint="deviceHint"
														:person-groups="personGroups"
														:vehicle-custom-groups="vehicleCustomGroups"
														:doors="doors"
														:access-control-devices="accessControlDevices"
														:isapi-camera-devices="isapiCameraDevices"
						:surveillance-camera-devices="surveillanceCameraDevices"
														:reorderable-locations="true"
														:allow-create-location="canAddZone"
														:allow-delete-location="canRemoveZone"
														@add-location="() => addLocation(zone)"
														@remove-location="(index: number) => removeLocation(getZoneId(zone), index)"
														@reorder-location="
															(payload: { index: number; direction: 'up' | 'down' }) =>
																handleReorderLocationRow(zone, payload)
														"
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
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增區域」開始建立</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="form-error-text-lg pr-7 2xl:pr-8">
						{{ errorMessage }}
					</p>
					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<PermissionActionButton
							:allowed="canSaveZones"
							:disabled="!hasUnsavedChanges || isSaving"
							aria-label="儲存變更"
							class="btn-primary"
							@click="saveAllChanges"
						>
							{{ isSaving ? "儲存中…" : "儲存變更" }}
						</PermissionActionButton>
						<PermissionActionButton
							:allowed="canAddZone"
							aria-label="新增區域"
							class="btn-primary"
							@click="addNewZone"
						>
							新增區域
						</PermissionActionButton>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

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
import { TOAST } from "~/config/toastCatalog";
import type { SystemType, UnifiedZone } from "~/types/location";
import type { Device } from "~/types/device";
import type {
	SystemZoneType,
	SystemLocationType
} from "~/composables/location/adapters/useZoneSystemAdapter";
import { useZoneSystemAdapter } from "~/composables/location/adapters/useZoneSystemAdapter";
import { useLocationValidationPipeline } from "~/composables/location/validation/useLocationValidationPipeline";
import { useZoneDrafts } from "~/composables/location/ui/useZoneDrafts";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { useExternalDataApi } from "~/composables/systems/externalData/useExternalDataApi";
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi";
import { useModuleRegistry } from "~/composables/core/useModuleRegistry";
import PermissionActionButton from "~/components/common/PermissionActionButton.vue";
import ZoneFormFields from "./ZoneFormFields.vue";
import EnvironmentLocationManagement from "./LocationManagement/EnvironmentLocationManagement.vue";
import PeopleCountingLocationManagement from "./LocationManagement/PeopleCountingLocationManagement.vue";
import VehicleAccessLocationManagement from "./LocationManagement/VehicleAccessLocationManagement.vue";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import IconTrashButton from "~/components/common/IconTrashButton.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import { buildUnsavedCloseConfirm } from "~/utils/formDialog";
import { nextTick, type Component } from "vue";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { joinFormErrors, resolveFormApiError } from "~/utils/apiError";
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions";
import {
	buildDeleteLocationConfirmCopy,
	buildDeleteZoneConfirmCopy,
	getLocationDeleteSuccessToast
} from "~/utils/confirmCopy";
import { getLocationUiKey, getZoneUiKey } from "~/utils/locationUiId";
import { pickSortOrder, zoneSortOrderValue } from "~/utils/sortOrder";
import { filterPeopleCountingCameraDevices } from "~/utils/cameraModelCategories";

interface Props {
	modelValue: boolean;
	zones: TZone[];
	systemType: SystemType;
	requireImageUrl?: boolean;
	deviceHint?: string;
	canCreateZone?: boolean;
	canUpdateZone?: boolean;
	canDeleteZone?: boolean;
	onSaveZone: (zone: TZone) => Promise<void>;
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "delete", zoneId: string): void;
	(e: "saved"): void;
}

const props = withDefaults(defineProps<Props>(), {
	canCreateZone: true,
	canUpdateZone: true,
	canDeleteZone: true,
	requireImageUrl: false,
	deviceHint: "請先在「設備管理」中建立設備"
});

const emit = defineEmits<Emits>();

const canAddZone = computed(() => props.canCreateZone !== false);
const canSaveZones = computed(() => props.canUpdateZone !== false);
const canRemoveZone = computed(() => props.canDeleteZone !== false);

const adapter = useZoneSystemAdapter<TZone, SystemLocationType>(props.systemType);

const {
	pendingChanges,
	expandedZones,
	hasUnsavedChanges,
	clearAllDrafts,
	setDraft,
	deleteDraft,
	createMergedZones,
	createSortedZones,
	buildChangedFieldsList,
	buildChangeSummary,
	reconcileDraftWhenPropsLocationsMatch
} = useZoneDrafts<TZone, SystemLocationType>();
const toast = useToast();
const errorMessage = ref("");
const isSaving = ref(false);

const pendingDeleteLocation = ref<{ zoneId: string; locationUiKey: string } | null>(null);

const { validateSystemZoneForSave } = useLocationValidationPipeline();

const updateZone = (zone: TZone) => {
	const zoneId = getZoneId(zone);
	if (!zoneId) return;

	errorMessage.value = "";
	// 使用 JSON 深拷貝，避免 structuredClone 對部分對象失敗
	setDraft(zoneId, JSON.parse(JSON.stringify(zone)) as TZone);
};

const mergedZones = computed(() => {
	return createMergedZones({ originalZones: props.zones, getZoneId });
});

const sortedZones = computed(() => {
	return createSortedZones({
		mergedZones: mergedZones.value,
		getZoneId,
		getLocations: z => adapter.getLocationsProperty(z)
	});
});

const confirmDialog = useConfirmDialog();
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close");

const { handleError } = useErrorHandler();

const showConfirmDialog = confirmDialog.showDialog;
const confirmDialogConfig = confirmDialog.config;

const changedFieldsList = computed(() => {
	return buildChangedFieldsList({
		originalZones: props.zones,
		pendingChanges: pendingChanges.value,
		getZoneId,
		getZoneName: z => (z as any)?.name ?? "",
		getZoneImageUrl: z => (z as any)?.imageUrl,
		getLocations: z => adapter.getLocationsProperty(z),
		locationLabel: getLocationLabel()
	});
});

const changeSummary = computed(() => {
	return buildChangeSummary({ pendingChanges: pendingChanges.value });
});

const deviceApi = useDeviceApi();
const devices = ref<any[]>([]);
const isLoadingDevices = ref(false);

const externalDataApi = useExternalDataApi();
const {
	enableYscpPeopleCounting,
	enableYscpVehicleAccess,
	ensureLoaded: ensureModuleRegistryLoaded
} = useModuleRegistry();
const personGroups = ref<Array<{ id: number; name: string; is_deleted?: number }>>([]);
const doors = ref<
	Array<{
		id: number;
		device_id: number;
		dev_name: string;
		door_index: number;
		is_deleted?: number;
	}>
>([]);
const accessControlDevices = ref<Device[]>([]);
const isapiCameraDevices = ref<Device[]>([]);
const surveillanceCameraDevices = ref<Device[]>([]);
const vehicleCustomGroups = ref<Array<{ id: number; list_name: string }>>([]);
const vehicleAccessApi = useVehicleAccessApi();

const locationManagementComponentMap: Partial<Record<SystemType, Component>> = {
	environment: EnvironmentLocationManagement,
	people_counting: PeopleCountingLocationManagement,
	vehicle_access: VehicleAccessLocationManagement
};

const locationManagementComponent = computed(() => {
	const c = locationManagementComponentMap[props.systemType];
	return c ?? EnvironmentLocationManagement;
});

const loadDevices = async () => {
	isLoadingDevices.value = true;
	try {
		const deviceType = "sensor";
		const result = await deviceApi.getDevices({
			type_code: deviceType,
			limit: 100
		});
		devices.value = result.devices;
	} catch (error) {
		logger.error("載入設備列表失敗:", error);
		errorMessage.value = "載入設備列表失敗";
	} finally {
		isLoadingDevices.value = false;
	}
};

const loadPersonGroups = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await externalDataApi.getPersonGroups({
			limit: 1000
		});
		personGroups.value = result.data || [];
	} catch (error) {
		logger.error("載入人員群組列表失敗:", error);
		errorMessage.value = "載入人員群組列表失敗";
	}
};

const loadDoors = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await externalDataApi.getList("deviceaccess", "door", {
			limit: 1000
		});
		doors.value = result.data || [];
	} catch (error) {
		logger.error("載入門禁設備列表失敗:", error);
		errorMessage.value = "載入門禁設備列表失敗";
	}
};

const loadAccessControlDevices = async () => {
	if (props.systemType !== "people_counting") return;

	try {
		const result = await deviceApi.getDevices({
			type_code: "access_control",
			limit: 100
		});
		accessControlDevices.value = result.devices || [];
	} catch (error) {
		logger.error("載入門禁設備列表失敗:", error);
		accessControlDevices.value = [];
	}
};

const loadVehicleAccessFormGroups = async () => {
	if (props.systemType !== "vehicle_access") return;

	if (enableYscpVehicleAccess.value) {
		try {
			const result = await vehicleAccessApi.getVehicleGroups();
			vehicleCustomGroups.value = (result.groups ?? [])
				.filter(g => (g.id ?? 0) > 0)
				.map(g => ({
					id: g.id ?? 0,
					list_name: g.list_name?.trim() || `群組 ${g.id}`
				}));
		} catch (error) {
			logger.error("載入車輛群組列表失敗:", error);
			vehicleCustomGroups.value = [];
		}
	} else {
		vehicleCustomGroups.value = [];
	}
};

const loadIsapiCameraDevices = async () => {
	if (props.systemType !== "people_counting") return;
	try {
		const result = await deviceApi.getDevices({
			type_code: "camera",
			limit: 200
		});
		const all = result.devices || [];
		isapiCameraDevices.value = filterPeopleCountingCameraDevices(all);
		surveillanceCameraDevices.value = all;
	} catch {
		isapiCameraDevices.value = [];
		surveillanceCameraDevices.value = [];
	}
};

watch(
	() => props.modelValue,
	async newValue => {
		if (newValue) {
			loadDevices();
			if (props.systemType === "people_counting") {
				await ensureModuleRegistryLoaded();
				if (enableYscpPeopleCounting.value) {
					loadPersonGroups();
					loadDoors();
				} else {
					personGroups.value = [];
					doors.value = [];
				}
				loadAccessControlDevices();
				loadIsapiCameraDevices();
			}
			if (props.systemType === "vehicle_access") {
				await ensureModuleRegistryLoaded();
				await loadVehicleAccessFormGroups();
			}
			clearAllDrafts();
			errorMessage.value = "";
		}
	}
);

const getZoneId = (zone: TZone): string => {
	return getZoneUiKey(zone as any);
};

const getLocationsCount = (zone: TZone): number => {
	return adapter.getLocationsProperty(zone).length;
};

const getLocationLabel = (): string => "地點";

const getZoneForFormFields = (zone: TZone): UnifiedZone => {
	const zoneAny = zone as any;
	return {
		id: getZoneId(zone),
		name: zone.name,
		imageUrl: zoneAny.imageUrl,
		description: zoneAny.description,
		...pickSortOrder(zoneAny.sortOrder),
		locations: []
	} as UnifiedZone;
};

const toggleZone = (zoneId: string) => {
	if (expandedZones.value.has(zoneId)) {
		expandedZones.value.delete(zoneId);
	} else {
		expandedZones.value.add(zoneId);
	}
};

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		const hasNewZones = Array.from(pendingChanges.value.keys()).some(id => id.startsWith("temp-"));

		confirmAction.value = "close";
		confirmDialog.show(
			buildUnsavedCloseConfirm(
				hasNewZones
					? {
							contextHint: "含新增區域",
							extraDetails: "新增區域須儲存後才會寫入資料庫。",
						}
					: {},
			),
		);
		return;
	}

	closeDialog();
};

const closeDialog = () => {
	clearAllDrafts();
	errorMessage.value = "";
	emit("update:modelValue", false);
};

const handleConfirmClose = () => {
	closeDialog();
};

const handleZoneUpdate = (zoneId: string, updates: Partial<UnifiedZone>) => {
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;

	const updatedZone = { ...zone, ...updates } as TZone;
	updateZone(updatedZone);
};

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

const addLocation = (zone: TZone) => {
	if (!canAddZone.value) return;
	const newLocation = adapter.createNewLocation() as SystemLocationType;

	// 人流統計 / 車輛進出：若 dataSource 未設，依 YSCP 開關給預設（避免被列表篩選掉）
	if (props.systemType === "people_counting") {
		const loc = newLocation as { dataSource?: string };
		if (!loc.dataSource) {
			loc.dataSource = enableYscpPeopleCounting.value ? "yscp" : "access_control";
		}
	}
	if (props.systemType === "vehicle_access") {
		const loc = newLocation as { dataSource?: string };
		if (!loc.dataSource) {
			loc.dataSource = enableYscpVehicleAccess.value ? "yscp" : "isapi_camera";
		}
	}
	const locations = [...adapter.getLocationsProperty(zone), newLocation];
	const updatedZone = adapter.setLocationsProperty(zone, locations);
	updateZone(updatedZone);
};

const removeLocation = (zoneId: string, locationIndex: number) => {
	if (!canRemoveZone.value) return;
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) return;
	const locations = adapter.getLocationsProperty(zone);
	const target = locations?.[locationIndex] as any;
	const locationUiKey = getLocationUiKey({ zone: zone as any, location: target, locationIndex });
	pendingDeleteLocation.value = { zoneId, locationUiKey };
	confirmAction.value = "deleteLocation";
	const hasId = Boolean(target?.id);
	const systemCount = target?.systems?.length || 0;
	const copy = buildDeleteLocationConfirmCopy({
		hasId,
		systemType: props.systemType,
		systemCount
	});
	confirmDialog.show(copy);
};

const commitLocalLocationRemoval = (
	zone: TZone,
	locations: SystemLocationType[],
	index: number
) => {
	locations.splice(index, 1);
	updateZone(adapter.setLocationsProperty(zone, locations));
};

const handleConfirmDeleteLocation = async () => {
	if (!pendingDeleteLocation.value) return;
	const { zoneId, locationUiKey } = pendingDeleteLocation.value;
	const zone = sortedZones.value.find(z => getZoneId(z) === zoneId);
	if (!zone) {
		pendingDeleteLocation.value = null;
		return;
	}

	const locations = [...adapter.getLocationsProperty(zone)];
	const resolvedIndex = locations.findIndex((loc: any, idx: number) => {
		return (
			getLocationUiKey({ zone: zone as any, location: loc, locationIndex: idx }) === locationUiKey
		);
	});
	if (resolvedIndex < 0) {
		pendingDeleteLocation.value = null;
		return;
	}

	const target = locations[resolvedIndex] as { id?: string | number };
	const targetId = target?.id != null ? String(target.id) : null;

	if (targetId) {
		try {
			const result = await removeLocationFromSystemOrDelete({
				locationId: targetId,
				systemType: props.systemType
			});
			if (result.action === "no-op") {
				handleError(new Error("此地點不包含本系統"), "刪除地點失敗");
				pendingDeleteLocation.value = null;
				return;
			}
			toast.success(getLocationDeleteSuccessToast(result.action, props.systemType));
		} catch (error) {
			handleError(error, "刪除地點失敗");
			pendingDeleteLocation.value = null;
			return;
		}

		commitLocalLocationRemoval(zone, locations, resolvedIndex);
		pendingDeleteLocation.value = null;
		emit("saved");
		reconcileDraftWhenPropsLocationsMatch(zoneId, {
			originalZones: () => props.zones,
			getZoneId,
			getLocations: z => adapter.getLocationsProperty(z)
		});
		return;
	}

	commitLocalLocationRemoval(zone, locations, resolvedIndex);
	pendingDeleteLocation.value = null;
	toast.success(TOAST.LOCATION_REMOVED_FROM_LIST);
};

const isNewZone = (zone: TZone): boolean => {
	const zoneId = getZoneId(zone);
	return Boolean(zoneId?.startsWith("temp-"));
};

const maxZoneSortOrder = (): number => {
	let m = -1;
	for (const z of mergedZones.value) {
		m = Math.max(m, zoneSortOrderValue(z as { sortOrder?: number | null }));
	}
	return m;
};

const snapshotZoneById = (zoneId: string): TZone | undefined => {
	const pending = pendingChanges.value.get(zoneId);
	if (pending) return JSON.parse(JSON.stringify(pending)) as TZone;
	const fromProps = props.zones.find(z => getZoneId(z) === zoneId);
	return fromProps ? (JSON.parse(JSON.stringify(fromProps)) as TZone) : undefined;
};

const isFirstZoneInList = (zone: TZone) => {
	const id = getZoneId(zone);
	if (!id) return true;
	const i = sortedZones.value.findIndex(z => getZoneId(z) === id);
	return i <= 0;
};

const isLastZoneInList = (zone: TZone) => {
	const id = getZoneId(zone);
	if (!id) return true;
	const i = sortedZones.value.findIndex(z => getZoneId(z) === id);
	return i < 0 || i >= sortedZones.value.length - 1;
};

const moveZoneOrder = (zone: TZone, delta: number) => {
	const id = getZoneId(zone);
	if (!id) return;
	const list = sortedZones.value;
	const i = list.findIndex(z => getZoneId(z) === id);
	const j = i + delta;
	if (i < 0 || j < 0 || j >= list.length) return;

	const orderedIds = list.map(z => getZoneId(z)).filter(Boolean);
	if (orderedIds.length !== list.length) return;
	[orderedIds[i], orderedIds[j]] = [orderedIds[j]!, orderedIds[i]!];

	for (let idx = 0; idx < orderedIds.length; idx += 1) {
		const zoneId = orderedIds[idx]!;
		const snap = snapshotZoneById(zoneId);
		if (!snap) continue;
		pendingChanges.value.set(zoneId, { ...snap, sortOrder: idx } as TZone);
	}

	errorMessage.value = "";
};

const handleReorderLocationRow = (
	zone: TZone,
	payload: { index: number; direction: "up" | "down" }
) => {
	const locs = [...adapter.getLocationsProperty(zone)] as SystemLocationType[];
	const { index, direction } = payload;
	const j = direction === "up" ? index - 1 : index + 1;
	if (j < 0 || j >= locs.length) return;
	[locs[index], locs[j]] = [locs[j]!, locs[index]!];
	locs.forEach((loc, idx) => {
		(loc as unknown as { sortOrder?: number }).sortOrder = idx;
	});
	const updatedZone = adapter.setLocationsProperty(zone, locs);
	updateZone(updatedZone);
};

const addNewZone = () => {
	const tempId = `temp-${Date.now()}-${Math.random()}`;

	const newZone = {
		...adapter.createNewZone(""),
		id: tempId,
		sortOrder: maxZoneSortOrder() + 1
	} as TZone;

	// 僅加入待儲存表，不立即寫入資料庫
	// 使用 JSON 深拷貝，避免 structuredClone 對部分對象失敗
	pendingChanges.value.set(tempId, JSON.parse(JSON.stringify(newZone)) as TZone);

	// 自動展開新區域
	expandedZones.value.add(tempId);
};

const flushFocusedFormControlInDialog = async () => {
	if (typeof document === "undefined") return;
	const raw = document.activeElement;
	if (!raw || !(raw instanceof HTMLElement)) return;
	if (!raw.closest(".dialog-panel-bg")) return;
	const tag = raw.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		raw.blur();
		await nextTick();
	}
};

const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0 || isSaving.value) return;

	await flushFocusedFormControlInDialog();

	errorMessage.value = "";
	const zoneAny = (zone: TZone) => zone as any;

	// 驗證各區域保存前資料
	for (const zone of pendingChanges.value.values()) {
		const locations = adapter.getLocationsProperty(zone);
		const result = validateSystemZoneForSave({
			systemType: props.systemType,
			requireImageUrl: props.requireImageUrl,
			zone,
			locations
		});
		if (!result.isValid) {
			errorMessage.value = joinFormErrors(result.errors);
			return;
		}
	}

	const zonesToSave = Array.from(pendingChanges.value.entries());
	const saveCount = zonesToSave.length;

	isSaving.value = true;
	try {
		const results = await Promise.allSettled(
			zonesToSave.map(async ([, zone]) => {
				const cleanedZone = adapter.filterEmptyLocations(zone as TZone);
				const isNewZone = zoneAny(zone).id?.startsWith("temp-");
				if (isNewZone) {
					const { id, ...zoneWithoutId } = zoneAny(cleanedZone);
					await props.onSaveZone(zoneWithoutId as TZone);
				} else {
					await props.onSaveZone(cleanedZone);
				}
			})
		);

		const succeededIds: string[] = [];
		const failures: PromiseRejectedResult[] = [];
		results.forEach((result, index) => {
			if (result.status === "fulfilled") {
				succeededIds.push(zonesToSave[index]![0]);
			} else {
				failures.push(result);
			}
		});

		for (const zoneId of succeededIds) {
			deleteDraft(zoneId);
		}

		if (failures.length === 0) {
			toast.success(saveCount === 1 ? TOAST.ZONE_SAVED : TOAST.ZONES_SAVED(saveCount));
			emit("saved");
		} else if (succeededIds.length > 0) {
			toast.warning(TOAST.ZONE_PARTIAL_SAVE_FAILED(failures.length, saveCount));
			errorMessage.value = resolveFormApiError(failures[0]!.reason, "部分區域儲存失敗");
			emit("saved");
		} else {
			errorMessage.value = resolveFormApiError(failures[0]!.reason, "儲存區域失敗");
		}
	} finally {
		isSaving.value = false;
	}
};

const pendingDeleteZoneId = ref<string | null>(null);

const handleDeleteZone = (zoneId: string) => {
	pendingDeleteZoneId.value = zoneId;
	confirmAction.value = "delete";
	confirmDialog.show(buildDeleteZoneConfirmCopy({ systemType: props.systemType }));
};

const handleConfirmDelete = () => {
	const zoneId = pendingDeleteZoneId.value;
	if (!zoneId) return;

	if (!zoneId.startsWith("temp-")) {
		emit("delete", zoneId);
	}
	deleteDraft(zoneId);
	pendingDeleteZoneId.value = null;
};
</script>
