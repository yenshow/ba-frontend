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
							{{ unitName }} - 人員名單
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
							v-if="personnel.length === 0"
							class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
						>
							<p class="text-sm text-white/60 xl:text-base">尚無人員資料</p>
						</div>
						<div v-else class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div
									v-for="person in paginatedPersonnel"
									:key="`${person.id}-${person.unitId}`"
									class="flex items-start gap-3 border-2 border-white/30 p-3"
									:class="[person.isPresent ? 'bg-white/20' : 'bg-black/20']"
								>
									<!-- 照片（/uploads/ 改為後端完整 URL） -->
									<div class="mt-4 h-16 w-16 overflow-hidden rounded-full bg-white/10">
										<img
											v-if="resolvePhotoUrl(person.photoUrl)"
											:src="resolvePhotoUrl(person.photoUrl)"
											:alt="person.name"
											class="h-full w-full object-cover"
											@error="handleImageError($event)"
										/>
									</div>

									<!-- 資訊 -->
									<div class="min-w-0 flex-1">
										<div class="border-b border-white/30 pb-1 text-base font-medium text-white 2xl:text-xl">
											{{ person.name }}
										</div>
										<div class="mt-1 space-y-0.5 text-xs text-white/60 xl:text-sm">
											<!-- 最近進場：顯示日期（不含時分秒） -->
											<div v-if="person.lastEntryDate">
												<span>最近進場：</span>
												<span>{{ person.lastEntryDate }}</span>
											</div>
											<!-- 進場時間：根據最近進場的日期，顯示時分秒 -->
											<div v-if="person.entryTime">
												<span>進場時間：</span>
												<span>{{ person.entryTime }}</span>
											</div>
											<!-- 離場時間：根據最近進場的日期，顯示時分秒 -->
											<!-- 如果是今日進場，顯示今日的離場時間；如果今日沒有離場，顯示 "- -" -->
											<div v-if="person.lastEntryDate || person.entryTime">
												<span>離場時間：</span>
												<span v-if="person.exitTime && !shouldHideExitTime(person)">
													{{ person.exitTime }}
												</span>
												<span v-else> - - </span>
											</div>
											<div
												v-if="!person.lastEntryDate && !person.entryTime && !person.exitTime"
												class="text-white/40"
											>
												尚無進出場記錄
											</div>
										</div>
									</div>
								</div>
							</div>
							<Pagination
								:total="personnel.length"
								:offset="offset"
								:limit="itemsPerPage"
								:show="personnel.length > itemsPerPage"
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
import type { PeopleCountingPersonnel } from "~/types/peopleCounting";
import Pagination from "~/components/common/Pagination.vue";
import { resolveUploadUrl } from "~/utils/apiUtils";

interface Props {
	modelValue: boolean;
	unitName: string;
	personnel: PeopleCountingPersonnel[];
	isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isLoading: false
});

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "close"): void;
}>();

// 固定每頁顯示 4 個（不分尺寸）
const itemsPerPage = 4;

// 當前分頁偏移量
const offset = ref(0);

// 計算當前頁顯示的人員
const paginatedPersonnel = computed(() => {
	const start = offset.value;
	const end = start + itemsPerPage;
	return props.personnel.slice(start, end);
});

// 監聽 personnel 變化，確保 offset 不會超出範圍
watch(
	() => props.personnel.length,
	newLength => {
		if (offset.value >= newLength) {
			offset.value = 0;
		}
	}
);

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage);
};

const handleNext = () => {
	if (offset.value + itemsPerPage < props.personnel.length) {
		offset.value += itemsPerPage;
	}
};

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

const shouldHideExitTime = (person: PeopleCountingPersonnel) => {
	const entrySec = parseTimeToSeconds(person.entryTime);
	const exitSec = parseTimeToSeconds(person.exitTime);
	if (entrySec == null || exitSec == null) return false;
	return entrySec > exitSec;
};

const config = useRuntimeConfig();
const apiBase = (config.public.apiBase as string) || "";
const resolvePhotoUrl = (url: string | undefined | null): string =>
	resolveUploadUrl(url ?? "", apiBase);

const handleImageError = (event: Event) => {
	const img = event.target as HTMLImageElement;
	img.src = "/people-counting/no-photo-placeholder.png";
};

const handleClose = () => {
	emit("update:modelValue", false);
	emit("close");
};
</script>

<style scoped>
</style>
