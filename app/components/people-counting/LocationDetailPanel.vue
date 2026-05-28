<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<!-- 人員群組列表 -->
		<UnitList
			:units="location.units || []"
			:selected-unit-id="selectedUnitId"
			:is-isapi-camera="location.dataSource === 'isapi_camera'"
			@select="handleUnitSelect"
		/>

		<!-- 人員名單：如果有選中的單位，則顯示（即使沒有人員資料也顯示空狀態） -->
		<PersonnelList
			v-if="selectedUnitId !== null && location.dataSource !== 'isapi_camera'"
			:personnel="personnel"
			:unit-name="selectedUnitName"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { PeopleCountingLocation, PeopleCountingPersonnel } from "~/types/peopleCounting"
import UnitList from "~/components/people-counting/UnitList.vue"
import PersonnelList from "~/components/people-counting/PersonnelList.vue"

interface Props {
	location: PeopleCountingLocation
	personnel: PeopleCountingPersonnel[]
	selectedUnitId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
	selectedUnitId: null,
})

const emit = defineEmits<{
	"unit-select": [unitId: number | null]
}>()

const selectedUnitName = computed(() => {
	if (props.selectedUnitId == null) return null
	const unit = (props.location.units || []).find((u) => u.id === props.selectedUnitId)
	return unit?.name ?? null
})

const handleUnitSelect = (unitId: number) => {
	// 確保點擊後一定有選取狀態，不會取消選取
	emit("unit-select", unitId)
}
</script>
