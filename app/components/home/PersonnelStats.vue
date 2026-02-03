<template>
	<!-- 三個統計數字 -->
	<div class="mb-4 2xl:mb-6 grid grid-cols-3 gap-1">
		<div class="bg-white/20 text-center">
			<div class="text-xl text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">進場人數</div>
			<div class="text-white text-6xl 2xl:text-8xl flex items-center justify-center h-[100px] 2xl:h-[150px]">
				{{ totalEntryCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div class="text-xl text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">出場人數</div>
			<div class="text-white text-6xl 2xl:text-8xl flex items-center justify-center h-[100px] 2xl:h-[150px]">
				{{ totalExitCount }}
			</div>
		</div>

		<div class="bg-white/20 text-center">
			<div class="text-xl text-white tracking-[4px] ps-[4px] font-semibold 2xl:text-3xl bg-white/25 w-full py-2">在場人數</div>
			<div class="text-white text-6xl 2xl:text-8xl flex items-center justify-center h-[100px] 2xl:h-[150px]">
				{{ totalOnSiteCount }}
			</div>
		</div>
	</div>

	<!-- 進場單位列表 -->
	<div>
		<h3 class="font-semibold tracking-[4px] ps-[4px] text-xl bg-white/20 text-white text-center 2xl:text-3xl py-1 mb-2">進場單位</h3>
		
		<div v-if="aggregatedUnits.length === 0" class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center">
			<p class="text-sm text-white/60 xl:text-base">尚無單位資料</p>
		</div>

		<div v-else class="grid grid-cols-4 gap-1">
			<template v-for="(unit, index) in displayUnits" :key="`${unit?.name || 'empty'}-${index}`">
				<div
					v-if="unit"
					class="flex flex-col justify-center items-center transition-all p-2 2xl:p-3 cursor-pointer hover:opacity-80"
					:class="{
						'bg-white/20': (unit.currentCount || 0) > 0,
						'bg-black/20': (unit.currentCount || 0) === 0
					}"
					tabindex="0"
					role="button"
					:aria-label="`查看 ${unit.name} 人員名單`"
					@click="handleUnitClick(unit)"
					@keydown.enter="handleUnitClick(unit)"
					@keydown.space.prevent="handleUnitClick(unit)"
				>
					<div class="text-lg text-white font-semibold text-center 2xl:text-xl tracking-wide">
						{{ unit.name }}
					</div>
					<div class="text-base text-white 2xl:text-lg space-x-0.5">
						<span class="text-green-400">{{ unit.currentCount || 0 }}</span>
						<span>/</span>
						<span>{{ unit.capacity || 0 }}</span>
					</div>
				</div>
				<div
					v-else
					class="flex flex-col justify-center items-center transition-all bg-black/20 p-2 2xl:p-3"
				>
					<div class="text-lg text-white/30 font-semibold text-center 2xl:text-xl tracking-wide">
						-
					</div>
					<div class="text-base text-white/30 2xl:text-lg space-x-0.5">
						<span>-</span>
						<span>/</span>
						<span>-</span>
					</div>
				</div>
			</template>
		</div>
	</div>

	<!-- 單位人員對話框 -->
	<UnitPersonnelDialog
		v-model="isDialogOpen"
		:unit-name="selectedUnitName"
		:personnel="unitPersonnel"
		:is-loading="isLoadingPersonnel"
		@close="handleDialogClose"
	/>
</template>

<script setup lang="ts">
import UnitPersonnelDialog from "~/components/home/UnitPersonnelDialog.vue";
import { usePeopleCountingApi } from "~/composables/systems/usePeopleCountingApi";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import type { PeopleCountingLocation, PeopleCountingUnit, PeopleCountingPersonnel } from "~/types/peopleCounting";

interface Props {
	locations: PeopleCountingLocation[];
}

const props = defineProps<Props>();

const peopleCountingApi = usePeopleCountingApi();
const { handleError } = useErrorHandler();

// 對話框狀態
const isDialogOpen = ref(false);
const selectedUnitName = ref("");
const unitPersonnel = ref<PeopleCountingPersonnel[]>([]);
const isLoadingPersonnel = ref(false);

// 計算總計的進場人數、出場人數、在場人數
const totalEntryCount = computed(() => {
	return props.locations.reduce((sum, location) => sum + (location.entryCount || 0), 0);
});

const totalExitCount = computed(() => {
	return props.locations.reduce((sum, location) => sum + (location.exitCount || 0), 0);
});

const totalOnSiteCount = computed(() => {
	// 計算所有單位的在場人數加總
	return aggregatedUnits.value.reduce((sum, unit) => sum + (unit.currentCount || 0), 0);
});

// 聚合所有地點的單位數據（相同名稱的單位合併）
const aggregatedUnits = computed(() => {
	const unitMap = new Map<string, PeopleCountingUnit & { currentCount: number; capacity: number }>();

	props.locations.forEach(location => {
		location.units?.forEach(unit => {
			const key = unit.name;
			if (unitMap.has(key)) {
				const existing = unitMap.get(key)!;
				existing.currentCount = (existing.currentCount || 0) + (unit.currentCount || 0);
				existing.capacity = (existing.capacity || 0) + (unit.capacity || 0);
			} else {
				unitMap.set(key, {
					...unit,
					currentCount: unit.currentCount || 0,
					capacity: unit.capacity || 0
				});
			}
		});
	});

	return Array.from(unitMap.values());
});

// 確保顯示 16 個項目（4x4），不足的用 null 填充
const displayUnits = computed(() => {
	const units = aggregatedUnits.value;
	const displayCount = 16; // 4x4 = 16
	const result: (typeof units[0] | null)[] = [...units];
	
	// 如果不足 16 個，用 null 填充
	while (result.length < displayCount) {
		result.push(null);
	}
	
	// 只取前 16 個
	return result.slice(0, displayCount);
});

// 處理單位點擊事件
const handleUnitClick = async (unit: PeopleCountingUnit & { currentCount: number; capacity: number }) => {
	if (!unit || !unit.name) return;
	
	selectedUnitName.value = unit.name;
	isDialogOpen.value = true;
	isLoadingPersonnel.value = true;
	unitPersonnel.value = [];

	try {
		// 找到所有包含該單位名稱的原始單位
		const matchingUnits: Array<{ unitId: number; locationId?: number }> = [];
		
		props.locations.forEach(location => {
			location.units?.forEach(locationUnit => {
				if (locationUnit.name === unit.name && locationUnit.id) {
					matchingUnits.push({
						unitId: locationUnit.id,
						locationId: location.locationId
					});
				}
			});
		});

		// 獲取每個單位的人員列表
		const personnelPromises = matchingUnits.map(({ unitId, locationId }) =>
			peopleCountingApi.getUnitPersonnel(unitId, locationId)
		);

		const allPersonnelArrays = await Promise.all(personnelPromises);
		
		// 合併所有人員列表，並根據 id 和 employeeId 去重
		const personnelMap = new Map<string, PeopleCountingPersonnel>();
		
		allPersonnelArrays.flat().forEach(person => {
			// 使用 id 和 employeeId 作為唯一鍵
			const key = `${person.id}-${person.employeeId}`;
			if (!personnelMap.has(key)) {
				personnelMap.set(key, person);
			}
		});

		unitPersonnel.value = Array.from(personnelMap.values());
	} catch (error) {
		handleError(error, `載入 ${unit.name} 人員列表失敗`);
		unitPersonnel.value = [];
	} finally {
		isLoadingPersonnel.value = false;
	}
};

// 處理對話框關閉
const handleDialogClose = () => {
	selectedUnitName.value = "";
	unitPersonnel.value = [];
};
</script>

