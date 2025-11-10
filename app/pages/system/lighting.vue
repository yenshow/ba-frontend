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
						<!-- 樓層顯示 -->
						<div class="py-4 w-[60px] 2xl:w-[100px]">
							<span class="inline-flex pb-1 border-b-2 border-white/70 text-2xl xl:text-3xl 2xl:text-5xl tracking-widest">
								{{ selectedFloorName }}
							</span>
						</div>
						<!-- 室內/室外切換 -->
						<div class="flex flex-col gap-2">
							<button
								type="button"
								@click="toggleRoomType('outdoor')"
								:aria-pressed="selectedRoomType === 'outdoor'"
								:class="[
									'p-3 whitespace-nowrap rounded-2xl text-white font-light transition-all text-lg 2xl:text-2xl',
									selectedRoomType === 'outdoor' ? 'bg-white/10 border-2 border-white' : 'bg-transparent border-2 border-white/30'
								]"
							>
								室外
							</button>
							<button
								type="button"
								@click="toggleRoomType('indoor')"
								:aria-pressed="selectedRoomType === 'indoor'"
								:class="[
									'p-3 whitespace-nowrap rounded-2xl text-white font-light transition-all text-lg 2xl:text-2xl',
									selectedRoomType === 'indoor' ? 'bg-white/10 border-2 border-white' : 'bg-transparent border-2 border-white/30'
								]"
							>
								室內
							</button>
						</div>
					</div>

					<!-- 中央樓層平面圖 -->
					<div class="relative w-full h-[600px] 2xl:h-[780px] overflow-hidden">
						<img src="/lighting/lighting_heroPic.jpg" alt="樓層平面圖" class="w-full h-full object-contain" />
						<!-- 分類點 -->
						<template v-for="(category, index) in filteredCategories" :key="category.id">
							<div
								class="category-dot"
								role="button"
								tabindex="0"
								:data-status="isCategoryNormal(category.id) ? 'normal' : 'abnormal'"
								:title="`${category.name}：${isCategoryNormal(category.id) ? '正常' : '異常'}`"
								:aria-label="`${category.name}：${isCategoryNormal(category.id) ? '正常' : '異常'}`"
								:style="{
									left: `${category.location.x}%`,
									top: `${category.location.y}%`
								}"
								:class="{ 'is-active': selectedCategory === category.id }"
								@click="selectCategoryByIndex(index)"
							></div>
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
</template>

<script setup lang="ts">
import type { Floor, Room, RoomCategory, ControlPoint } from "~/types/system";
import FloorSelector from "~/components/lighting/FloorSelector.vue";
import StatusCenter from "~/components/lighting/StatusCenter.vue";

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
const categories = ref<RoomCategory[]>([
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

// 選中的樓層名稱
const selectedFloorName = computed(() => {
	const floor = floors.value.find((f) => f.id === selectedFloor.value);
	return floor?.name || "";
});

// 過濾分類（根據樓層與室內/室外類型）
const filteredCategories = computed(() => {
	const roomsById = new Map(rooms.value.map((room) => [room.id, room]));

	return categories.value.filter((category) => {
		if (category.floorId !== selectedFloor.value) return false;

		if (!selectedRoomType.value) return true;

		// 判斷該分類是否至少包含一個符合目前室內/室外選擇的房間
		return category.roomIds.some((roomId) => roomsById.get(roomId)?.type === selectedRoomType.value);
	});
});

// 當前選中的分類（合併邏輯，避免重複查找）
const currentCategory = computed(() => {
	if (!selectedCategory.value) return null;
	return categories.value.find((c) => c.id === selectedCategory.value) || null;
});

const currentCategoryName = computed(() => {
	if (currentCategory.value) {
		return currentCategory.value.name;
	}
	if (!selectedRoomType.value) return "";
	return selectedRoomType.value === "indoor" ? "室內空間" : "室外空間";
});

// 當前選中分類下所有房間的控制點（用於 StatusCenter）
// 狀態中心顯示當前分類下所有房間的控制點，而不是只顯示選中房間的控制點
const currentCategoryControls = computed(() => {
	if (!currentCategory.value) return [];
	// 獲取當前分類下的所有房間 ID
	const categoryRoomIds = currentCategory.value.roomIds;
	// 過濾出這些房間的所有控制點
	const roomsById = new Map(rooms.value.map((room) => [room.id, room]));
	return controls.value.filter((control) => {
		if (!categoryRoomIds.includes(control.roomId || "")) return false;
		if (!selectedRoomType.value) return true;
		const controlRoom = roomsById.get(control.roomId || "");
		return controlRoom?.type === selectedRoomType.value;
	});
});

const categoryStatusMap = computed<Record<string, "normal" | "abnormal">>(() => {
	const statusMap: Record<string, "normal" | "abnormal"> = {};
	for (const category of categories.value) {
		const categoryRoomIds = category.roomIds;
		const categoryControls = controls.value.filter((control) => categoryRoomIds.includes(control.roomId || ""));
		const hasAbnormal = categoryControls.some((control) => control.status !== "normal");
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
	// 可以在這裡載入該樓層的照明數據
};

// 選中分類的通用邏輯
const selectCategory = (categoryId: string) => {
	selectedCategory.value = categoryId;
};

// 通過索引選中分類（點擊黃點時使用）
const selectCategoryByIndex = (index: number) => {
	const category = filteredCategories.value[index];
	if (category) {
		selectCategory(category.id);
	}
};

// 切換室內/室外篩選
const toggleRoomType = (type: "indoor" | "outdoor") => {
	selectedRoomType.value = selectedRoomType.value === type ? null : type;
};

// 處理照明控制點切換
const handleControlToggle = (controlId: string, isRunning: boolean) => {
	const control = controls.value.find((c) => c.id === controlId);
	if (control) {
		control.isRunning = isRunning;
		console.log("照明控制點運轉狀態更新:", controlId, isRunning);
		// 可以在這裡調用 API 更新照明狀態
	}
};

// 初始化：自動選中第一個分類
watch(
	() => filteredCategories.value,
	(newCategories) => {
		// 若目前選中的分類不存在於新的清單中，改選第一個或清空
		const hasSelected = newCategories.some((category) => category.id === selectedCategory.value);

		if (!hasSelected) {
			if (newCategories.length > 0) {
				selectCategory(newCategories[0].id);
			} else {
				selectedCategory.value = "";
			}
		}
	},
	{ immediate: true }
);
</script>

<style scoped>
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
		transform 0.2s ease,
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
	box-shadow: 0 0 14px rgba(28, 200, 138, 0.55);
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
	box-shadow: 0 0 18px rgba(245, 101, 101, 0.78);
	animation: dot-alert 1.6s ease-in-out infinite;
}

.category-dot[data-status="abnormal"]::before {
	background: #f56565;
}

.category-dot[data-status="abnormal"]::after {
	content: "!";
}

.category-dot.is-active {
	transform: translate(-50%, -50%) scale(1.12);
	border-color: #ffffff;
	box-shadow: 0 0 20px rgba(255, 255, 255, 0.65);
}

.category-dot:focus-visible {
	outline: 2px solid #ffffff;
	outline-offset: 2px;
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
</style>
