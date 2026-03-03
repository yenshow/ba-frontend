<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center"
				@click.self="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-hidden rounded-3xl p-8 2xl:max-w-2xl"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ groupName || "車輛" }} - 車輛名單
						</h3>
						<button
							type="button"
							class="cursor-pointer text-[32px] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar min-h-[130px] flex-1 overflow-y-auto">
						<div
							v-if="vehicleList.length === 0"
							class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
						>
							<p class="text-base text-white/60 2xl:text-lg">尚無車輛資料</p>
						</div>

						<div v-else class="space-y-4">
							<div class="mx-auto grid w-full grid-cols-2 gap-4">
								<div
									v-for="vehicle in paginatedList"
									:key="vehicle.id"
									class="flex min-h-[117px] items-start gap-3 border-2 border-white/30 p-3 2xl:min-h-[133px]"
									:class="[vehicle.isPresent ? 'bg-white/20' : 'bg-black/20']"
								>
									<div class="mx-4 w-full 2xl:flex-1">
										<div
											class="border-b border-white/30 pb-1 text-base font-medium text-white 2xl:text-xl"
										>
											{{ vehicle.owner_name?.trim() || "- -" }}
											<span class="text-white/80"
												>({{ vehicle.plate_license?.trim() || "- -" }})</span
											>
										</div>
										<div class="mt-2 space-y-0.5 text-xs text-white/60 2xl:text-sm">
											<div v-if="vehicle.lastEntryDate">
												<span>最近進場：</span>
												<span>{{ vehicle.lastEntryDate }}</span>
											</div>
											<div v-if="vehicle.entryTime">
												<span>進場時間：</span>
												<span>{{ vehicle.entryTime }}</span>
											</div>
											<div v-if="vehicle.lastEntryDate || vehicle.entryTime">
												<span>離場時間：</span>
												<span v-if="vehicle.exitTime && !shouldHideExitTime(vehicle)">
													{{ vehicle.exitTime }}
												</span>
												<span v-else> - - </span>
											</div>
											<div
												v-if="!vehicle.lastEntryDate && !vehicle.entryTime && !vehicle.exitTime"
												class="text-white/40"
											>
												尚無進出場記錄
											</div>
										</div>
									</div>
								</div>
							</div>
							<Pagination
								:total="vehicleList.length"
								:offset="offset"
								:limit="itemsPerPage"
								:show="vehicleList.length > itemsPerPage"
								@previous="handlePrevious"
								@next="handleNext"
							/>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import type { VehicleGroupMemberItem } from "~/types/vehicleAccess"
import Pagination from "~/components/common/Pagination.vue"

interface Props {
	modelValue: boolean
	groupName: string
	vehicleList: VehicleGroupMemberItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
	(e: "close"): void
}>()

const itemsPerPage = 4
const offset = ref(0)

const paginatedList = computed(() => {
	const start = offset.value
	const end = start + itemsPerPage
	return props.vehicleList.slice(start, end)
})

watch(
	() => props.vehicleList.length,
	(newLength) => {
		if (offset.value >= newLength) {
			offset.value = 0
		}
	}
)

const displayName = (v: VehicleGroupMemberItem): string => {
	const name = v.owner_name?.trim() || ""
	const plate = v.plate_license?.trim() || ""
	if (name && plate) return `${name} - ${plate}`
	if (plate) return plate
	if (name) return name
	return "- -"
}

const parseTimeToSeconds = (time?: string | null) => {
	if (!time) return null
	const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
	if (!m) return null
	const hh = Number(m[1])
	const mm = Number(m[2])
	const ss = m[3] ? Number(m[3]) : 0
	if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null
	return hh * 3600 + mm * 60 + ss
}

const shouldHideExitTime = (v: VehicleGroupMemberItem) => {
	const entrySec = parseTimeToSeconds(v.entryTime)
	const exitSec = parseTimeToSeconds(v.exitTime ?? null)
	if (entrySec == null || exitSec == null) return false
	return entrySec > exitSec
}

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage)
}

const handleNext = () => {
	if (offset.value + itemsPerPage < props.vehicleList.length) {
		offset.value += itemsPerPage
	}
}

const handleClose = () => {
	emit("update:modelValue", false)
	emit("close")
}
</script>

<style scoped>
</style>
