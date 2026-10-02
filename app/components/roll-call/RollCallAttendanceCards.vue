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
						:key="row.personId"
						class="flex items-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
						:class="[
							row.status === 'present'
								? 'monitoring-chip-bg border-cyan-300/50'
								: 'border-white/25 bg-black/25',
							compact ? 'gap-3.5 p-3.5' : 'min-h-[120px] gap-4 p-4 2xl:min-h-[148px] 2xl:p-5'
						]"
						:aria-label="`${displayName(row)}，簽到時間 ${checkInDisplay(row)}`"
					>
						<div
							class="relative shrink-0 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20"
							:class="compact ? 'h-20 w-20' : 'h-24 w-24'"
						>
							<img
								v-if="cardImageUrl(row) && !imageErrorStates[row.personId]"
								:src="cardImageUrl(row)"
								:alt="displayName(row)"
								class="absolute inset-0 h-full w-full object-cover"
								loading="lazy"
								@error="handleImageError(row.personId)"
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
									<span class="truncate text-white">{{ row.employeeNo || "—" }}</span>
								</div>
								<div class="flex min-w-0 gap-1">
									<span class="shrink-0 text-white/55">簽到時間</span>
									<span
										class="truncate"
										:class="checkedInTime(row) ? 'font-medium text-cyan-200' : 'text-white/50'"
									>
										{{ checkInDisplay(row) }}
									</span>
								</div>
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
import { computed, ref, watch } from "vue";
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue";
import Pagination from "~/components/common/Pagination.vue";
import { useImageCenter } from "~/composables/core/useImageCenter";
import type { RollCallAttendanceRow } from "~/types/rollCall";

const PAGE_SIZE = 16;

const props = withDefaults(
	defineProps<{
		rows: RollCallAttendanceRow[];
		emptyMessage?: string;
		/** 總覽展開時縮小人臉與文字 */
		compact?: boolean;
	}>(),
	{
		emptyMessage: "尚無簽到紀錄",
		compact: false
	}
);

const { resolveUrl } = useImageCenter();
const imageErrorStates = ref<Record<number, boolean>>({});
const offset = ref(0);

const paginatedRows = computed(() => props.rows.slice(offset.value, offset.value + PAGE_SIZE));

watch(
	() => props.rows.map(row => row.personId).join(","),
	() => {
		imageErrorStates.value = {};
		offset.value = 0;
	}
);

const displayName = (row: RollCallAttendanceRow) => row.fullName || row.employeeNo || "—";

const checkedInTime = (row: RollCallAttendanceRow) => {
	if (!row.checkedInAt) return "";
	const d = new Date(row.checkedInAt);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const checkInDisplay = (row: RollCallAttendanceRow) => checkedInTime(row) || "未到";

/** 有簽到抓拍優先；否則用人臉大頭照 */
const cardImageUrl = (row: RollCallAttendanceRow) =>
	resolveUrl(row.eventPhotoUrl) || resolveUrl(row.photoUrl);

const handleImageError = (personId: number) => {
	imageErrorStates.value[personId] = true;
};

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - PAGE_SIZE);
};

const handleNext = () => {
	if (offset.value + PAGE_SIZE < props.rows.length) {
		offset.value += PAGE_SIZE;
	}
};
</script>
