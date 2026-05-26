<template>
	<div class="space-y-4">
		<h3 class="font-semibold text-lg bg-white/20 text-white text-center 2xl:text-xl py-1">
			人員名單
		</h3>
		<div
			v-if="personnel.length === 0"
			class="rounded-lg border-2 border-white/20 bg-white/5 p-8 text-center"
		>
			<p class="text-base text-white/60 2xl:text-lg">尚無人員資料</p>
		</div>

		<div v-else class="space-y-4">
			<div class="grid grid-cols-1 2xl:grid-cols-2 gap-4 w-[240px] 2xl:w-full mx-auto">
				<div
					v-for="person in paginatedPersonnel"
					:key="person.id"
					class="flex items-start gap-3 border-2 border-white/30 p-3 min-h-[100px] 2xl:min-h-[130px]"
					:class="[person.isPresent ? 'bg-white/20' : 'bg-black/20']"
				>
					<!-- 照片（/uploads/ 改為後端完整 URL） -->
					<div class="relative overflow-hidden rounded-full bg-white/10 h-16 w-16 mt-2 2xl:mt-4">
						<Transition name="fade">
							<img
								v-if="resolveUrl(person.photoUrl) && !imageErrorStates[person.id]"
								key="photo"
								:src="resolveUrl(person.photoUrl)"
								:alt="person.name"
								class="absolute inset-0 h-full w-full object-cover"
								@error="handleImageError($event, person.id)"
							/>
						</Transition>
						<Transition name="fade">
							<div
								v-if="!resolveUrl(person.photoUrl) || imageErrorStates[person.id]"
								class="absolute inset-0 flex items-center justify-center"
							>
								<svg
									class="h-20 w-20 text-white"
									fill="currentColor"
									stroke="currentColor"
									viewBox="0 0 24 24"
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

					<!-- 資訊 -->
					<div class="min-w-0 2xl:flex-1">
						<div class="font-medium text-white text-base 2xl:text-xl border-b border-white/30 pb-1">
							{{ person.name }}
						</div>
						<div class="mt-2 space-y-0.5 text-xs text-white/60 2xl:text-sm">
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import type { PeopleCountingPersonnel } from "~/types/peopleCounting"
import Pagination from "~/components/common/Pagination.vue"
import { useImageCenter } from "~/composables/core/useImageCenter"

interface Props {
	personnel: PeopleCountingPersonnel[]
}

const props = defineProps<Props>()
const { resolveUrl } = useImageCenter()

// 追蹤圖片錯誤狀態
const imageErrorStates = ref<Record<string | number, boolean>>({})

// 追蹤視窗寬度以實現響應式
const windowWidth = ref(1024)

// 根據螢幕尺寸計算每頁顯示的人員數量
const itemsPerPage = computed(() => {
	// 2xl: 1536px
	if (windowWidth.value >= 1536) {
		return 4 // 2xl: 2列 × 2行 = 4個
	} else {
		return 2 // 一般尺寸: 1列 × 2行 = 2個
	}
})

// 當前分頁偏移量
const offset = ref(0)

// 計算當前頁顯示的人員
const paginatedPersonnel = computed(() => {
	const start = offset.value
	const end = start + itemsPerPage.value
	return props.personnel.slice(start, end)
})

// 監聽 personnel 變化，確保 offset 不會超出範圍
watch(
	() => props.personnel.length,
	(newLength) => {
		if (offset.value >= newLength) {
			offset.value = 0
		}
	}
)

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage.value)
}

const handleNext = () => {
	if (offset.value + itemsPerPage.value < props.personnel.length) {
		offset.value += itemsPerPage.value
	}
}

let handleResize: (() => void) | null = null
let lastItemsPerPage = 2

onMounted(() => {
	if (!process.client) return

	windowWidth.value = window.innerWidth
	lastItemsPerPage = itemsPerPage.value

	handleResize = () => {
		windowWidth.value = window.innerWidth
		const newItemsPerPage = itemsPerPage.value
		if (newItemsPerPage !== lastItemsPerPage) {
			offset.value = 0
			lastItemsPerPage = newItemsPerPage
		}
	}

	window.addEventListener("resize", handleResize)
})

onUnmounted(() => {
	if (handleResize && process.client) {
		window.removeEventListener("resize", handleResize)
	}
})

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

const shouldHideExitTime = (person: PeopleCountingPersonnel) => {
	const entrySec = parseTimeToSeconds(person.entryTime)
	const exitSec = parseTimeToSeconds(person.exitTime)
	if (entrySec == null || exitSec == null) return false
	return entrySec > exitSec
}

const handleImageError = (_event: Event, personId: string | number) => {
	imageErrorStates.value[personId] = true
}
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
