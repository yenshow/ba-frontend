<template>
	<div class="flex h-full flex-col space-y-6 overflow-y-auto">
		<!-- 標題區 -->
		<div class="flex items-center justify-between border-b border-white/30 pb-4">
			<div>
				<h2 class="text-2xl font-bold text-white xl:text-3xl 2xl:text-4xl">{{ site.name }}</h2>
			</div>
		</div>

		<!-- 進場單位列表 -->
		<UnitList :units="site.units || []" :selected-unit-id="selectedUnitId" @select="handleUnitSelect" />

		<!-- 人員名單 -->
		<div v-if="selectedUnitId && personnel.length > 0">
			<PersonnelList :personnel="personnel" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingSite, PeopleCountingPersonnel } from "~/types/peopleCounting";
import UnitList from "~/components/people-counting/UnitList.vue";
import PersonnelList from "~/components/people-counting/PersonnelList.vue";

interface Props {
	site: PeopleCountingSite;
	personnel: PeopleCountingPersonnel[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
	"unit-select": [unitId: number | null];
}>();

const selectedUnitId = ref<number | null>(null);

// 注意：personnel 已經由頁面根據選中的單位載入，不需要再次過濾

const handleUnitSelect = (unitId: number) => {
	if (selectedUnitId.value === unitId) {
		selectedUnitId.value = null;
		emit("unit-select", null);
	} else {
		selectedUnitId.value = unitId;
		emit("unit-select", unitId);
	}
};
</script>
