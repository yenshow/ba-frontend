<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-xl flex-col gap-4 overflow-hidden rounded-3xl p-8 2xl:max-w-2xl"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ listTitle }}
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
							<p class="text-base text-white/60 2xl:text-lg">{{ emptyText }}</p>
						</div>

						<div v-else class="space-y-4">
							<div
								class="mx-auto grid w-[240px] grid-cols-1 gap-4 2xl:w-full 2xl:grid-cols-2"
							>
								<div
									v-for="item in paginatedList"
									:key="itemKey(item)"
									class="flex min-h-[100px] items-start gap-3 border-2 border-white/30 p-3 2xl:min-h-[130px]"
									:class="[item.isPresent ? 'bg-white/20' : 'bg-black/20']"
								>
									<div
										v-if="isPersonnelList"
										class="relative mt-2 h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10 2xl:mt-4"
									>
										<Transition name="fade">
											<img
												v-if="resolveUrl(item.photoUrl) && !imageErrorStates[item.id]"
												key="photo"
												:src="resolveUrl(item.photoUrl)"
												:alt="memberDisplayName(item)"
												class="absolute inset-0 h-full w-full object-cover"
												@error="handleImageError($event, item.id)"
											/>
										</Transition>
										<Transition name="fade">
											<div
												v-if="!resolveUrl(item.photoUrl) || imageErrorStates[item.id]"
												class="absolute inset-0 flex items-center justify-center"
											>
												<svg
													class="h-12 w-12 text-white 2xl:h-16 2xl:w-16"
													fill="currentColor"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
													/>
												</svg>
											</div>
										</Transition>
									</div>

									<div class="min-w-0 2xl:flex-1">
										<div
											class="border-b border-white/30 pb-1 text-base font-medium text-white 2xl:text-xl"
										>
											{{ memberDisplayName(item) }}
										</div>
										<div class="mt-2 space-y-0.5 text-xs text-white/60 2xl:text-sm">
											<div v-if="isPersonnelList && item.plate_license?.trim() && item.plate_license !== '—'">
												<span>車牌號碼：</span>
												<span>{{ item.plate_license }}</span>
											</div>
											<div
												v-if="!isPersonnelList && item.owner_name?.trim()"
											>
												<span>車主姓名：</span>
												<span>{{ item.owner_name?.trim() }}</span>
											</div>
											<div v-if="item.lastEntryDate">
												<span>最近進場：</span>
												<span>{{ item.lastEntryDate }}</span>
											</div>
											<div v-if="item.entryTime">
												<span>進場時間：</span>
												<span>{{ item.entryTime }}</span>
											</div>
											<div v-if="item.lastEntryDate || item.entryTime">
												<span>離場時間：</span>
												<span v-if="item.exitTime && !shouldHideExitTime(item)">
													{{ item.exitTime }}
												</span>
												<span v-else> - - </span>
											</div>
											<div
												v-if="!item.lastEntryDate && !item.entryTime && !item.exitTime"
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
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { VehicleGroupMemberItem } from "~/types/vehicleAccess";
import Pagination from "~/components/common/Pagination.vue";
import { useImageCenter } from "~/composables/core/useImageCenter";

interface Props {
	modelValue: boolean;
	groupName: string;
	vehicleList: VehicleGroupMemberItem[];
	/** 人員群組（ISAPI）對齊人流 PersonnelList；預設為車輛名單 */
	listVariant?: "personnel" | "vehicle";
}

const props = withDefaults(defineProps<Props>(), {
	listVariant: "vehicle",
});

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
}>();

const isPersonnelList = computed(() => props.listVariant === "personnel");

const listTitle = computed(() => {
	const name = props.groupName?.trim();
	if (isPersonnelList.value) {
		return name ? `${name} 人員名單` : "人員名單";
	}
	return name ? `${name} - 車輛名單` : "車輛名單";
});

const emptyText = computed(() =>
	isPersonnelList.value ? "尚無人員資料" : "尚無車輛資料"
);

const { resolveUrl } = useImageCenter();
const imageErrorStates = ref<Record<string | number, boolean>>({});

const windowWidth = ref(1024);
const itemsPerPage = computed(() => (windowWidth.value >= 1536 ? 4 : 2));
const offset = ref(0);

const paginatedList = computed(() => {
	const start = offset.value;
	return props.vehicleList.slice(start, start + itemsPerPage.value);
});

watch(
	() => props.vehicleList.length,
	newLength => {
		if (offset.value >= newLength) {
			offset.value = 0;
		}
	}
);

const memberDisplayName = (item: VehicleGroupMemberItem): string => {
	const name = item.name?.trim() || item.owner_name?.trim() || "";
	if (isPersonnelList.value) {
		return name || "—";
	}
	const plate = item.plate_license?.trim() || "";
	if (name && plate) return plate;
	return plate || name || "—";
};

const itemKey = (item: VehicleGroupMemberItem) =>
	isPersonnelList.value ? item.id : `${item.id}-${item.plate_license ?? ""}`;

const parseTimeToSeconds = (time?: string | null) => {
	if (!time) return null;
	const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	const ss = m[3] ? Number(m[3]) : 0;
	if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null;
	return hh * 3600 + mm * 60 + ss;
};

const shouldHideExitTime = (item: VehicleGroupMemberItem) => {
	const entrySec = parseTimeToSeconds(item.entryTime);
	const exitSec = parseTimeToSeconds(item.exitTime ?? null);
	if (entrySec == null || exitSec == null) return false;
	return entrySec > exitSec;
};

const handleImageError = (_event: Event, personId: string | number) => {
	imageErrorStates.value[personId] = true;
};

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage.value);
};

const handleNext = () => {
	if (offset.value + itemsPerPage.value < props.vehicleList.length) {
		offset.value += itemsPerPage.value;
	}
};

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};

let handleResize: (() => void) | null = null;
let lastItemsPerPage = 2;

onMounted(() => {
	if (!process.client) return;
	windowWidth.value = window.innerWidth;
	lastItemsPerPage = itemsPerPage.value;
	handleResize = () => {
		windowWidth.value = window.innerWidth;
		const next = itemsPerPage.value;
		if (next !== lastItemsPerPage) {
			offset.value = 0;
			lastItemsPerPage = next;
		}
	};
	window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
	if (handleResize && process.client) {
		window.removeEventListener("resize", handleResize);
	}
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
