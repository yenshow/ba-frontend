<template>
	<div class="flex min-h-[320px] w-full min-w-0 flex-1 flex-col 2xl:min-h-[400px]">
		<div
			v-if="rows.length === 0"
			class="monitoring-log-empty flex flex-1 items-center justify-center rounded-lg p-8"
			role="status"
		>
			<MonitoringLogEmptyState :message="emptyMessage" />
		</div>
		<template v-else>
			<div class="show-scrollbar min-h-0 flex-1 overflow-auto pr-1">
				<div
					class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
					:class="compact ? '' : '2xl:gap-5'"
				>
					<article
						v-for="row in paginatedRows"
						:key="`${row.unitId}-${row.id}`"
						class="flex items-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
						:class="[
							row.isPresent
								? 'monitoring-chip-bg border-cyan-300/50'
								: 'border-white/25 bg-black/25',
							compact ? 'gap-3.5 p-3.5' : 'min-h-[120px] gap-4 p-4 2xl:min-h-[148px] 2xl:p-5',
						]"
						:aria-label="`${displayName(row)}，${presenceLabel(row)}`"
					>
						<div
							class="relative shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20"
							:class="compact ? 'h-20 w-20' : 'h-24 w-24'"
						>
							<img
								v-if="cardImageUrl(row) && !imageErrorStates[rowKey(row)]"
								:src="cardImageUrl(row)"
								:alt="displayName(row)"
								class="absolute inset-0 h-full w-full object-cover"
								loading="lazy"
								@error="handleImageError(row)"
							/>
							<div v-else class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
								<svg
									class="text-white/80"
									:class="compact ? 'h-9 w-9' : 'h-12 w-12 2xl:h-14 2xl:w-14'"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
								</svg>
							</div>
						</div>

						<div class="min-w-0 flex-1">
							<div
								class="truncate border-b border-white/35 font-semibold tracking-wide text-white"
								:class="compact ? 'pb-1 text-lg' : 'pb-1.5 text-lg 2xl:text-2xl'"
							>
								{{ displayName(row) }}
							</div>
							<div
								class="mt-2 space-y-0.5 text-white/75"
								:class="compact ? 'text-sm' : 'text-sm 2xl:mt-2.5 2xl:text-base'"
							>
								<div class="flex min-w-0 gap-1">
									<span class="shrink-0 text-white/55">工號</span>
									<span class="truncate text-white">{{ row.employeeId || "—" }}</span>
								</div>
								<template v-if="hasAnyTime(row)">
									<div v-if="row.entryTime" class="flex min-w-0 gap-1">
										<span class="shrink-0 text-white/55">進場時間</span>
										<span class="truncate font-medium text-cyan-200">{{ row.entryTime }}</span>
									</div>
									<div class="flex min-w-0 gap-1">
										<span class="shrink-0 text-white/55">離場時間</span>
										<span class="truncate text-white/70">
											{{
												row.exitTime && !shouldHideExitTime(row.entryTime, row.exitTime)
													? row.exitTime
													: "- -"
											}}
										</span>
									</div>
								</template>
								<div v-else class="text-white/40">尚無進出場記錄</div>
							</div>
						</div>
					</article>
				</div>
			</div>
			<Pagination
				class="shrink-0"
				:total="rows.length"
				:offset="offset"
				:limit="PAGE_SIZE"
				:show="rows.length > PAGE_SIZE"
				@previous="handlePrevious"
				@next="handleNext"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import Pagination from "~/components/common/Pagination.vue"
import { useImageCenter } from "~/composables/core/useImageCenter"
import type { PeopleCountingPersonnel } from "~/types/peopleCounting"

const PAGE_SIZE = 16

const props = withDefaults(
	defineProps<{
		rows: PeopleCountingPersonnel[]
		emptyMessage?: string
		compact?: boolean
	}>(),
	{
		emptyMessage: "尚無人員資料",
		compact: false,
	}
)

const { resolveUrl } = useImageCenter()
const imageErrorStates = ref<Record<string, boolean>>({})
const offset = ref(0)

const paginatedRows = computed(() => props.rows.slice(offset.value, offset.value + PAGE_SIZE))

watch(
	() => props.rows.map((row) => `${row.unitId}-${row.id}`).join(","),
	() => {
		imageErrorStates.value = {}
		offset.value = 0
	}
)

const rowKey = (row: PeopleCountingPersonnel) => `${row.unitId}-${row.id}`

const displayName = (row: PeopleCountingPersonnel) => row.name || row.employeeId || "—"

const hasAnyTime = (row: PeopleCountingPersonnel) =>
	Boolean(row.entryTime || row.exitTime)

const presenceLabel = (row: PeopleCountingPersonnel) =>
	row.isPresent ? "在場" : hasAnyTime(row) ? "離場" : "尚無進出場記錄"

const shouldHideExitTime = (entryTime?: string | null, exitTime?: string | null): boolean => {
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

	const entrySec = parseTimeToSeconds(entryTime)
	const exitSec = parseTimeToSeconds(exitTime)
	if (entrySec == null || exitSec == null) return false
	return entrySec > exitSec
}

const cardImageUrl = (row: PeopleCountingPersonnel) => resolveUrl(row.photoUrl)

const handleImageError = (row: PeopleCountingPersonnel) => {
	imageErrorStates.value[rowKey(row)] = true
}

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - PAGE_SIZE)
}

const handleNext = () => {
	if (offset.value + PAGE_SIZE < props.rows.length) {
		offset.value += PAGE_SIZE
	}
}
</script>
