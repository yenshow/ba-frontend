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
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">樓層管理</h3>
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
														<h4 v-if="floor.name" class="text-xl font-bold tracking-wider text-white 2xl:text-2xl">
															{{ floor.name }}
														</h4>
														<span v-else class="text-sm text-white/60 2xl:text-base">未命名</span>
													</div>

													<div class="flex-1">
														<div class="flex items-center gap-3">
															<span
																class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
															>
																{{ floor.areas?.length || 0 }} 個點位
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
														<input
															:ref="
																el => {
																	if (el) fileInputRefs.set(floor.id || floor.name, el as HTMLInputElement);
																}
															"
															type="file"
															accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
															class="hidden"
															:data-floor-id="floor.id || floor.name"
															@change="handleFloorImageChange"
														/>
														<button
															v-if="floor.imageUrl"
															type="button"
															class="btn-secondary text-sm 2xl:text-base"
															@click.stop="viewFloorImage(floor.imageUrl)"
														>
															查看示意圖
														</button>
														<button
															type="button"
															class="btn-secondary text-sm 2xl:text-base"
															@click.stop="triggerFloorImageInput(floor.id || floor.name)"
														>
															{{ floor.imageUrl ? "更換" : "上傳" }}示意圖
														</button>
														<button
															v-if="floor.imageUrl"
															type="button"
															class="p-2 text-rose-400 transition-colors hover:text-rose-300"
															@click.stop="removeFloorImage(floor)"
															title="移除圖片"
														>
															<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M6 18L18 6M6 6l12 12"
																/>
															</svg>
														</button>
													</div>

												<!-- 點位列表 -->
												<div class="flex items-center justify-between">
													<span class="text-base font-medium 2xl:text-lg">點位列表</span>
													<button
														type="button"
														class="btn-secondary text-sm 2xl:text-base"
														@click="addPoint(floor)"
													>
														新增點位
													</button>
												</div>

												<!-- 點位項目 -->
												<div
													v-if="!floor.areas || floor.areas.length === 0"
													class="py-4 text-center text-sm text-white/60 2xl:text-base"
												>
													尚無點位，請新增點位
												</div>
												<div v-else class="space-y-2">
													<div
														v-for="(area, areaIndex) in floor.areas"
														:key="area.id || `area-${areaIndex}`"
														class="flex min-w-0 items-end gap-2 rounded border border-white/10 bg-white/5 p-2"
													>
														<label
															class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
														>
															<span>點位名稱 *</span>
															<input
																v-model="area.name"
																type="text"
																required
																class="form-input-small"
																placeholder="例如：主燈開關"
																@blur="handleAreaChange(floor)"
															/>
														</label>
														<label
															class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
														>
															<span>控制器</span>
															<select
																v-model.number="area.deviceId"
																class="form-input-small form-select min-w-0"
																@change="handleDeviceChange(floor, area, areaIndex)"
																:disabled="isLoadingDevices"
															>
																<option :value="0">請選擇控制器</option>
																<option v-if="isLoadingDevices" value="" disabled>載入中...</option>
																<option v-else-if="devices.length === 0" value="" disabled>尚無可用控制器</option>
																<option v-for="device in devices" :key="device.id" :value="device.id">
																	{{ device.name }}
																</option>
															</select>
														</label>
														<template v-if="area.deviceId && area.modbus?.points?.[0]">
															<label
																class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
															>
																<span>類型 *</span>
																<select
																	v-model="area.modbus.points[0].type"
																	class="form-input-small form-select w-full"
																	required
																	@change="handleTypeChange(floor, area, areaIndex)"
																>
																	<option value="DO">DO</option>
																	<option value="DI">DI</option>
																</select>
															</label>
															<label
																class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
															>
																<span>地址 *</span>
																<div class="relative w-full">
																	<input
																		v-model.number="area.modbus.points[0].address"
																		type="number"
																		min="0"
																		placeholder="地址"
																		required
																		class="form-input-small w-full transition-all"
																		:class="
																			checkAddressDuplicate(floor, area, areaIndex)
																				? 'animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]'
																				: ''
																		"
																		title="此地址已被使用"
																		@blur="handleAreaChange(floor)"
																	/>
																	<div
																		v-if="checkAddressDuplicate(floor, area, areaIndex)"
																		class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
																		title="此地址已被使用"
																	>
																		<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
																			<path
																				fill-rule="evenodd"
																				d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
																				clip-rule="evenodd"
																			/>
																		</svg>
																	</div>
																</div>
															</label>
														</template>
														<button
															type="button"
															class="ml-auto flex-shrink-0 p-2 text-rose-400 transition-colors hover:text-rose-300"
															@click="removeArea(floor, areaIndex)"
															title="刪除點位"
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
												<p v-if="devices.length === 0 && !isLoadingDevices" class="mt-1 text-xs text-amber-300">
													請先在「設備管理」中建立控制器設備
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
import type { LightingFloor, LightingArea } from "~/types/lighting";
import type { Device, ControllerDeviceConfig } from "~/types/device";
import { useDeviceApi } from "~/composables/useDeviceApi";

interface Props {
	modelValue: boolean;
	floors: LightingFloor[];
}

interface Emits {
	(e: "update:modelValue", value: boolean): void;
	(e: "save", floor: LightingFloor): void;
	(e: "delete", floorId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const deviceApi = useDeviceApi();

const isLoading = ref(false);
const errorMessage = ref("");
const expandedFloors = ref<Set<string>>(new Set());
const devices = ref<Device[]>([]);
const isLoadingDevices = ref(false);
const fileInputRefs = ref<Map<string, HTMLInputElement>>(new Map());

// 批次處理：追蹤待保存的變更（不使用自動儲存，統一使用儲存按鈕）
const pendingChanges = ref<Map<string, LightingFloor>>(new Map());

// 檢查是否有未保存的變更
const hasUnsavedChanges = computed(() => pendingChanges.value.size > 0);

// 合併 props.floors 和 pendingChanges，用於顯示（包含待保存的變更）
const mergedFloors = computed(() => {
	const floorsMap = new Map<string, LightingFloor>();

	// 先添加所有 props.floors
	props.floors.forEach(floor => {
		const floorId = floor.id || floor.name;
		floorsMap.set(floorId, { ...floor });
	});

	// 然後用 pendingChanges 覆蓋（待保存的變更優先）
	pendingChanges.value.forEach((floor, floorId) => {
		floorsMap.set(floorId, { ...floor });
	});

	return Array.from(floorsMap.values());
});

// 排序樓層：1F 在前面，2F 在後面（按樓層名稱的自然排序）
const sortedFloors = computed(() => {
	if (!mergedFloors.value || mergedFloors.value.length === 0) return [];

	return [...mergedFloors.value].sort((a, b) => {
		const nameA = a.name || "";
		const nameB = b.name || "";
		// 提取數字部分進行比較（例如 "1F" -> 1, "2F" -> 2）
		const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
		const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
		return numA - numB;
	});
});

// 載入設備列表
const loadDevices = async () => {
	isLoadingDevices.value = true;
	try {
		const result = await deviceApi.getDevices({
			type_code: "controller",
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

// 當對話框打開時載入設備列表
watch(
	() => props.modelValue,
	newValue => {
		if (newValue) {
			loadDevices();
		}
	}
);

// 切換樓層展開/收起
const toggleFloor = (floorId: string) => {
	if (expandedFloors.value.has(floorId)) {
		expandedFloors.value.delete(floorId);
	} else {
		expandedFloors.value.add(floorId);
	}
};

const handleClose = () => {
	// 如果有未保存的變更，提示用戶
	if (hasUnsavedChanges.value) {
		if (!confirm("您有未保存的變更，確定要關閉嗎？未保存的變更將會遺失。")) {
			return;
		}
		// 不自動保存，讓用戶自行決定是否保存
	}
	emit("update:modelValue", false);
	expandedFloors.value.clear();
	pendingChanges.value.clear();
};

// 將變更加入待保存列表（不自動保存，統一使用儲存按鈕）
const queueSave = (floor: LightingFloor) => {
	pendingChanges.value.set(floor.id || floor.name, { ...floor });
};

// 過濾掉名稱為空的區域（避免保存未完成的點位）
const filterEmptyAreas = (floor: LightingFloor): LightingFloor => {
	return {
		...floor,
		areas: (floor.areas || []).filter(area => area.name && area.name.trim().length > 0)
	};
};

// 驗證樓層是否有地址重複
const validateFloorAddresses = (floor: LightingFloor): string | null => {
	for (let i = 0; i < floor.areas.length; i++) {
		const area = floor.areas[i];
		if (!area.deviceId || !area.modbus?.points?.[0]) continue;

		const deviceId = area.deviceId;
		const type = area.modbus.points[0].type;
		const address = area.modbus.points[0].address;

		if (address === undefined) continue;

		if (isAddressDuplicate(floor, deviceId, type, address, i)) {
			return `點位「${area.name || `點位 ${i + 1}`}」的地址 ${address} 與其他點位重複（設備 ${deviceId}，類型 ${type}）`;
		}
	}

	return null;
};

// 保存所有待保存的變更（手動觸發）
const saveAllChanges = async () => {
	if (pendingChanges.value.size === 0) return;

	// 驗證所有待保存的樓層是否有地址重複
	for (const [floorId, floor] of pendingChanges.value.entries()) {
		const validationError = validateFloorAddresses(floor);
		if (validationError) {
			errorMessage.value = validationError;
			return;
		}
	}

	// 清除錯誤訊息
	errorMessage.value = "";

	for (const [floorId, floor] of pendingChanges.value.entries()) {
		const filteredFloor = filterEmptyAreas(floor);
		// 只有當樓層存在且有有效區域，或是新樓層時才保存
		if (filteredFloor.areas.length > 0 || !floor.id) {
			emit("save", filteredFloor);
		}
	}

	pendingChanges.value.clear();
};

// 追蹤新創建的樓層（用於自動展開）
const newFloorName = ref<string>("");

// 新增樓層
const addNewFloor = () => {
	const tempName = `${props.floors.length + 1}F`;
	newFloorName.value = tempName;

	const newFloor: LightingFloor = {
		name: tempName,
		imageUrl: "",
		areas: []
	};

	// 觸發保存以創建新樓層
	emit("save", newFloor);
};

// 監聽樓層列表變化，自動展開新創建的樓層
watch(
	() => props.floors,
	newFloors => {
		if (newFloorName.value) {
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
const updateFloorName = (floor: LightingFloor, newName: string) => {
	const updatedFloor = {
		...floor,
		name: newName.trim()
	};
	queueSave(updatedFloor);
};

// 觸發圖片輸入
const triggerFloorImageInput = (floorId: string) => {
	const input = fileInputRefs.value.get(floorId);
	if (input) {
		input.click();
	}
};

// 處理樓層圖片變更
const handleFloorImageChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	const floorId = target.getAttribute("data-floor-id");
	if (!floorId || !target.files?.[0]) return;

	const floor = props.floors.find(f => (f.id || f.name) === floorId);
	if (!floor) return;

	processFloorImageFile(floor, target.files[0]);
	target.value = ""; // 重置 input
};

// 處理圖片檔案
const processFloorImageFile = (floor: LightingFloor, file: File) => {
	// 驗證檔案類型
	const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
	if (!validTypes.includes(file.type)) {
		errorMessage.value = "不支援的檔案格式，請上傳 PNG、JPG、GIF 或 WEBP 格式的圖片";
		return;
	}

	// 驗證檔案大小（10MB）
	const maxSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxSize) {
		errorMessage.value = "檔案大小超過 10MB，請選擇較小的圖片";
		return;
	}

	// 讀取檔案並轉換為 base64
	const reader = new FileReader();
	reader.onload = e => {
		const result = e.target?.result as string;
		if (result) {
			const updatedFloor = {
				...floor,
				imageUrl: result
			};
			queueSave(updatedFloor);
			errorMessage.value = "";
		}
	};
	reader.onerror = () => {
		errorMessage.value = "讀取檔案失敗，請稍後再試";
	};
	reader.readAsDataURL(file);
};

// 移除樓層圖片
const removeFloorImage = (floor: LightingFloor) => {
	const updatedFloor = {
		...floor,
		imageUrl: ""
	};
	queueSave(updatedFloor);
};

// 刪除樓層
const handleDeleteFloor = (floorId: string) => {
	if (confirm("確定要刪除此樓層嗎？此操作將刪除該樓層的所有區域資料。")) {
		emit("delete", floorId);
		expandedFloors.value.delete(floorId);
	}
};

// 檢查地址是否重複（同一設備、同一類型）
const isAddressDuplicate = (
	floor: LightingFloor,
	deviceId: number | undefined,
	type: string | undefined,
	address: number | undefined,
	excludeAreaIndex?: number
): boolean => {
	if (!deviceId || !type || address === undefined) return false;

	return floor.areas.some((area, index) => {
		// 排除自己
		if (excludeAreaIndex !== undefined && index === excludeAreaIndex) return false;

		// 檢查設備ID和類型是否相同
		if (area.deviceId !== deviceId) return false;
		if (area.modbus?.points?.[0]?.type !== type) return false;

		// 檢查地址是否相同
		return area.modbus?.points?.[0]?.address === address;
	});
};

// 檢查地址是否重複（簡化版本，用於模板）
const checkAddressDuplicate = (
	floor: LightingFloor,
	area: LightingArea,
	areaIndex: number
): boolean => {
	return isAddressDuplicate(
		floor,
		area.deviceId,
		area.modbus?.points?.[0]?.type,
		area.modbus?.points?.[0]?.address,
		areaIndex
	);
};

// 計算下一個可用地址（N+1，基於同一設備同一類型的最大地址）
const getNextAvailableAddress = (
	floor: LightingFloor,
	deviceId: number | undefined,
	type: string | undefined
): number => {
	if (!deviceId || !type) return 1;

	// 找出同一設備同一類型的所有地址
	const addresses = floor.areas
		.filter(
			area =>
				area.deviceId === deviceId &&
				area.modbus?.points?.[0]?.type === type &&
				area.modbus?.points?.[0]?.address !== undefined
		)
		.map(area => area.modbus!.points![0].address)
		.filter(addr => typeof addr === "number" && addr >= 0);

	// 如果沒有地址，從 1 開始
	if (addresses.length === 0) return 1;

	// 找出最大地址，然後 +1
	const maxAddress = Math.max(...addresses);
	return maxAddress + 1;
};

// 新增點位（每個點位就是一個區域）
const addPoint = (floor: LightingFloor) => {
	const newArea: LightingArea = {
		name: ""
		// 不設定 location，讓用戶透過 CategoryList 拖曳到地圖上
	};

	const updatedFloor = {
		...floor,
		areas: [...(floor.areas || []), newArea]
	};

	// 新增點位時只更新本地狀態，等待用戶輸入名稱後再保存
	const floorId = floor.id || floor.name;
	pendingChanges.value.set(floorId, updatedFloor);
};

// 刪除區域
const removeArea = (floor: LightingFloor, areaIndex: number) => {
	if (!confirm("確定要刪除此區域嗎？")) return;

	const updatedAreas = [...(floor.areas || [])];
	updatedAreas.splice(areaIndex, 1);

	const updatedFloor = {
		...floor,
		areas: updatedAreas
	};

	queueSave(updatedFloor);
};

// 處理區域變更（批次保存）
const handleAreaChange = (floor: LightingFloor) => {
	const updatedFloor = {
		...floor,
		areas: floor.areas.map(area => ({
			...area,
			name: area.name?.trim() || ""
		}))
	};

	queueSave(updatedFloor);
};

// 處理設備選擇變更（每個區域只有一個點位）
const handleDeviceChange = (floor: LightingFloor, area: LightingArea, areaIndex: number) => {
	const deviceId = area.deviceId;

	if (deviceId && deviceId > 0) {
		const currentType = area.modbus?.points?.[0]?.type || "DO";
		const currentAddress = area.modbus?.points?.[0]?.address;

		if (!area.modbus) {
			area.modbus = { deviceId, points: [] };
		} else {
			area.modbus.deviceId = deviceId;
		}

		// 確保至少有一個點位
		if (!area.modbus.points || area.modbus.points.length === 0) {
			const nextAddress = getNextAvailableAddress(floor, deviceId, currentType);
			area.modbus.points = [{ address: nextAddress, type: currentType }];
		} else if (!currentAddress || currentAddress === 0) {
			// 如果地址為 0 或未設置，自動填入 N+1
			area.modbus.points[0].address = getNextAvailableAddress(floor, deviceId, currentType);
		}
	} else {
		area.deviceId = undefined;
		area.modbus = undefined;
	}

	handleAreaChange(floor);
};

// 處理類型變更（當類型改變時，重新計算地址）
const handleTypeChange = (floor: LightingFloor, area: LightingArea, areaIndex: number) => {
	if (area.deviceId && area.modbus?.points?.[0]) {
		const type = area.modbus.points[0].type;
		const currentAddress = area.modbus.points[0].address;

		// 如果當前地址在該類型下重複，自動填入 N+1
		if (isAddressDuplicate(floor, area.deviceId, type, currentAddress, areaIndex)) {
			const nextAddress = getNextAvailableAddress(floor, area.deviceId, type);
			area.modbus.points[0].address = nextAddress;
		}
	}

	handleAreaChange(floor);
};

// 查看樓層示意圖（另開顯示）
const viewFloorImage = (imageUrl: string) => {
	if (!imageUrl) return;

	// 創建一個新的窗口顯示圖片
	const newWindow = window.open();
	if (newWindow) {
		newWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>樓層示意圖</title>
					<style>
						body {
							margin: 0;
							padding: 20px;
							background: #1a1a1a;
							display: flex;
							justify-content: center;
							align-items: center;
							min-height: 100vh;
						}
						img {
							max-width: 100%;
							max-height: 100vh;
							object-fit: contain;
						}
					</style>
				</head>
				<body>
					<img src="${imageUrl}" alt="樓層示意圖" />
				</body>
			</html>
		`);
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

.btn-secondary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-list-edit,
.btn-list-delete {
	border-radius: 0.5rem;
	padding: 0.5rem 1rem;
	font-size: 0.875rem;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-list-edit {
	background: rgba(59, 130, 246, 0.8);
	color: white;
}

.btn-list-edit:hover {
	background: rgba(96, 165, 250, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-list-delete {
	background: rgba(239, 68, 68, 0.8);
	color: white;
}

.btn-list-delete:hover {
	background: rgba(248, 113, 113, 0.9);
	transform: translateY(-1px);
	box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

@media (min-width: 1536px) {
	.btn-list-edit,
	.btn-list-delete {
		padding: 0.625rem 1.25rem;
		font-size: 1rem;
	}
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
