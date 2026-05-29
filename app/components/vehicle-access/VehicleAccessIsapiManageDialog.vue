<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="vehicle-isapi-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3
							id="vehicle-isapi-manage-title"
							class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							車牌管理
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<div v-if="deviceOptions.length === 0" class="py-8 text-center text-white/60">
								<p class="text-base 2xl:text-lg">此地點尚未設定入口或出口攝影機</p>
								<p class="mt-2 text-sm 2xl:text-base">請至「地點管理」設定 ISAPI 攝影機</p>
							</div>

							<div v-else class="space-y-3">
								<div
									v-for="opt in deviceOptions"
									:key="opt.id"
									class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
									:class="{ 'bg-white/15': isDeviceExpanded(opt.id) }"
								>
									<div
										class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
										role="button"
										tabindex="0"
										:aria-expanded="isDeviceExpanded(opt.id)"
										:aria-label="`${opt.label} 車牌名單`"
										@click="handleToggleDevice(opt.id)"
										@keydown.enter="handleToggleDevice(opt.id)"
										@keydown.space.prevent="handleToggleDevice(opt.id)"
									>
										<div class="flex min-w-0 flex-1 items-center gap-4">
											<svg
												class="h-5 w-5 shrink-0 text-white/70 transition-transform"
												:class="{ 'rotate-90': isDeviceExpanded(opt.id) }"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
											<div
												class="flex h-16 min-w-[80px] max-w-[12rem] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-3 shadow-lg"
											>
												<h4 class="truncate text-xl font-bold tracking-wider text-white 2xl:text-2xl">
													{{ opt.label }}
												</h4>
											</div>
											<span
												class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
											>
												{{ getPlateCountLabel(opt.id) }}
											</span>
										</div>
									</div>

									<Transition name="expand">
										<div v-if="isDeviceExpanded(opt.id)" class="space-y-3 border-t border-white/10 p-4">
											<div class="flex items-center justify-between">
												<span class="text-base font-medium 2xl:text-lg">車牌名單</span>
												<button
													v-if="canWrite"
													type="button"
													class="btn-secondary"
													@click="handleOpenPlateForm(opt.id)"
												>
													新增車牌
												</button>
											</div>

											<div v-if="isLoadingDevice(opt.id)" class="flex justify-center py-8">
												<div
													class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
												></div>
											</div>
											<p v-else-if="getDeviceError(opt.id)" class="text-base text-rose-300 2xl:text-lg">
												{{ getDeviceError(opt.id) }}
											</p>
											<div
												v-else-if="getDevicePlates(opt.id).length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無車牌名單資料
											</div>
											<div v-else class="overflow-x-auto rounded border border-white/10 bg-white/5 p-2">
												<table class="w-full min-w-[520px] text-left text-base text-white/90 2xl:text-lg">
													<thead>
														<tr class="border-b border-white/15 text-white/60">
															<th class="px-2 py-2 font-medium">車牌</th>
															<th class="px-2 py-2 font-medium">車主姓名</th>
															<th class="px-2 py-2 font-medium">名單類型</th>
															<th class="px-2 py-2 font-medium">開始時間</th>
															<th class="px-2 py-2 font-medium">結束時間</th>
															<th v-if="canWrite" class="px-2 py-2 font-medium">操作</th>
														</tr>
													</thead>
													<tbody>
														<tr
															v-for="row in getDevicePlates(opt.id)"
															:key="`${opt.id}-${row.id}`"
															class="border-b border-white/10 last:border-b-0"
														>
															<td class="px-2 py-2">{{ row.licensePlate }}</td>
															<td class="px-2 py-2 text-white/70">
																{{ row.bindPersonLabel || "—" }}
															</td>
															<td class="px-2 py-2">
																<span
																	class="rounded-full px-2 py-0.5 text-xs 2xl:text-sm"
																	:class="
																		row.listType === 'allowList'
																			? 'bg-emerald-500/20 text-emerald-200'
																			: 'bg-rose-500/20 text-rose-200'
																	"
																>
																	{{ licensePlateListTypeShortLabel(row.listType) }}
																</span>
															</td>
															<td class="px-2 py-2 text-white/70">
																{{ formatLicensePlateDisplayTime(row.createTime) }}
															</td>
															<td class="px-2 py-2 text-white/70">
																{{ formatLicensePlateDisplayTime(row.effectiveTime) }}
															</td>
															<td v-if="canWrite" class="px-2 py-2">
																<button
																	type="button"
																	class="mr-3 text-cyan-300 hover:underline"
																	@click="handleOpenPlateForm(opt.id, row)"
																>
																	編輯
																</button>
																<button
																	type="button"
																	class="text-rose-300 hover:underline"
																	@click="handleDeletePlate(opt.id, row)"
																>
																	刪除
																</button>
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
									</Transition>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<VehicleAccessIsapiPlateFormDialog
		v-if="formDeviceId != null"
		v-model:form="plateForm"
		:mode="plateFormMode"
		:person-bind-options="personBindOptions"
		:is-loading-person-options="isLoadingPersonOptions"
		:is-saving="isSavingPlate"
		@save="handleSavePlate(formDeviceId)"
		@cancel="handleCancelPlateForm"
	/>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation, VehicleLicensePlateAuditItem } from "~/types/vehicleAccess";
import { useVehicleAccessIsapiDeviceApi } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiDeviceApi";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { useToast } from "~/composables/core/useToast";
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils";
import {
	buildIsapiPlateUpsertEntry,
	createDefaultIsapiPlateForm,
	formatLicensePlateDisplayTime,
	formatPersonBindLabel,
	isapiPlateFormFromAuditRow,
	licensePlateListTypeShortLabel,
	type IsapiPlateFormModel
} from "~/utils/licensePlateFormUtils";
import VehicleAccessIsapiPlateFormDialog from "~/components/vehicle-access/VehicleAccessIsapiPlateFormDialog.vue";

interface DeviceOption {
	id: number;
	label: string;
}

const props = defineProps<{
	modelValue: boolean;
	location: VehicleAccessLocation | null;
	canWrite?: boolean;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
}>();

const isapiApi = useVehicleAccessIsapiDeviceApi();
const deviceApi = useDeviceApi();
const personnelApi = usePersonnelApi();
const toast = useToast();

const deviceNameMap = ref<Record<number, string>>({});
const expandedDevices = ref<Set<number>>(new Set());
const platesByDevice = ref<Record<number, VehicleLicensePlateAuditItem[]>>({});
const loadingByDevice = ref<Record<number, boolean>>({});
const errorByDevice = ref<Record<number, string>>({});

const formDeviceId = ref<number | null>(null);
const plateFormMode = ref<"add" | "modify">("add");
const isSavingPlate = ref(false);
const plateForm = ref<IsapiPlateFormModel>(createDefaultIsapiPlateForm());

const personBindOptions = ref<Array<{ value: string; label: string }>>([]);
const isLoadingPersonOptions = ref(false);

const siteId = computed(() => {
	const raw = props.location?.id ?? props.location?.locationId;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
});

const deviceIds = computed(() => {
	const entry = props.location?.entryCameraDeviceIds ?? [];
	const exit = props.location?.exitCameraDeviceIds ?? [];
	return [...new Set([...entry, ...exit].filter(id => Number.isFinite(Number(id))))];
});

const deviceOptions = computed((): DeviceOption[] =>
	deviceIds.value.map(id => ({
		id,
		label: deviceNameMap.value[id] || `設備 #${id}`
	}))
);

const apiParams = computed(() => ({
	siteId: siteId.value
}));

const isDeviceExpanded = (deviceId: number) => expandedDevices.value.has(deviceId);

const getDevicePlates = (deviceId: number) => platesByDevice.value[deviceId] ?? [];

const isLoadingDevice = (deviceId: number) => loadingByDevice.value[deviceId] === true;

const getDeviceError = (deviceId: number) => errorByDevice.value[deviceId] ?? "";

const getPlateCountLabel = (deviceId: number) => {
	if (isLoadingDevice(deviceId)) return "載入中…";
	const count = getDevicePlates(deviceId).length;
	if (errorByDevice.value[deviceId]) return "載入失敗";
	if (!expandedDevices.value.has(deviceId) && count === 0) return "0 筆";
	return `${count} 筆`;
};

const loadPersonBindOptions = async () => {
	const groupIds = props.location?.personGroupIds ?? [];
	if (groupIds.length === 0) {
		personBindOptions.value = [];
		return;
	}
	isLoadingPersonOptions.value = true;
	try {
		const res = await personnelApi.getPersons({
			personGroupIds: groupIds,
			limit: 200,
			offset: 0
		});
		personBindOptions.value = (res.items ?? []).map(p => ({
			value: String(p.id),
			label: formatPersonBindLabel(p.employee_no, p.full_name) || `人員 #${p.id}`
		}));
	} catch {
		personBindOptions.value = [];
	} finally {
		isLoadingPersonOptions.value = false;
	}
};

const ensurePersonBindOption = (personId: number, label: string) => {
	const value = String(personId);
	if (personBindOptions.value.some(o => o.value === value)) return;
	personBindOptions.value = [
		...personBindOptions.value,
		{ value, label: label || `人員 #${personId}` }
	];
};

const enrichPlatesWithBindings = async (
	items: VehicleLicensePlateAuditItem[]
): Promise<VehicleLicensePlateAuditItem[]> => {
	const plateNumbers = items.map(i => i.licensePlate).filter(Boolean);
	if (plateNumbers.length === 0) return items;
	try {
		const res = await personnelApi.getLicensePlateBindings(plateNumbers);
		const map = new Map(
			(res.items ?? []).map(b => [String(b.plate_normalized || b.plate_number).toUpperCase(), b])
		);
		return items.map(item => {
			const key = item.licensePlate.trim().toUpperCase();
			const b = map.get(key);
			if (!b) return item;
			const name = b.full_name?.trim();
			return {
				...item,
				bindPersonId: b.person_id,
				...(name ? { bindPersonLabel: name } : {})
			};
		});
	} catch {
		return items;
	}
};

const loadDeviceNames = async () => {
	if (deviceIds.value.length === 0) return;
	try {
		const res = await deviceApi.getDevices({ type_code: "camera", limit: 200 });
		const map: Record<number, string> = {};
		for (const dev of res.devices || []) {
			if (dev.id != null) map[dev.id] = dev.name?.trim() || `設備 #${dev.id}`;
		}
		deviceNameMap.value = map;
	} catch {
		deviceNameMap.value = {};
	}
};

const loadPlatesForDevice = async (deviceId: number) => {
	loadingByDevice.value = { ...loadingByDevice.value, [deviceId]: true };
	errorByDevice.value = { ...errorByDevice.value, [deviceId]: "" };
	try {
		const res = await isapiApi.searchLicensePlates(deviceId, {
			...apiParams.value,
			maxResults: 200
		});
		const enriched = await enrichPlatesWithBindings(res.items ?? []);
		platesByDevice.value = { ...platesByDevice.value, [deviceId]: enriched };
	} catch (e) {
		errorByDevice.value = {
			...errorByDevice.value,
			[deviceId]: resolveUserFacingCatchMessage(e, "載入車牌名單失敗")
		};
		platesByDevice.value = { ...platesByDevice.value, [deviceId]: [] };
	} finally {
		loadingByDevice.value = { ...loadingByDevice.value, [deviceId]: false };
	}
};

const handleToggleDevice = async (deviceId: number) => {
	const next = new Set(expandedDevices.value);
	if (next.has(deviceId)) {
		next.delete(deviceId);
		if (formDeviceId.value === deviceId) handleCancelPlateForm();
	} else {
		next.add(deviceId);
		if (!platesByDevice.value[deviceId] && !loadingByDevice.value[deviceId]) {
			await loadPlatesForDevice(deviceId);
		}
	}
	expandedDevices.value = next;
};

const ensureDeviceExpanded = async (deviceId: number) => {
	if (expandedDevices.value.has(deviceId)) return;
	expandedDevices.value = new Set([...expandedDevices.value, deviceId]);
	if (platesByDevice.value[deviceId] === undefined && !loadingByDevice.value[deviceId]) {
		await loadPlatesForDevice(deviceId);
	}
};

const handleOpenPlateForm = async (deviceId: number, row?: VehicleLicensePlateAuditItem) => {
	formDeviceId.value = deviceId;
	await ensureDeviceExpanded(deviceId);
	if (row) {
		plateFormMode.value = "modify";
		if (row.bindPersonId != null && row.bindPersonLabel) {
			ensurePersonBindOption(Number(row.bindPersonId), row.bindPersonLabel);
		}
		plateForm.value = isapiPlateFormFromAuditRow(row);
	} else {
		plateFormMode.value = "add";
		plateForm.value = createDefaultIsapiPlateForm();
	}
};

const handleCancelPlateForm = () => {
	formDeviceId.value = null;
};

const handleSavePlate = async (deviceId: number) => {
	const built = buildIsapiPlateUpsertEntry(
		plateForm.value,
		plateFormMode.value === "add" ? "add" : "modify"
	);
	if ("error" in built) {
		toast.warning(built.error);
		return;
	}
	isSavingPlate.value = true;
	try {
		await isapiApi.upsertLicensePlates(deviceId, {
			...apiParams.value,
			plates: [built.entry]
		});
		toast.success("已儲存車牌名單");
		handleCancelPlateForm();
		await loadPlatesForDevice(deviceId);
	} catch (e) {
		toast.error(resolveUserFacingCatchMessage(e, "儲存車牌名單失敗"));
	} finally {
		isSavingPlate.value = false;
	}
};

const handleDeletePlate = async (deviceId: number, row: VehicleLicensePlateAuditItem) => {
	if (!window.confirm(`確定刪除車牌 ${row.licensePlate}？`)) return;
	try {
		await isapiApi.deleteLicensePlates(deviceId, {
			...apiParams.value,
			licensePlates: [row.licensePlate]
		});
		toast.success("已刪除");
		await loadPlatesForDevice(deviceId);
	} catch (e) {
		toast.error(resolveUserFacingCatchMessage(e, "刪除車牌失敗"));
	}
};

const handleClose = () => {
	handleCancelPlateForm();
	emit("update:modelValue", false);
};

const resetState = () => {
	expandedDevices.value = new Set();
	platesByDevice.value = {};
	loadingByDevice.value = {};
	errorByDevice.value = {};
	handleCancelPlateForm();
};

watch(
	() => props.modelValue,
	async open => {
		if (!open) return;
		resetState();
		await loadDeviceNames();
		await loadPersonBindOptions();
		const first = deviceIds.value[0];
		if (first != null) {
			expandedDevices.value = new Set([first]);
			await loadPlatesForDevice(first);
		}
	}
);
</script>
