<template>
	<div>
		<!-- 照明系統頁面內容 - 自定義排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 主要內容 -->
			<section class="flex-[1.3] relative">
				<div class="bg-white/30 rounded-2xl overflow-hidden flex border-2 border-white/80 p-4 xl:p-6 2xl:p-8">
					<!-- 樓層選擇 -->
					<div class="flex flex-col justify-between z-10 text-center text-white py-4">
						<div class="space-y-4">
							<!-- 樓層顯示 -->
							<div class="py-4 w-[60px] 2xl:w-[100px]">
								<span class="inline-flex pb-1 border-b-2 border-white/70 text-2xl xl:text-3xl 2xl:text-5xl tracking-widest">
									{{ selectedFloorName }}
								</span>
							</div>
							<!-- 編輯模式切換按鈕與下拉選單 -->
							<div class="relative">
								<button
									type="button"
									@click="isEditMode = !isEditMode"
									:class="[
										'p-3 whitespace-nowrap rounded-2xl text-white font-light transition-all text-xs 2xl:text-lg',
										isEditMode ? 'bg-white/10 border-2 border-white' : 'bg-transparent border-2 border-white/30'
									]"
								>
									{{ isEditMode ? "完成編輯" : "編輯定位" }}
								</button>
								<!-- 分類點列表下拉選單 -->
								<Transition name="dropdown">
									<CategoryList
										v-if="isEditMode"
										:categories="filteredCategories"
										:editing="isEditMode"
										:selected-category-id="selectedCategory"
										@select="handleSelectCategory"
										@add="openCreateCategory"
										@edit="handleEditCategory"
										@delete="handleDeleteCategory"
										@drag-start="handleCategoryDragStart"
										@drag-end="handleCategoryDragEnd"
									/>
								</Transition>
							</div>
						</div>
					</div>

					<!-- 中央樓層平面圖 -->
					<div
						ref="floorPlanRef"
						class="relative w-full h-[600px] 2xl:h-[780px] p-4"
						:class="{ 'cursor-crosshair': isEditMode && !draggingCategoryId }"
						@drop="handleDrop"
						@dragover.prevent
					>
						<NuxtImg
							:src="floorPlanImage"
							alt="樓層平面圖"
							class="image-blur-load w-full h-full object-contain pointer-events-none"
							:class="{ 'image-loaded': isFloorPlanLoaded }"
							width="auto"
							height="full"
							@load="isFloorPlanLoaded = true"
						/>
						<!-- 分類點 -->
						<template v-for="(category, index) in filteredCategories" :key="category.id">
							<div
								class="category-dot-wrapper"
								:class="{ 'is-dragging': draggingCategoryId === category.id }"
								:style="{
									left: `${category.location.x}%`,
									top: `${category.location.y}%`
								}"
								:draggable="isEditMode"
								@dragstart="handleDotDragStart($event, category)"
								@dragend="handleDotDragEnd"
							>
								<div
									class="category-dot"
									:class="[{ 'is-active': selectedCategory === category.id }, { 'is-editing': isEditMode }]"
									role="button"
									tabindex="0"
									:data-status="isCategoryNormal(category.id) ? 'normal' : 'abnormal'"
									:title="`${category.name}：${isCategoryNormal(category.id) ? '正常' : '異常'}`"
									:aria-label="`${category.name}：${isCategoryNormal(category.id) ? '正常' : '異常'}`"
									@click.stop="!isEditMode && selectCategoryByIndex(index)"
								></div>
								<!-- Tooltip：顯示分類點名稱和狀態 -->
								<CategoryTooltip :show="true" :category-name="category.name" :is-normal="isCategoryNormal(category.id)" />
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側狀態中心 -->
			<aside class="flex-[0.7]">
				<StatusCenter
					:floors="floors"
					:categories="categories"
					:category-statuses="categoryStatuses"
					:category-disabled-map="categoryDisabledMap"
					:selected-floor="selectedFloor"
					@toggle="handleCategoryToggle"
					@floor-selected="handleFloorSelected"
				/>
			</aside>
		</div>
	</div>
	<CategoryEditDialog v-model="showCategoryDialog" :category="editingCategory" @save="handleSaveCategory" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import type { Floor } from "~/types/system";
import StatusCenter from "~/components/lighting/StatusCenter.vue";
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue";
import CategoryList from "~/components/lighting/CategoryList.vue";
import CategoryEditDialog from "~/components/lighting/CategoryEditDialog.vue";
import type { LightingCategory, CategoryModbusConfig } from "~/types/lighting";
import { useModbusApi } from "~/composables/useModbus";
import { useModbusDeviceApi } from "~/composables/useModbusDeviceApi";
import type { ModbusDevice } from "~/types/modbus";

definePageMeta({
	layout: "default"
	// 認證由全局中間件處理
});

// 樓層數據
const floors = ref<Floor[]>([
	{ id: "B3F", name: "B3F", level: -3 },
	{ id: "B2F", name: "B2F", level: -2 },
	{ id: "B1F", name: "B1F", level: -1 },
	{ id: "1F", name: "1F", level: 1 },
	{ id: "2F", name: "2F", level: 2 },
	{ id: "3F", name: "3F", level: 3 },
	{ id: "4F", name: "4F", level: 4 },
	{ id: "5F", name: "5F", level: 5 },
	{ id: "6F", name: "6F", level: 6 },
	{ id: "7F", name: "7F", level: 7 },
	{ id: "8F", name: "8F", level: 8 },
	{ id: "9F", name: "9F", level: 9 },
	{ id: "10F", name: "10F", level: 10 },
	{ id: "11F", name: "11F", level: 11 },
	{ id: "12F", name: "12F", level: 12 },
	{ id: "13F", name: "13F", level: 13 },
	{ id: "14F", name: "14F", level: 14 },
	{ id: "15F", name: "15F", level: 15 },
	{ id: "16F", name: "16F", level: 16 },
	{ id: "17F", name: "17F", level: 17 },
	{ id: "18F", name: "18F", level: 18 },
	{ id: "19F", name: "19F", level: 19 },
	{ id: "20F", name: "20F", level: 20 },
	{ id: "21F", name: "21F", level: 21 },
	{ id: "22F", name: "22F", level: 22 },
	{ id: "23F", name: "23F", level: 23 },
	{ id: "24F", name: "24F", level: 24 },
	{ id: "R1F", name: "R1F", level: 25 },
	{ id: "R2F", name: "R2F", level: 26 },
	{ id: "R3F", name: "R3F", level: 27 }
]);

// 分類點數據（從 localStorage 載入）
const categories = ref<LightingCategory[]>([]);

// 選中的樓層與分類
const selectedFloor = ref("1F");
const selectedCategory = ref("");

// 編輯模式相關
const isEditMode = ref(false);
const floorPlanRef = ref<HTMLElement | null>(null);
const draggingCategoryId = ref<string>("");
const isFloorPlanLoaded = ref(false);
const showCategoryDialog = ref(false);
const editingCategory = ref<LightingCategory | null>(null);

// 創建 floorsById Map（避免重複查找）
const floorsById = computed(() => {
	return new Map(floors.value.map((floor) => [floor.id, floor]));
});

// 選中的樓層名稱
const selectedFloorName = computed(() => {
	return floorsById.value.get(selectedFloor.value)?.name || "";
});

const floorPlanImage = computed(() => {
	const mapping: Record<string, string> = {
		"1F": "/lighting/lighting_heroPic.jpg",
		"2F": "/lighting/show.png"
	};
	return mapping[selectedFloor.value] || "/lighting/show.png";
});

// 過濾分類（根據樓層）
const filteredCategories = computed(() => {
	return categories.value.filter((category) => {
		return category.floorId === selectedFloor.value;
	});
});

// 判斷分類點是否正常（基於 categoryStatuses）
const isCategoryNormal = (categoryId: string) => {
	const status = categoryStatuses.value[categoryId];
	return !status || status.status === "normal";
};

// 計算分類點禁用狀態 Map（用於 StatusCenter）
const categoryDisabledMap = computed(() => {
	const map: Record<string, boolean> = {};
	categories.value.forEach((category) => {
		// 如果沒有 Modbus 配置，允許控制（用於範例資料，如 1F）
		if (!category.modbus) {
			map[category.id] = false;
			return;
		}

		// 如果有 points 配置，檢查是否有 DO 類型的點位（只有 DO 可以控制）
		if (category.modbus.points && category.modbus.points.length > 0) {
			map[category.id] = filterDoPoints(category.modbus.points).length === 0;
			return;
		}

		// 向後兼容：檢查舊格式
		if (category.modbus.deviceId) {
			// 如果有設備 ID 但沒有點位配置，允許控制（可能是範例資料）
			map[category.id] = !category.modbus.doAddresses && !category.modbus.doAddress && !category.modbus.address;
			return;
		}

		// 如果沒有設備配置，允許控制（可能是範例資料）
		map[category.id] = false;
	});
	return map;
});

// 處理樓層選擇
const handleFloorSelected = (floorId: string) => {
	selectedFloor.value = floorId;
	selectedCategory.value = "";
	loadCategoriesFromStorage();
	initializeCategoryStatuses();
};

// 選中分類
const handleSelectCategory = (categoryId: string) => {
	selectedCategory.value = categoryId;
};

// 通過索引選中分類（點擊黃點時使用）
const selectCategoryByIndex = (index: number) => {
	const category = filteredCategories.value[index];
	if (category) {
		selectedCategory.value = category.id;
	}
};

// 分類點狀態管理（每個分類點對應一個開關狀態）
const categoryStatuses = ref<Record<string, { isRunning: boolean; status: "normal" | "warning" | "error" }>>({});

// 確保分類點狀態物件存在
const ensureCategoryStatus = (categoryId: string, defaultStatus: "normal" | "error" = "normal") => {
	if (!categoryStatuses.value[categoryId]) {
		categoryStatuses.value[categoryId] = {
			isRunning: false,
			status: defaultStatus
		};
	}
	return categoryStatuses.value[categoryId];
};

// 回滾分類點狀態
const rollbackCategoryStatus = (categoryId: string, isRunning: boolean) => {
	if (categoryStatuses.value[categoryId]) {
		categoryStatuses.value[categoryId].isRunning = isRunning;
	}
};

// 過濾 DO 點位（新格式和向後兼容）
const filterDoPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return [];
	return points.filter((p) => {
		if (p.type === "DO") return true;
		// 向後兼容：從 method 推斷
		if (p.method === "writeCoil" || p.method === "writeCoils" || p.method === "getCoils") return true;
		return false;
	});
};

// 過濾 DI 點位（新格式和向後兼容）
const filterDiPoints = (points: any[] | undefined) => {
	if (!points || points.length === 0) return [];
	return points.filter((p) => {
		if (p.type === "DI") return true;
		// 向後兼容：從 method 推斷
		if (p.method === "getDiscreteInputs") return true;
		return false;
	});
};

// 從舊格式提取 DO 地址陣列
const extractDoAddresses = (modbus: CategoryModbusConfig): number[] => {
	if (modbus.doAddresses && modbus.doAddresses.length > 0) {
		return modbus.doAddresses;
	}
	if (modbus.doAddress !== undefined) {
		const start = modbus.doAddress;
		const length = modbus.doLength ?? 1;
		return Array.from({ length }, (_, i) => start + i);
	}
	if (modbus.address !== undefined) {
		const start = modbus.address;
		const length = modbus.length ?? 1;
		return Array.from({ length }, (_, i) => start + i);
	}
	return [];
};

// 判斷分類點是否需要 Modbus 串接（有 modbus 配置的都需要）
const needsModbusConnection = (category: LightingCategory): boolean => {
	return !!category.modbus;
};

// 初始化分類點狀態
const initializeCategoryStatuses = () => {
	categories.value.forEach((category) => {
		if (!categoryStatuses.value[category.id]) {
			// 初始化所有分類點的狀態
			categoryStatuses.value[category.id] = {
				isRunning: false,
				status: "normal"
			};
		}
	});

	// 清理已不存在的分類點狀態
	const categoryIds = new Set(categories.value.map((c) => c.id));
	Object.keys(categoryStatuses.value).forEach((categoryId) => {
		if (!categoryIds.has(categoryId)) {
			delete categoryStatuses.value[categoryId];
		}
	});
};

const modbusApi = useModbusApi();
const modbusDeviceApi = useModbusDeviceApi();

// 設備快取（避免重複載入）
const deviceCache = ref<Map<number, ModbusDevice>>(new Map());

// 載入設備資訊（如果尚未載入）
const loadDeviceInfo = async (deviceId: number): Promise<ModbusDevice | null> => {
	if (deviceCache.value.has(deviceId)) {
		return deviceCache.value.get(deviceId)!;
	}

	try {
		const device = await modbusDeviceApi.getDevice(deviceId);
		deviceCache.value.set(deviceId, device);
		return device;
	} catch (error) {
		console.error(`載入設備 ${deviceId} 失敗:`, error);
		return null;
	}
};

// 取得分類點的設備配置
const getCategoryDeviceConfig = async (category: LightingCategory): Promise<{ host: string; port: number; unitId: number } | null> => {
	if (!category.modbus) return null;

	// 如果使用新格式（有 deviceId）
	if (category.modbus.deviceId) {
		const device = await loadDeviceInfo(category.modbus.deviceId);
		if (!device) return null;
		return {
			host: device.host,
			port: device.port,
			unitId: device.unitId
		};
	}

	// 向後兼容：使用舊格式
	if (category.modbus.host && category.modbus.port && category.modbus.unitId !== undefined) {
		return {
			host: category.modbus.host,
			port: category.modbus.port,
			unitId: category.modbus.unitId
		};
	}

	return null;
};

// 自動刷新間隔（毫秒）
const AUTO_REFRESH_INTERVAL = 2000;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// 從 Modbus 讀取分類點狀態
const loadCategoryStatus = async (category: LightingCategory) => {
	if (!needsModbusConnection(category) || !category.modbus) return;

	try {
		// 取得設備配置
		const deviceConfig = await getCategoryDeviceConfig(category);
		if (!deviceConfig) return;

		// 使用新的 points 配置
		if (category.modbus.points && category.modbus.points.length > 0) {
			const doPoints = filterDoPoints(category.modbus.points);

			if (doPoints.length > 0) {
				// 讀取第一個 DO 點位的狀態（使用 getCoils）
				const firstPoint = doPoints[0];
				const response = await modbusApi.getCoils(firstPoint.address, 1, deviceConfig);

				if (response.data && response.data.length > 0) {
					const status = ensureCategoryStatus(category.id);
					status.isRunning = response.data[0];
					status.status = "normal";
				}
			} else {
				// 如果沒有 DO 點位，嘗試讀取 DI 點位（僅用於狀態顯示，不影響開關）
				const diPoints = filterDiPoints(category.modbus.points);

				if (diPoints.length > 0) {
					const firstPoint = diPoints[0];
					try {
						const response = await modbusApi.getDiscreteInputs(firstPoint.address, 1, deviceConfig);
						if (response?.data?.length > 0) {
							// 對於 DI 類型，不更新 isRunning，只更新狀態
							ensureCategoryStatus(category.id).status = "normal";
						}
					} catch (error) {
						console.error(`讀取 DI 點位 ${firstPoint.address} 失敗:`, error);
					}
				} else {
					// 完全沒有可讀取的點位配置，初始化狀態為關閉
					ensureCategoryStatus(category.id);
				}
			}
		} else {
			// 向後兼容：使用舊格式
			const doAddresses = extractDoAddresses(category.modbus);

			if (doAddresses.length > 0) {
				const minAddress = Math.min(...doAddresses);
				const maxAddress = Math.max(...doAddresses);
				const length = maxAddress - minAddress + 1;
				const response = await modbusApi.getCoils(minAddress, length, deviceConfig);

				if (response.data && response.data.length > 0) {
					const firstAddressIndex = doAddresses[0] - minAddress;
					const isRunning = response.data[firstAddressIndex] ?? false;
					const status = ensureCategoryStatus(category.id);
					status.isRunning = isRunning;
					status.status = "normal";
				}
			}
		}
	} catch (error) {
		ensureCategoryStatus(category.id, "error").status = "error";
	}
};

// 載入所有分類點的狀態
const loadAllCategoryStatuses = async (options?: { silent?: boolean }) => {
	const categoriesNeedingModbus = categories.value.filter(needsModbusConnection);
	if (categoriesNeedingModbus.length === 0) return;

	await Promise.all(categoriesNeedingModbus.map((category) => loadCategoryStatus(category)));
};

// 處理分類點開關切換
// isRunning 參數是 StatusCenter 傳來的切換後的值（已經做了 !isRunning）
const handleCategoryToggle = async (categoryId: string, targetValue: boolean) => {
	const category = categories.value.find((c) => c.id === categoryId);
	if (!category) return;

	// 取得當前狀態
	const currentStatus = categoryStatuses.value[categoryId];
	const currentValue = currentStatus?.isRunning ?? false;

	// 更新本地狀態（樂觀更新）
	if (categoryStatuses.value[categoryId]) {
		categoryStatuses.value[categoryId].isRunning = targetValue;
	}

	// 如果沒有 Modbus 配置，只更新本地狀態
	if (!needsModbusConnection(category)) {
		return;
	}

	if (!category.modbus) {
		rollbackCategoryStatus(categoryId, currentValue);
		return;
	}

	try {
		const deviceConfig = await getCategoryDeviceConfig(category);
		if (!deviceConfig) {
			rollbackCategoryStatus(categoryId, currentValue);
			return;
		}

		// 使用新的 points 配置
		if (category.modbus.points && category.modbus.points.length > 0) {
			const doPoints = filterDoPoints(category.modbus.points);

			if (doPoints.length === 0) {
				rollbackCategoryStatus(categoryId, currentValue);
				return;
			}

			// 執行所有 DO 點位的寫入操作（統一使用 writeCoil）
			await Promise.all(doPoints.map((point) => modbusApi.writeCoil(point.address, targetValue, deviceConfig)));
		} else {
			// 向後兼容：使用舊格式
			const doAddresses = extractDoAddresses(category.modbus);

			if (doAddresses.length > 0) {
				// 統一使用 writeCoil 寫入每個點位（與 modbus.vue 一致）
				// targetValue 已經是切換後的值，直接寫入
				await Promise.all(doAddresses.map((address) => modbusApi.writeCoil(address, targetValue, deviceConfig)));
			}
		}

		// 寫入成功後，重新讀取狀態以確保同步
		await loadCategoryStatus(category);
	} catch (error) {
		// 回滾狀態並標記為錯誤
		rollbackCategoryStatus(categoryId, currentValue);
		ensureCategoryStatus(categoryId, "error").status = "error";
	}
};

// 啟動自動刷新
const startAutoRefresh = () => {
	if (refreshTimer) return;
	refreshTimer = setInterval(() => {
		loadAllCategoryStatuses({ silent: true });
	}, AUTO_REFRESH_INTERVAL);
};

// 停止自動刷新
const stopAutoRefresh = () => {
	if (!refreshTimer) return;
	clearInterval(refreshTimer);
	refreshTimer = null;
};

// 創建預設 Modbus 配置
const createDefaultModbusConfig = () => ({
	deviceId: 0,
	points: [],
	host: "",
	port: 502,
	unitId: 1
});

const createEmptyCategory = (): LightingCategory => ({
	id: "",
	name: "",
	floorId: selectedFloor.value,
	location: { x: 50, y: 50 },
	roomIds: [],
	modbus: createDefaultModbusConfig()
});

const openCreateCategory = () => {
	if (!isEditMode.value) return;
	editingCategory.value = createEmptyCategory();
	showCategoryDialog.value = true;
};

// 編輯模式：編輯與刪除
const handleEditCategory = (category: LightingCategory) => {
	if (!isEditMode.value) return;
	editingCategory.value = {
		...category,
		location: { ...category.location },
		roomIds: [],
		modbus: category.modbus ? { ...category.modbus } : createDefaultModbusConfig()
	};
	showCategoryDialog.value = true;
};

const handleSaveCategory = (payload: LightingCategory) => {
	const normalized: LightingCategory = {
		...payload,
		id: payload.id || `category-${Date.now()}`,
		floorId: payload.floorId || selectedFloor.value,
		location: { ...payload.location },
		roomIds: [], // 移除 Room IDs，保留空陣列以向後兼容
		modbus: payload.modbus ? { ...payload.modbus } : undefined
	};

	const index = categories.value.findIndex((c) => c.id === normalized.id);
	if (index > -1) {
		categories.value.splice(index, 1, normalized);
	} else {
		categories.value.push(normalized);
	}

	// 初始化新分類點的狀態
	if (!categoryStatuses.value[normalized.id]) {
		categoryStatuses.value[normalized.id] = {
			isRunning: false,
			status: "normal"
		};
	}

	saveCategoriesToStorage();
	showCategoryDialog.value = false;
	editingCategory.value = null;
};

const handleDeleteCategory = (categoryId: string) => {
	if (!isEditMode.value) return;
	if (!confirm("確定要刪除這個分類點嗎？")) return;

	const index = categories.value.findIndex((c) => c.id === categoryId);
	if (index > -1) {
		categories.value.splice(index, 1);
		if (selectedCategory.value === categoryId) {
			selectedCategory.value = "";
		}
		saveCategoriesToStorage();
	}
};

// 拖曳處理：從列表拖到圖片（創建新實例）
const handleCategoryDragStart = (event: DragEvent, category: LightingCategory) => {
	// 使用臨時 ID，表示這是從列表拖來的新實例
	const tempId = `temp-${Date.now()}`;
	event.dataTransfer!.effectAllowed = "copy";
	event.dataTransfer!.setData("categoryId", tempId);
	event.dataTransfer!.setData("categoryName", category.name);
	event.dataTransfer!.setData("sourceCategoryId", category.id); // 保存原始分類 ID 作為模板
	draggingCategoryId.value = tempId;
};

const handleCategoryDragEnd = () => {
	draggingCategoryId.value = "";
};

// 拖曳處理：在圖片上拖曳分類點
const handleDotDragStart = (event: DragEvent, category: LightingCategory) => {
	if (!isEditMode.value) return;
	draggingCategoryId.value = category.id;
	event.dataTransfer!.effectAllowed = "move";
	event.dataTransfer!.setData("categoryId", category.id);
};

const handleDotDragEnd = () => {
	draggingCategoryId.value = "";
};

// 處理拖放
const handleDrop = (event: DragEvent) => {
	if (!isEditMode.value || !floorPlanRef.value) return;

	event.preventDefault();
	const categoryId = event.dataTransfer?.getData("categoryId");
	const categoryName = event.dataTransfer?.getData("categoryName");
	const sourceCategoryId = event.dataTransfer?.getData("sourceCategoryId");

	if (!categoryId) return;

	const rect = floorPlanRef.value.getBoundingClientRect();
	const x = ((event.clientX - rect.left) / rect.width) * 100;
	const y = ((event.clientY - rect.top) / rect.height) * 100;

	// 檢查是從列表拖來的新分類點（有 sourceCategoryId）還是調整現有位置
	if (sourceCategoryId && categoryName) {
		// 從列表拖來，創建新實例（基於模板分類）
		const templateCategory = categories.value.find((c) => c.id === sourceCategoryId);
		const newCategory: LightingCategory = {
			id: `category-${Date.now()}`,
			name: `${categoryName} (複製)`,
			floorId: selectedFloor.value,
			location: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) },
			roomIds: [], // 移除 Room IDs，保留空陣列以向後兼容
			modbus: templateCategory?.modbus ? { ...templateCategory.modbus } : undefined
		};
		categories.value.push(newCategory);
		selectedCategory.value = newCategory.id;
		saveCategoriesToStorage();
	} else {
		// 調整現有分類點位置
		const category = categories.value.find((c) => c.id === categoryId);
		if (category) {
			category.location = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
			saveCategoriesToStorage();
		}
	}

	draggingCategoryId.value = "";
};

// 保存分類點數據到本地存儲
const saveCategoriesToStorage = () => {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem("lighting-categories", JSON.stringify(categories.value));
	} catch (error) {
		console.error("保存分類點數據失敗:", error);
	}
};

// 從本地存儲載入分類點數據
const loadCategoriesFromStorage = () => {
	if (typeof window === "undefined") return;
	try {
		const saved = localStorage.getItem("lighting-categories");
		if (saved) {
			categories.value = JSON.parse(saved) as LightingCategory[];
			initializeCategoryStatuses();
		}
	} catch (error) {
		console.error("載入分類點數據失敗:", error);
	}
};

// 初始化：自動選中第一個分類
watch(
	() => filteredCategories.value,
	(newCategories) => {
		// 若目前選中的分類不存在於新的清單中，改選第一個或清空
		if (!newCategories.some((category) => category.id === selectedCategory.value)) {
			selectedCategory.value = newCategories[0]?.id || "";
		}
	},
	{ immediate: true }
);

// 初始化：載入保存的分類點數據
onMounted(async () => {
	loadCategoriesFromStorage();
	initializeCategoryStatuses();
	// 載入所有分類點的狀態
	await loadAllCategoryStatuses();
	// 啟動自動刷新
	startAutoRefresh();
});

// 清理：停止自動刷新
onBeforeUnmount(() => {
	stopAutoRefresh();
});
</script>

<style scoped>
.image-blur-load {
	transition:
		filter 0.6s ease-in-out,
		opacity 0.6s ease-in-out,
		transform 0.6s ease-in-out;
	filter: blur(20px);
	opacity: 0.6;
}

.image-blur-load.image-loaded {
	filter: blur(0);
	opacity: 1;
}

.category-dot-wrapper {
	position: absolute;
	z-index: 10;
}

.category-dot {
	position: absolute;
	width: 48px;
	height: 48px;
	border-radius: 9999px;
	transform: translate(-50%, -50%);
	border: 2px solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	backdrop-filter: blur(3px);
	transition:
		box-shadow 0.2s ease,
		border-color 0.2s ease,
		background 0.2s ease;
}

.category-dot::before {
	content: "";
	position: absolute;
	inset: 6px;
	border-radius: inherit;
	transition: background 0.2s ease;
}

.category-dot::after {
	position: relative;
	content: "";
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
	transition: transform 0.2s ease;
}

.category-dot[data-status="normal"] {
	background: rgba(28, 200, 138, 0.28);
	border-color: rgba(28, 200, 138, 0.6);
}

.category-dot[data-status="normal"]::before {
	background: #1cc88a;
}

.category-dot[data-status="normal"]::after {
	content: "✓";
}

.category-dot[data-status="abnormal"] {
	background: rgba(245, 101, 101, 0.32);
	border-color: rgba(245, 101, 101, 0.72);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.category-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.category-dot[data-status="abnormal"]::after {
	content: "!";
}

.category-dot:focus-visible {
	outline: 2px solid #ffffff;
	outline-offset: 2px;
}

.category-dot.is-editing {
	cursor: move;
}

.category-dot-wrapper.is-dragging {
	opacity: 0.5;
	z-index: 100;
}

.category-dot-wrapper[draggable="true"] {
	cursor: move;
}

@keyframes dot-alert {
	0%,
	100% {
		box-shadow: 0 0 18px rgba(245, 101, 101, 0.6);
	}
	50% {
		box-shadow: 0 0 28px rgba(245, 101, 101, 0.95);
	}
}

/* 下拉選單動畫 */
.dropdown-enter-active,
.dropdown-leave-active {
	transition: all 0.2s ease;
}

.dropdown-enter-from {
	opacity: 0;
	transform: translateY(-8px);
}

.dropdown-enter-to {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-from {
	opacity: 1;
	transform: translateY(0);
}

.dropdown-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
