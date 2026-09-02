<template>
	<div class="space-y-4 text-sm text-white/85 2xl:text-base">
		<p class="text-white/60">
			地點進出授權請至各系統「門禁管理」或「車牌管理」維護；此處僅顯示摘要與快捷連結。
		</p>

		<section v-if="accessLocations.length > 0">
			<h4 class="mb-2 font-medium text-white">可進出地點（門禁／車牌名單）</h4>
			<ul class="space-y-2">
				<li
					v-for="loc in accessLocations"
					:key="loc.location_id"
					class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
				>
					<span class="min-w-0 truncate">
						<span class="text-white/55">{{ loc.zone_name }}</span>
						<span class="mx-1 text-white/35">/</span>
						<span>{{ loc.location_name }}</span>
					</span>
					<div class="flex shrink-0 gap-2">
						<NuxtLink
							:to="peopleCountingLink(loc.location_id)"
							class="rounded-md bg-white/10 px-2.5 py-1 text-xs text-cyan-200 hover:bg-white/15 2xl:text-sm"
						>
							門禁管理
						</NuxtLink>
						<NuxtLink
							v-if="showVehicleLink"
							:to="vehicleAccessLink(loc.location_id)"
							class="rounded-md bg-white/10 px-2.5 py-1 text-xs text-cyan-200 hover:bg-white/15 2xl:text-sm"
						>
							車牌管理
						</NuxtLink>
					</div>
				</li>
			</ul>
		</section>
		<p v-else class="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center text-white/50">
			尚無地點授權記錄
		</p>

		<section v-if="licensePlates.length > 0">
			<h4 class="mb-2 font-medium text-white">車牌主檔</h4>
			<ul class="space-y-1 font-mono text-white/80">
				<li v-for="plate in licensePlates" :key="plate.id">
					{{ plate.plate_number }}
					<span v-if="plate.list_type" class="ms-2 text-xs text-white/45">
						{{ plate.list_type === "blockList" ? "黑名單" : "白名單" }}
					</span>
				</li>
			</ul>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { Person } from "~/types/personnel"
import { useLicense } from "~/composables/core/useLicense"

const props = defineProps<{
	person: Person
}>()

const { canLoadFeature } = useLicense()

const accessLocations = computed(() =>
	Array.isArray(props.person.access_locations) ? props.person.access_locations : [],
)

const licensePlates = computed(() =>
	Array.isArray(props.person.license_plates) ? props.person.license_plates : [],
)

const showVehicleLink = computed(() => canLoadFeature("vehicle_access"))

const peopleCountingLink = (locationId: number) => ({
	path: "/access-control/people-counting",
	query: { locationId: String(locationId) },
})

const vehicleAccessLink = (locationId: number) => ({
	path: "/access-control/vehicle-access",
	query: { locationId: String(locationId) },
})
</script>
