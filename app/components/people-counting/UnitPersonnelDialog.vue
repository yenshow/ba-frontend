<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div v-if="modelValue" class="fixed inset-0 z-[3000] flex items-center justify-center">
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
							<div class="mx-auto grid w-[240px] grid-cols-1 gap-4 2xl:w-full 2xl:grid-cols-2">
								<div
									v-for="person in paginatedPersonnel"
									:key="person.id"
									class="flex min-h-[100px] items-start gap-3 border-2 border-white/30 p-3 2xl:min-h-[130px]"
									:class="[person.isPresent ? 'monitoring-chip-bg' : 'bg-black/20']"
								>
									<div
										class="relative mt-2 h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10 2xl:mt-4"
									>
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
										<div class="border-b border-white/30 pb-1 text-base font-medium text-white 2xl:text-xl">
											{{ person.name }}
										</div>
										<div class="mt-2 space-y-0.5 text-xs text-white/60 2xl:text-sm">
											<div v-if="person.lastEntryDate">
												<span>最近進場：</span>
												<span>{{ person.lastEntryDate }}</span>
											</div>
											<div v-if="person.entryTime">
												<span>進場時間：</span>
												<span>{{ person.entryTime }}</span>
											</div>
											<div v-if="person.lastEntryDate || person.entryTime">
												<span>離場時間：</span>
												<span
													v-if="person.exitTime && !shouldHideExitTime(person.entryTime, person.exitTime)"
												>
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
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import type { PeopleCountingPersonnel } from "~/types/peopleCounting"
import Pagination from "~/components/common/Pagination.vue"
import { useImageCenter } from "~/composables/core/useImageCenter"

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

const props = withDefaults(
	defineProps<{
		modelValue: boolean
		unitName?: string
		personnel?: PeopleCountingPersonnel[]
	}>(),
	{
		unitName: "人員群組",
		personnel: () => [],
	}
)

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
}>()

const { resolveUrl } = useImageCenter()
const imageErrorStates = ref<Record<string | number, boolean>>({})
const windowWidth = ref(1024)
const itemsPerPage = computed(() => (windowWidth.value >= 1536 ? 4 : 2))
const offset = ref(0)

const paginatedPersonnel = computed(() => {
	const start = offset.value
	return props.personnel.slice(start, start + itemsPerPage.value)
})

watch(
	() => props.personnel.length,
	(newLength) => {
		if (offset.value >= newLength) offset.value = 0
	}
)

watch(itemsPerPage, (next, prev) => {
	if (next !== prev) offset.value = 0
})

const handleImageError = (_event: Event, personId: string | number) => {
	imageErrorStates.value[personId] = true
}

const handlePrevious = () => {
	offset.value = Math.max(0, offset.value - itemsPerPage.value)
}

const handleNext = () => {
	if (offset.value + itemsPerPage.value < props.personnel.length) {
		offset.value += itemsPerPage.value
	}
}

const handleClose = () => {
	emit("update:modelValue", false)
}

let handleResize: (() => void) | null = null

onMounted(() => {
	if (!process.client) return
	windowWidth.value = window.innerWidth
	handleResize = () => {
		windowWidth.value = window.innerWidth
	}
	window.addEventListener("resize", handleResize)
})

onUnmounted(() => {
	if (handleResize && process.client) {
		window.removeEventListener("resize", handleResize)
	}
})
</script>
