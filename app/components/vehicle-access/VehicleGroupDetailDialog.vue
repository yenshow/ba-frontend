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
							{{ groupName || "車輛" }} - 過車記錄
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
							v-if="isLoading"
							class="flex items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 p-8"
						>
							<div
								class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
							></div>
						</div>
						<div
							v-else-if="records.length === 0"
							class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
						>
							<p class="text-sm text-white/60 xl:text-base">尚無過車記錄</p>
						</div>
						<div v-else class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div
									v-for="log in paginatedRecords"
									:key="log.id"
									class="flex items-start gap-3 border-2 border-white/30 p-3"
									:class="[log.lane_type === 1 ? 'bg-white/20' : 'bg-black/20']"
								>
									<!-- 車牌圖片 -->
									<div class="mt-4 h-16 w-16 overflow-hidden rounded bg-white/10">
										<img
											v-if="log.plate_license_image_url"
											:src="log.plate_license_image_url"
											:alt="log.license_plate ?? ''"
											class="h-full w-full object-cover"
											@error="handleImageError($event)"
										/>
										<div v-else class="flex h-full w-full items-center justify-center text-xs text-white/60">
											無圖
										</div>
									</div>

									<div class="min-w-0 flex-1">
										<div class="border-b border-white/30 pb-1 text-base font-medium text-white 2xl:text-xl">
											{{ log.license_plate ?? "-" }}
										</div>
										<div v-if="log.owner_name" class="mt-1 text-xs text-white/60 xl:text-sm">
											車主：{{ log.owner_name }}
										</div>
										<div class="mt-1 space-y-0.5 text-xs text-white/60 xl:text-sm">
											<div>
												<span>時間：</span>
												<span>{{ formatTriggerTime(log.trigger_time) }}</span>
											</div>
											<div>
												<span>進/出：</span>
												<span>{{ formatLaneType(log.lane_type) }}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
							<Pagination
								v-if="records.length > itemsPerPage"
								:total="records.length"
								:offset="offset"
								:limit="itemsPerPage"
								:show="true"
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
import { ref, computed, watch } from "vue";
import type { VehicleDataLog } from "~/types/vehicleAccess";
import { formatDateTime } from "~/utils/dateUtils";
import Pagination from "~/components/common/Pagination.vue";

interface Props {
	modelValue: boolean;
	groupName: string;
	records: VehicleDataLog[];
	isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isLoading: false
});

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
}>();

const itemsPerPage = 6;
const offset = ref(0);

const paginatedRecords = computed(() => {
	const start = offset.value;
	const end = start + itemsPerPage;
	return props.records.slice(start, end);
});

watch(
	() => props.records.length,
	() => {
		offset.value = 0;
	}
);

const formatTriggerTime = (triggerTime: string | null): string =>
	triggerTime ? formatDateTime(triggerTime, true) : "-";

const formatLaneType = (laneType: number | null | undefined): string => {
	if (laneType === 1) return "進";
	if (laneType === 2) return "出";
	return "-";
};

const handleImageError = (event: Event) => {
	const img = event.target as HTMLImageElement;
	img.style.display = "none";
};

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage);
};

const handleNext = () => {
	if (offset.value + itemsPerPage < props.records.length) {
		offset.value += itemsPerPage;
	}
};

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
</style>
