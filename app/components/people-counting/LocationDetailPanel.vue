<template>
	<div class="flex h-full flex-col space-y-8 overflow-y-auto">
		<!-- 進場單位列表 -->
		<UnitList :units="location.units || []" :selected-unit-id="selectedUnitId" @select="handleUnitSelect" />

		<!-- 人員名單：如果有選中的單位，則顯示（即使沒有人員資料也顯示空狀態） -->
		<PersonnelList v-if="selectedUnitId !== null" :personnel="personnel" />
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation, PeopleCountingPersonnel } from "~/types/peopleCounting";
import UnitList from "~/components/people-counting/UnitList.vue";
import PersonnelList from "~/components/people-counting/PersonnelList.vue";

interface Props {
	location: PeopleCountingLocation;
	personnel: PeopleCountingPersonnel[];
	selectedUnitId?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
	selectedUnitId: null
});

const emit = defineEmits<{
	"unit-select": [unitId: number | null];
}>();

// 注意：personnel 已經由頁面根據選中的單位載入，不需要再次過濾

const handleUnitSelect = (unitId: number) => {
	// 確保點擊後一定有選取狀態，不會取消選取
	emit("unit-select", unitId);
};
</script>

