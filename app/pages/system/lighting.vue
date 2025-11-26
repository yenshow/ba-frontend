<template>
	<div>
		<!-- 照明系統頁面內容 - 自定義排版 -->
		<div class="flex justify-center gap-4 xl:gap-6 2xl:gap-8">
			<!-- 左側邊欄 -->
			<aside>
				<FloorSelector v-model="selectedFloor" :floors="floors" @floor-selected="handleFloorSelected" />
			</aside>

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

						<!-- 室內/室外切換 -->
						<div class="flex flex-col gap-2">
							<button
								v-for="type in ['outdoor', 'indoor'] as const"
								:key="type"
								type="button"
								@click="toggleRoomType(type)"
								:aria-pressed="selectedRoomType === type"
								:class="[
									'p-3 whitespace-nowrap rounded-2xl text-white font-light transition-all text-lg 2xl:text-2xl',
									selectedRoomType === type ? 'bg-white/10 border-2 border-white' : 'bg-transparent border-2 border-white/30'
								]"
							>
								{{ type === "outdoor" ? "室外" : "室內" }}
							</button>
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
									@mouseenter="!isEditMode && (hoveredCategoryId = category.id)"
									@mouseleave="!isEditMode && (hoveredCategoryId = '')"
									@focus="!isEditMode && (hoveredCategoryId = category.id)"
									@blur="!isEditMode && (hoveredCategoryId = '')"
								></div>
								<!-- 整合的 tooltip：常駐簡短訊息，hover 顯示完整資訊 -->
								<CategoryTooltip
									:show="true"
									:category-name="category.name"
									:is-normal="isCategoryNormal(category.id)"
									:floor-name="selectedFloorName"
									:room-names="getCategoryRoomNames(category)"
									:is-hovered="hoveredCategoryId === category.id"
								/>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- 右側狀態中心 -->
			<aside class="flex-[0.7]">
				<StatusCenter class="h-full" :controls="currentCategoryControls" :category-name="currentCategoryName" @toggle="handleControlToggle" />
			</aside>
		</div>
	</div>
	<CategoryEditDialog v-model="showCategoryDialog" :category="editingCategory" @save="handleSaveCategory" />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import type { Floor, Room, RoomCategory, ControlPoint } from "~/types/system";
import FloorSelector from "~/components/lighting/FloorSelector.vue";
import StatusCenter from "~/components/lighting/StatusCenter.vue";
import CategoryTooltip from "~/components/lighting/CategoryTooltip.vue";
import CategoryList from "~/components/lighting/CategoryList.vue";
import CategoryEditDialog from "~/components/lighting/CategoryEditDialog.vue";
import type { LightingCategory } from "~/types/lighting";

definePageMeta({
	layout: "default"
});

// 樓層數據（範例）
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

// 房間數據（範例）
const rooms = ref<Room[]>([
	{ id: "room-1", name: "A區 - 桌球室", floorId: "1F", area: "A區", type: "indoor" },
	{ id: "room-2", name: "B區 - 遊戲室", floorId: "1F", area: "B區", type: "indoor" },
	{ id: "room-3", name: "C區 - 跑步機", floorId: "1F", area: "C區", type: "indoor" },
	{ id: "room-4", name: "D區 - 休息區", floorId: "1F", area: "D區", type: "indoor" },
	{ id: "room-5", name: "E區 - 廁所", floorId: "1F", area: "E區", type: "indoor" },
	// 管委會的房間
	{ id: "room-6", name: "A區 - 會議室", floorId: "1F", area: "A區", type: "indoor" },
	{ id: "room-7", name: "B區 - 辦公室", floorId: "1F", area: "B區", type: "indoor" }
]);

// 房間分類數據（範例）- 黃點對應到這些分類
const categories = ref<LightingCategory[]>([
	{
		id: "category-1",
		name: "健身房",
		floorId: "1F",
		location: { x: 50, y: 40 },
		roomIds: ["room-1", "room-2", "room-3", "room-4", "room-5"]
	},
	{
		id: "category-2",
		name: "管委會",
		floorId: "1F",
		location: { x: 70, y: 60 },
		roomIds: ["room-6", "room-7"]
	}
]);

// 選中的樓層與分類
const selectedFloor = ref("1F");
const selectedCategory = ref("");
const selectedRoomType = ref<"indoor" | "outdoor" | null>(null);

// Tooltip hover 狀態
const hoveredCategoryId = ref<string>("");

// 編輯模式相關
const isEditMode = ref(false);
const floorPlanRef = ref<HTMLElement | null>(null);
const draggingCategoryId = ref<string>("");
const isFloorPlanLoaded = ref(false);
const showCategoryDialog = ref(false);
const editingCategory = ref<LightingCategory | null>(null);

// 統一優化：創建 roomsById Map（避免重複創建）
const roomsById = computed(() => {
	return new Map(rooms.value.map((room) => [room.id, room]));
});

// 統一優化：創建 floorsById Map（避免重複查找）
const floorsById = computed(() => {
	return new Map(floors.value.map((floor) => [floor.id, floor]));
});

// 統一優化：創建 controlsByRoomId Map（用於快速查找）
const controlsByRoomId = computed(() => {
	const map = new Map<string, ControlPoint[]>();
	controls.value.forEach((control) => {
		if (control.roomId) {
			const existing = map.get(control.roomId);
			if (existing) {
				existing.push(control);
			} else {
				map.set(control.roomId, [control]);
			}
		}
	});
	return map;
});

// 統一優化：創建 categoriesById Map（用於快速查找分類）
const categoriesById = computed(() => {
	return new Map(categories.value.map((category) => [category.id, category]));
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

// 過濾分類（根據樓層與室內/室外類型）
const filteredCategories = computed(() => {
	const roomsMap = roomsById.value;

	return categories.value.filter((category) => {
		if (category.floorId !== selectedFloor.value) return false;

		if (!selectedRoomType.value) return true;

		// 判斷該分類是否至少包含一個符合目前室內/室外選擇的房間
		return category.roomIds.some((roomId) => roomsMap.get(roomId)?.type === selectedRoomType.value);
	});
});

// 當前選中的分類（使用 Map 查找，提升性能）
const currentCategory = computed(() => {
	if (!selectedCategory.value) return null;
	return categoriesById.value.get(selectedCategory.value) || null;
});

const currentCategoryName = computed(() => {
	if (currentCategory.value) {
		return currentCategory.value.name;
	}
	if (!selectedRoomType.value) return "";
	return selectedRoomType.value === "indoor" ? "室內空間" : "室外空間";
});

// 當前選中分類下所有房間的控制點（用於 StatusCenter）
const currentCategoryControls = computed(() => {
	if (!currentCategory.value) return [];

	const categoryRoomIds = currentCategory.value.roomIds;
	const roomsMap = roomsById.value;
	const controlsMap = controlsByRoomId.value;
	const result: ControlPoint[] = [];

	categoryRoomIds.forEach((roomId) => {
		const room = roomsMap.get(roomId);
		// 如果選擇了室內/室外類型，檢查房間類型是否匹配
		if (selectedRoomType.value && room?.type !== selectedRoomType.value) return;

		const roomControls = controlsMap.get(roomId) || [];
		result.push(...roomControls);
	});

	return result;
});

const categoryStatusMap = computed<Record<string, "normal" | "abnormal">>(() => {
	const statusMap: Record<string, "normal" | "abnormal"> = {};
	const controlsMap = controlsByRoomId.value;

	for (const category of categories.value) {
		const categoryRoomIds = category.roomIds;
		let hasAbnormal = false;

		// 使用 Map 查找替代 filter，提升性能
		for (const roomId of categoryRoomIds) {
			const roomControls = controlsMap.get(roomId) || [];
			if (roomControls.some((control) => control.status !== "normal")) {
				hasAbnormal = true;
				break; // 找到異常就跳出
			}
		}

		statusMap[category.id] = hasAbnormal ? "abnormal" : "normal";
	}
	return statusMap;
});

const isCategoryNormal = (categoryId: string) => {
	return categoryStatusMap.value[categoryId] !== "abnormal";
};

// 照明控制點數據（範例）- 這些對應到 StatusCenter 的燈泡狀態
// 每個房間（A區、B區等）對應一個或多個控制點
// 控制點名稱對應房間的完整名稱，用於在狀態中心顯示
const controls = ref<ControlPoint[]>([
	// 健身房的房間控制點
	{ id: "control-1", name: "A區 - 桌球室", status: "normal", isRunning: true, location: { x: 30, y: 25 }, roomId: "room-1" },
	{ id: "control-2", name: "B區 - 遊戲室", status: "normal", isRunning: true, location: { x: 50, y: 30 }, roomId: "room-2" },
	{ id: "control-3", name: "C區 - 跑步機", status: "warning", isRunning: false, location: { x: 70, y: 40 }, roomId: "room-3" },
	{ id: "control-4", name: "D區 - 休息區", status: "normal", isRunning: true, location: { x: 45, y: 60 }, roomId: "room-4" },
	{ id: "control-5", name: "E區 - 廁所", status: "normal", isRunning: true, location: { x: 65, y: 70 }, roomId: "room-5" },
	// 管委會的房間控制點
	{ id: "control-6", name: "A區 - 會議室", status: "normal", isRunning: true, location: { x: 30, y: 25 }, roomId: "room-6" },
	{ id: "control-7", name: "B區 - 辦公室", status: "normal", isRunning: true, location: { x: 50, y: 30 }, roomId: "room-7" }
]);

// 處理樓層選擇
const handleFloorSelected = (floorId: string) => {
	console.log("選中樓層:", floorId);
	// 重置選中的分類
	selectedCategory.value = "";
	// 載入該樓層的分類點數據
	loadCategoriesFromStorage();
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

// 切換室內/室外篩選
const toggleRoomType = (type: "indoor" | "outdoor") => {
	selectedRoomType.value = selectedRoomType.value === type ? null : type;
};

// 統一優化：創建 controlsById Map（用於快速查找控制點）
const controlsById = computed(() => {
	return new Map(controls.value.map((control) => [control.id, control]));
});

// 處理照明控制點切換
const handleControlToggle = (controlId: string, isRunning: boolean) => {
	const control = controlsById.value.get(controlId);
	if (control) {
		control.isRunning = isRunning;
		console.log("照明控制點運轉狀態更新:", controlId, isRunning);
		// 可以在這裡調用 API 更新照明狀態
	}
};

// 獲取房間名稱（使用 Map 查找，提升性能）
const getRoomName = (roomId: string) => {
	return roomsById.value.get(roomId)?.name || roomId;
};

// 獲取分類下的所有房間名稱列表（使用 computed 優化性能）
const categoryRoomNamesMap = computed(() => {
	const map = new Map<string, string[]>();
	const roomsMap = roomsById.value;

	categories.value.forEach((category) => {
		const roomNames = category.roomIds.map((roomId) => roomsMap.get(roomId)?.name).filter((name): name is string => !!name);
		map.set(category.id, roomNames);
	});
	return map;
});

// 獲取分類下的所有房間名稱列表
const getCategoryRoomNames = (category: LightingCategory) => {
	return categoryRoomNamesMap.value.get(category.id) || [];
};

const createEmptyCategory = (): LightingCategory => ({
	id: "",
	name: "",
	floorId: selectedFloor.value,
	location: { x: 50, y: 50 },
	roomIds: [],
	modbus: {
		host: "",
		port: 502,
		unitId: 1,
		address: 0,
		length: 1
	}
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
		roomIds: [...category.roomIds],
		modbus: category.modbus
			? { ...category.modbus }
			: {
					host: "",
					port: 502,
					unitId: 1,
					address: 0,
					length: 1
				}
	};
	showCategoryDialog.value = true;
};

const handleSaveCategory = (payload: LightingCategory) => {
	const normalized: LightingCategory = {
		...payload,
		id: payload.id || `category-${Date.now()}`,
		floorId: payload.floorId || selectedFloor.value,
		location: { ...payload.location },
		roomIds: [...payload.roomIds],
		modbus: payload.modbus ? { ...payload.modbus } : undefined
	};

	const index = categories.value.findIndex((c) => c.id === normalized.id);
	if (index > -1) {
		categories.value.splice(index, 1, normalized);
	} else {
		categories.value.push(normalized);
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
			roomIds: templateCategory ? [...templateCategory.roomIds] : [],
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
			const parsed = JSON.parse(saved) as LightingCategory[];
			// 只載入當前樓層的分類點
			const floorCategories = parsed.filter((c: LightingCategory) => c.floorId === selectedFloor.value);
			if (floorCategories.length > 0) {
				categories.value = parsed;
			}
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
onMounted(() => {
	loadCategoriesFromStorage();
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
