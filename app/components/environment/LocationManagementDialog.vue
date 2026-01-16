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
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">地點管理</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="floors.length > 0" :key="`floors-${floors.length}`">
									<div class="space-y-3">
										<div
											v-for="floor in sortedFloors"
											:key="floor.id || floor.name"
											class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
											:class="{ 'bg-white/15': expandedFloors.has(floor.id || floor.name) }"
										>
											<!-- 樓層標題列（可點擊展開） -->
											<div
												class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
												@click="toggleFloor(floor.id || floor.name)"
											>
												<div class="flex flex-1 items-center gap-4">
													<!-- 展開/收起圖標 -->
													<svg
														class="h-5 w-5 text-white/70 transition-transform"
														:class="{ 'rotate-90': expandedFloors.has(floor.id || floor.name) }"
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
													<!-- 樓層名稱 -->
													<div
														class="flex h-16 min-w-[80px] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 shadow-lg"
													>
														<h4
															v-if="floor.name"
															class="text-xl font-bold tracking-wider text-white 2xl:text-2xl"
														>
															{{ floor.name }}
														</h4>
														<span v-else class="text-sm text-white/60 2xl:text-base">未命名</span>
													</div>

													<div class="flex-1">
														<div class="flex items-center gap-3">
															<span
																class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
															>
																{{ floor.locations?.length ? "1 個地點" : "0 個地點" }}
															</span>
														</div>
													</div>
												</div>
												<div class="ml-4 flex gap-2 2xl:gap-3" @click.stop>
													<button
														type="button"
														class="p-2 text-rose-400 transition-colors hover:text-rose-300"
														@click.stop="handleDeleteFloor(floor.id || floor.name)"
														title="刪除樓層"
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
													v-if="expandedFloors.has(floor.id || floor.name)"
													class="space-y-3 border-t border-white/10 p-4"
												>
													<!-- 樓層基本資訊 -->
													<div class="flex items-center gap-3 border-b border-white/10 pb-3">
														<span class="text-base font-medium 2xl:text-lg">樓層名稱</span>
														<input
															:value="floor.name"
															type="text"
															required
															class="form-input-small flex-1"
															placeholder="例如：1F、2F"
															@input="updateFloorName(floor, ($event.target as HTMLInputElement).value)"
														/>
													</div>

													<!-- 地點資訊 -->
													<div class="space-y-3">
														<div class="rounded border border-white/10 bg-white/5 p-4">
															<div class="mb-3">
																<h5 class="text-base font-semibold text-white 2xl:text-lg">地點</h5>
															</div>

															<div class="space-y-3">
																<!-- 地點名稱 -->
																<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
																	<span>地點名稱 *</span>
																	<input
																		:value="getLocation(floor)?.name || ''"
																		type="text"
																		required
																		class="form-input-small"
																		placeholder="例如：管理中心、展廳"
																		@input="handleLocationNameInput(floor, ($event.target as HTMLInputElement).value)"
																		@blur="handleLocationChange(floor)"
																	/>
																</label>

																<!-- 感測器設備 -->
																<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
																	<span>感測器設備</span>
																	<select
																		:value="getLocation(floor)?.deviceId || 0"
																		class="form-input-small form-select"
																		@change="handleDeviceChange(floor, getOrCreateLocation(floor), Number(($event.target as HTMLSelectElement).value))"
																		:disabled="isLoadingDevices"
																	>
																		<option :value="0">請選擇感測器</option>
																		<option v-if="isLoadingDevices" value="" disabled>載入中...</option>
																		<option v-else-if="devices.length === 0" value="" disabled>尚無可用感測器</option>
																		<option v-for="device in devices" :key="device.id" :value="device.id">
																			{{ device.name }}
																		</option>
																	</select>
																</label>

																<!-- 感測器參數列表（從設備型號讀取） -->
																<div class="border-t border-white/10 pt-3">
																	<div class="mb-3">
																		<span class="text-sm font-medium text-white/80 2xl:text-base">感測器參數</span>
																	</div>

																	<!-- 未選擇設備時的提示 -->
																	<div
																		v-if="!getLocation(floor)?.deviceId"
																		class="py-2 text-center text-xs text-amber-300 2xl:text-sm"
																	>
																		請先選擇感測器設備以顯示可用參數
																	</div>

																	<!-- 已選擇設備，顯示可用參數列表 -->
																	<template v-else>
																		<div
																			v-if="getLocation(floor) && getAvailableParameters(getLocation(floor)!).length === 0"
																			class="py-2 text-center text-xs text-white/50 2xl:text-sm"
																		>
																			<p>此設備型號尚未配置參數</p>
																			<p class="mt-1 text-xs">請在「設備型號管理」中設定參數配置</p>
																		</div>
																		<div v-else-if="getLocation(floor)" class="grid grid-cols-2 gap-2">
																			<label
																				v-for="paramDef in getAvailableParameters(getLocation(floor)!)"
																				:key="paramDef.type"
																				class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
																				:class="{
																					'border-cyan-400/50 bg-cyan-500/20': getLocation(floor) && isParameterEnabled(
																						getLocation(floor)!,
																						paramDef.type as SensorParameterType
																					)
																				}"
																			>
																				<input
																					type="checkbox"
																					:checked="
																						getLocation(floor) && isParameterEnabled(
																							getLocation(floor)!,
																							paramDef.type as SensorParameterType
																						)
																					"
																					@change="
																						toggleParameter(
																							floor,
																							getOrCreateLocation(floor),
																							paramDef.type as SensorParameterType
																						)
																					"
																					class="h-4 w-4 cursor-pointer accent-cyan-400"
																				/>
																				<span class="text-xs text-white/90 2xl:text-sm">
																					{{ getParameterDisplayName(paramDef.type as SensorParameterType) }}
																				</span>
																				<span
																					v-if="paramDef.modbusConfig"
																					class="ml-auto text-xs text-white/50"
																					title="Modbus 地址: {{ paramDef.modbusConfig.address }}"
																				>
																					Addr: {{ paramDef.modbusConfig.address }}
																				</span>
																			</label>
																		</div>
																	</template>
																</div>
															</div>
														</div>
													</div>
													<p
														v-if="devices.length === 0 && !isLoadingDevices"
														class="mt-1 text-xs text-amber-300"
													>
														請先在「設備管理」中建立感測器設備
													</p>
												</div>
											</Transition>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無樓層資料</p>
									<p class="mt-2 text-sm 2xl:text-base">點擊「新增樓層」開始建立</p>
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
						<button type="button" class="btn-primary" @click="addNewFloor">新增樓層</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	EnvironmentFloor,
	EnvironmentLocation,
	SensorParameter,
	SensorParameterType
} from "~/types/environment";
import type { Device, SensorDeviceModelConfig, SensorParameterDefinition } from "~/types/device";
import { useDeviceApi } from "~/composables/systems/useDeviceApi";
import { getParameterDisplayName, cleanFloor } from "~/utils/sensorUtils";

interface Props {
	modelValue: boolean;
	floors: EnvironmentFloor[];
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", floor: EnvironmentFloor): void;
	(e: "delete", floorId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();

const errorMessage = ref("");
const expandedFloors = ref<Set<string>>(new Set());
const devices = ref<Device[]>([]);
const isLoadingDevices = ref(false);

// 批次處理：追蹤待保存的變更
const pendingChanges = ref<Map<string, EnvironmentFloor>>(new Map());

// 檢查是否有未保存的變更
const hasUnsavedChanges = computed(() => pendingChanges.value.size > 0);

// cleanLocation 和 cleanFloor 已從 composable 導入

// 限制樓層只有一個地點的輔助函數
const ensureSingleLocation = (floor: EnvironmentFloor): EnvironmentFloor => {
	if (floor.locations && floor.locations.length > 1) {
		return { ...floor, locations: [floor.locations[0]] };
	}
	return floor;
};

// 合併 props.floors 和 pendingChanges，用於顯示
// 簡化邏輯：優先使用已保存的數據，只添加新建立的待保存樓層
const mergedFloors = computed(() => {
	const floorsMap = new Map<string, EnvironmentFloor>();

	// 優先使用 props.floors（已保存的數據）
	props.floors.forEach(floor => {
		if (floor.id) {
			floorsMap.set(floor.id, ensureSingleLocation(cleanFloor(floor)));
		}
	});

	// 只添加沒有 id 的待保存樓層（新建立的）
	pendingChanges.value.forEach((floor, floorId) => {
		// 如果樓層沒有 id 且不在 floorsMap 中，才添加
		if (!floor.id && !floorsMap.has(floorId)) {
			floorsMap.set(floorId, ensureSingleLocation({ ...floor }));
		}
	});

	return Array.from(floorsMap.values());
});

// 排序樓層
const sortedFloors = computed(() => {
	if (!mergedFloors.value || mergedFloors.value.length === 0) return [];

	return [...mergedFloors.value].sort((a, b) => {
		const nameA = a.name || "";
		const nameB = b.name || "";
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
		return numA - numB;
	});
});

// 取得設備型號的參數定義
const getDeviceParameterDefinitions = async (
	deviceId: number
): Promise<SensorParameterDefinition[]> => {
	try {
		// 方法1: 直接從設備 API 取得完整資訊（包含 model.config）
		try {
			const result = await deviceApi.getDevice(deviceId);
			const fullDevice = result.device;

			// 檢查是否有 model 資訊（從 API 返回）
			const modelConfig = (fullDevice as any).model?.config as SensorDeviceModelConfig | undefined;
			if (modelConfig?.sensorParameters) {
				return modelConfig.sensorParameters;
			}

			// 如果沒有 model.config，但有 model_id，則直接取得型號資訊
			if (fullDevice.model_id) {
				const modelResult = await deviceApi.getDeviceModel(fullDevice.model_id);
				const model = modelResult.device_model;
				const modelConfig = model.config as SensorDeviceModelConfig | undefined;
				return modelConfig?.sensorParameters || [];
			}
		} catch (error) {
			console.warn("從設備 API 取得型號配置失敗，嘗試從設備列表查找:", error);
		}

		// 方法2: 從已載入的設備列表中查找（如果設備列表已載入）
		const device = devices.value.find(d => d.id === deviceId);
		if (device && device.model_id) {
			try {
				const modelResult = await deviceApi.getDeviceModel(device.model_id);
				const model = modelResult.device_model;
				const modelConfig = model.config as SensorDeviceModelConfig | undefined;
				return modelConfig?.sensorParameters || [];
			} catch (error) {
				console.error("取得設備型號資訊失敗:", error);
				return [];
			}
		}

		return [];
	} catch (error) {
		console.error("取得設備參數定義失敗:", error);
		return [];
	}
};

// 儲存每個設備的參數定義（快取）
const deviceParameterDefinitions = ref<Map<number, SensorParameterDefinition[]>>(new Map());

// 取得地點的可用參數定義
const getAvailableParameters = (location: EnvironmentLocation): SensorParameterDefinition[] => {
	if (!location.deviceId) return [];
	return deviceParameterDefinitions.value.get(location.deviceId) || [];
};

// 檢查參數是否已啟用
const isParameterEnabled = (
	location: EnvironmentLocation,
	paramType: SensorParameterType
): boolean => {
	return location.parameters.some(p => p.type === paramType && p.enabled);
};

// 載入設備列表
const loadDevices = async (): Promise<void> => {
	isLoadingDevices.value = true;
	try {
		const result = await deviceApi.getDevices({
			type_code: "sensor",
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

// 初始化時為已選擇設備的地點載入參數定義
const initializeLocationParameterDefinitions = async () => {
	// 等待設備列表載入完成
	await new Promise<void>(resolve => {
		if (!isLoadingDevices.value) {
			resolve();
		} else {
			const unwatch = watch(isLoadingDevices, loading => {
				if (!loading) {
					unwatch();
					resolve();
				}
			});
		}
	});

	// 收集所有有設備 ID 的地點（每個樓層只有一個地點）
	const deviceIds = new Set<number>();
	for (const floor of mergedFloors.value) {
		const location = floor.locations?.[0];
		if (location?.deviceId && location.deviceId > 0) {
			deviceIds.add(location.deviceId);
		}
	}

	// 為每個設備載入參數定義
	const loadPromises = Array.from(deviceIds).map(async deviceId => {
		try {
			const paramDefinitions = await getDeviceParameterDefinitions(deviceId);
			if (paramDefinitions.length > 0) {
				deviceParameterDefinitions.value.set(deviceId, paramDefinitions);
			}
		} catch (error) {
			console.error(`載入設備 ${deviceId} 的參數定義失敗:`, error);
		}
	});

	await Promise.all(loadPromises);
};

// 當對話框打開時載入設備列表和參數定義
watch(
	() => props.modelValue,
	newValue => {
		if (newValue) {
			// 先載入設備列表，然後初始化參數定義
			loadDevices().then(() => {
				// 設備列表載入完成後，初始化已存在地點的參數定義
				void initializeLocationParameterDefinitions();
			});
		} else {
			// 關閉對話框時清空快取
			deviceParameterDefinitions.value.clear();
		}
	}
);

// 取得地點（不修改狀態，僅用於讀取）
const getLocation = (floor: EnvironmentFloor): EnvironmentLocation | null => {
	if (!floor.locations || floor.locations.length === 0) {
		return null;
	}
	return floor.locations[0];
};

// 取得或創建地點（確保每個樓層只有一個地點）
// 注意：此函數會修改狀態，應避免在模板中直接調用
const getOrCreateLocation = (floor: EnvironmentFloor): EnvironmentLocation => {
	if (!floor.locations || floor.locations.length === 0) {
		const newLocation: EnvironmentLocation = {
			name: "",
			parameters: []
		};
		const updatedFloor = {
			...floor,
			locations: [newLocation]
		};
		const floorId = floor.id || floor.name;
		pendingChanges.value.set(floorId, updatedFloor);
		return newLocation;
	}
	return floor.locations[0];
};

// 切換樓層展開/收起
const toggleFloor = async (floorId: string) => {
	if (expandedFloors.value.has(floorId)) {
		expandedFloors.value.delete(floorId);
	} else {
		expandedFloors.value.add(floorId);

		// 展開樓層時，確保有一個地點
		const floor = mergedFloors.value.find(f => (f.id || f.name) === floorId);
		if (floor) {
			// 確保樓層有一個地點
			const location = getOrCreateLocation(floor);

			// 為該樓層中有設備 ID 的地點載入參數定義
			if (location.deviceId && location.deviceId > 0) {
				// 為尚未載入的設備載入參數定義
				if (!deviceParameterDefinitions.value.has(location.deviceId)) {
					try {
						const paramDefinitions = await getDeviceParameterDefinitions(location.deviceId);
						if (paramDefinitions.length > 0) {
							deviceParameterDefinitions.value.set(location.deviceId, paramDefinitions);
						}
					} catch (error) {
						console.error(`載入設備 ${location.deviceId} 的參數定義失敗:`, error);
					}
				}
			}
		}
	}
};

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		if (!confirm("您有未保存的變更，確定要關閉嗎？未保存的變更將會遺失。")) {
			return;
		}
	}
	emit("update:modelValue", false);
	expandedFloors.value.clear();
	pendingChanges.value.clear();
};

// 將變更加入待保存列表
const queueSave = (floor: EnvironmentFloor) => {
	pendingChanges.value.set(floor.id || floor.name, { ...floor });
};

// 過濾掉名稱為空的地點（但保留至少一個空地點，如果樓層是新創建的）
const filterEmptyLocations = (floor: EnvironmentFloor): EnvironmentFloor => {
	// 過濾掉名稱為空的地點
	const validLocations = (floor.locations || []).filter(
		loc => loc.name && loc.name.trim().length > 0
	);
	return { ...floor, locations: validLocations };
};

// 保存所有待保存的變更
const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0) return;

	errorMessage.value = "";

	// 先複製待保存的樓層列表，然後立即清除 pendingChanges
	// 避免在保存過程中重複顯示
	const floorsToSave = Array.from(pendingChanges.value.values());
	pendingChanges.value.clear();

	// 逐一保存
	for (const floor of floorsToSave) {
		const filteredFloor = filterEmptyLocations(floor);
		// 允許建立空樓層（沒有地點的樓層），也允許建立有地點的樓層
		emit("save", filteredFloor);
	}
};

// 追蹤新創建的樓層
const newFloorName = ref<string>("");

// 新增樓層
const addNewFloor = () => {
	// 生成不重複的臨時名稱
	let tempName = `${props.floors.length + 1}F`;
	let counter = 1;
	// 確保名稱不重複
	while (props.floors.some(f => f.name.trim() === tempName.trim())) {
		tempName = `${props.floors.length + 1 + counter}F`;
		counter++;
	}

	newFloorName.value = tempName;

	// 新樓層自動創建一個空地點
	const newFloor: EnvironmentFloor = {
		name: tempName,
		locations: [
			{
				name: "",
				parameters: []
			}
		]
	};

	// 直接觸發保存以創建新樓層（統一為照明系統流程）
	emit("save", newFloor);
};

// 監聽樓層列表變化，自動展開新創建的樓層
watch(
	() => props.floors,
	newFloors => {
		if (newFloorName.value) {
			// 查找名稱匹配的樓層（可能是新建立的，也可能是合併後的）
			const newFloor = newFloors.find(f => f.name === newFloorName.value);
			if (newFloor) {
				expandedFloors.value.add(newFloor.id || newFloor.name);
				newFloorName.value = "";
			}
		}
	},
	{ deep: true }
);

// 更新樓層名稱
const updateFloorName = (floor: EnvironmentFloor, newName: string) => {
	const updatedFloor = {
		...floor,
		name: newName.trim()
	};
	queueSave(updatedFloor);
};

// 刪除樓層
const handleDeleteFloor = (floorId: string) => {
	if (confirm("確定要刪除此樓層嗎？此操作將刪除該樓層的所有地點資料。")) {
		emit("delete", floorId);
		expandedFloors.value.delete(floorId);
	}
};

// 處理地點名稱輸入（即時更新，但不觸發保存）
const handleLocationNameInput = (floor: EnvironmentFloor, value: string) => {
	const location = getOrCreateLocation(floor);
	const updatedFloor = {
		...floor,
		locations: [
			{
				...location,
				name: value
			}
		]
	};
	queueSave(updatedFloor);
};

// 處理地點變更
const handleLocationChange = (floor: EnvironmentFloor) => {
	const location = getOrCreateLocation(floor);
	const updatedFloor = {
		...floor,
		locations: [
			{
				...location,
				name: location.name?.trim() || ""
			}
		]
	};

	queueSave(updatedFloor);
};

// 處理設備選擇變更
const handleDeviceChange = async (floor: EnvironmentFloor, location: EnvironmentLocation, deviceId: number) => {
	if (deviceId && deviceId > 0) {
		// 載入設備的參數定義
		const paramDefinitions = await getDeviceParameterDefinitions(deviceId);
		deviceParameterDefinitions.value.set(deviceId, paramDefinitions);

		// 保留現有參數中在新設備型號中也存在的參數
		const availableTypes = new Set(paramDefinitions.map(p => p.type));
		const updatedLocation = {
			...location,
			deviceId,
			parameters: location.parameters.filter(param => availableTypes.has(param.type))
		};

		queueSave({ ...floor, locations: [updatedLocation] });
	} else {
		// 如果取消選擇設備，清空參數
		queueSave({ ...floor, locations: [{ ...location, deviceId: 0, parameters: [] }] });
	}
};

// 切換參數啟用狀態
const toggleParameter = (
	floor: EnvironmentFloor,
	location: EnvironmentLocation,
	paramType: SensorParameterType
) => {
	const currentParam = location.parameters.find(p => p.type === paramType);
	const newParameters: SensorParameter[] = currentParam
		? location.parameters.map(p => (p.type === paramType ? { ...p, enabled: !p.enabled } : p))
		: [...location.parameters, { type: paramType, enabled: true }];

	queueSave({ ...floor, locations: [{ ...location, parameters: newParameters }] });
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

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}

/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
	transition: all 0.3s ease;
	overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
	max-height: 0;
	opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
	max-height: 2000px;
	opacity: 1;
}

/* 表單輸入樣式 */
.form-input-small {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}

.form-input-small:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-input-small:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.form-input-small::placeholder {
	color: rgba(255, 255, 255, 0.5);
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}

@media (min-width: 1536px) {
	.form-input-small {
		padding: 0.625rem 0.875rem;
		font-size: 1rem;
	}
}
</style>
