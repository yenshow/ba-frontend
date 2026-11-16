<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<header class="me-4 flex flex-col gap-1 2xl:gap-2">
					<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">多媒體資訊</h1>
					<p class="text-base text-white/80 2xl:text-xl">管理資訊牆基礎設定、公告與排程</p>
				</header>
				<PageTabs
					v-model="activeTab"
					list-class="w-fit"
					:tabs="multimediaTabs"
					:panels="false"
					aria-label="多媒體資訊分頁"
					id-prefix="multimedia-tab"
				/>
			</div>
			<div class="flex items-center gap-3">
				<NuxtLink
					to="/multimedia/wall"
					class="rounded-xl bg-white/10 px-4 py-2 text-base text-white hover:bg-white/20 2xl:px-6 2xl:py-3 2xl:text-lg"
				>
					資訊牆看板
				</NuxtLink>
				<button
					v-if="activeTab !== 'seats'"
					type="button"
					class="rounded-xl bg-purple-500/80 px-4 py-2 text-base text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-500/40 2xl:px-6 2xl:py-3 2xl:text-lg"
					:disabled="isSaving || !canUpdateSettings"
					@click="handleSave"
				>
					{{ isSaving ? "儲存中..." : "儲存" }}
				</button>
			</div>
		</div>

		<fieldset :disabled="!canUpdateSettings" class="min-w-0 border-0 p-0">
			<PageTabs
				v-model="activeTab"
				:tabs="multimediaTabs"
				:list="false"
				aria-label="多媒體資訊分頁"
				id-prefix="multimedia-tab"
			>
				<template #basic>
					<div
						class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto]"
					>
						<section
							class="monitoring-panel flex min-h-0 flex-col rounded-2xl p-5 text-white lg:row-start-1"
						>
							<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">基本設定</h2>
							<div class="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
								<ImageField
									label="背景圖"
									:value="draft.backgroundImageUrl"
									accept="image/*"
									@upload="(f) => handleUpload(f, (url) => (draft.backgroundImageUrl = url))"
								/>
								<ImageField
									label="LOGO"
									:value="draft.projectImageUrl"
									accept="image/*"
									@upload="(f) => handleUpload(f, (url) => (draft.projectImageUrl = url))"
								/>
								<ImageField
									label="多媒體影像"
									:value="draft.heroImageUrl"
									accept="image/*,video/*"
									@upload="(f) => handleUpload(f, (url) => (draft.heroImageUrl = url))"
								/>
							</div>
						</section>

						<section
							class="monitoring-panel flex min-h-0 flex-col rounded-2xl p-5 text-white lg:row-start-1"
						>
							<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">
								環境資訊來源
							</h2>

							<div class="mt-4 min-h-0 flex-1">
								<div
									v-if="isLoadingSensorDevices"
									class="py-4 text-center text-base text-white/60"
								>
									載入中...
								</div>
								<div
									v-else-if="sensorDevices.length === 0"
									class="py-4 text-center text-base text-amber-300"
								>
									尚無可用感測器，請先在「設備管理」中建立感測器設備
								</div>
								<div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<label
										v-for="device in sensorDevices"
										:key="device.id"
										class="flex min-h-[2.75rem] cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:bg-white/10"
										:class="{
											'border-cyan-400/50 bg-cyan-500/20': isEnvDeviceSelected(device.id),
										}"
									>
										<input
											type="checkbox"
											:checked="isEnvDeviceSelected(device.id)"
											class="h-4 w-4 shrink-0 cursor-pointer accent-cyan-400"
											:aria-label="`勾選感測器 ${device.name}`"
											@change="handleToggleEnvDevice(device.id)"
										/>
										<span class="truncate text-sm text-white 2xl:text-base">{{
											device.name
										}}</span>
									</label>
								</div>
							</div>

							<div class="mt-4 shrink-0 border-t border-white/20 pt-4">
								<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
									<div
										v-for="item in fixedEnvSkeleton"
										:key="item.key"
										class="flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
									>
										<span
											class="h-2.5 w-2.5 shrink-0 rounded-full"
											:class="item.isSupported ? 'bg-emerald-400' : 'bg-white/25'"
											:title="item.isSupported ? '設備已支援' : '設備不支援 / 未選取'"
										/>
										<span class="truncate text-sm text-white 2xl:text-base">{{
											item.label
										}}</span>
										<span class="ml-auto shrink-0 text-xs text-white/50 2xl:text-sm">{{
											item.unit
										}}</span>
									</div>
								</div>
							</div>
						</section>

						<section
							class="monitoring-panel flex flex-col rounded-2xl p-5 text-white lg:row-start-2"
						>
							<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">布局橫幅</h2>
							<textarea
								v-model="draft.bannerMarqueeText"
								rows="3"
								class="form-input-small mt-4 min-h-[6.5rem] w-full flex-1 resize-y"
								placeholder="例如：社區水泵維護"
								aria-label="布局橫幅文字"
							/>
						</section>

						<section
							class="monitoring-panel flex flex-col rounded-2xl p-5 text-white lg:row-start-2"
						>
							<h2 class="text-xl font-semibold tracking-[4px] 2xl:text-2xl">
								資訊牆分頁 / 輪播
							</h2>
							<div class="mt-4 grid flex-1 grid-cols-1 content-start gap-3 sm:grid-cols-2">
								<label class="block min-w-0">
									<div class="mb-1 text-sm text-white/80">公告每頁筆數</div>
									<input
										v-model.number="draft.wallAnnouncementsPerPage"
										type="number"
										min="1"
										max="20"
										class="form-input-small w-full"
										aria-label="公告每頁筆數"
									/>
								</label>
								<label class="block min-w-0">
									<div class="mb-1 text-sm text-white/80">排程每頁筆數</div>
									<input
										v-model.number="draft.wallSchedulesPerPage"
										type="number"
										min="1"
										max="20"
										class="form-input-small w-full"
										aria-label="排程每頁筆數"
									/>
								</label>
								<label class="block min-w-0">
									<div class="mb-1 text-sm text-white/80">公告輪播間隔（秒）</div>
									<input
										v-model.number="wallAnnouncementAutoPageIntervalSec"
										type="number"
										min="1"
										max="120"
										class="form-input-small w-full"
										aria-label="公告輪播間隔秒數"
									/>
								</label>
								<label class="block min-w-0">
									<div class="mb-1 text-sm text-white/80">排程輪播間隔（秒）</div>
									<input
										v-model.number="wallScheduleAutoPageIntervalSec"
										type="number"
										min="1"
										max="120"
										class="form-input-small w-full"
										aria-label="排程輪播間隔秒數"
									/>
								</label>
							</div>
						</section>
					</div>
				</template>

				<template #content>
					<div class="grid grid-cols-12 gap-6">
						<div class="col-span-7 space-y-6">
							<section
								class="min-h-[420px] monitoring-panel rounded-2xl p-5 text-white"
							>
								<div class="flex items-center justify-between gap-3">
									<h2 class="text-xl font-semibold tracking-[6px]">社區公告</h2>
									<button
										type="button"
										class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
										@click="handleAddAnnouncement"
									>
										新增公告
									</button>
								</div>
								<div class="mt-4 space-y-4">
									<div
										v-for="(a, idx) in pagedAnnouncements"
										:key="a.id"
										class="rounded-xl border border-white/15 bg-black/15 p-4"
									>
										<div class="flex items-center justify-between gap-3">
											<div class="flex items-center gap-3">
												<label class="flex items-center gap-2 text-xl text-white/80">
													<input v-model="a.pinned" type="checkbox" class="h-4 w-4" />
													置頂
												</label>
												<label class="flex items-center gap-2 text-xl text-white/80">
													<input v-model="a.enabled" type="checkbox" class="h-4 w-4" />
													啟用
												</label>
											</div>
											<div class="flex items-center gap-2">
												<div class="btn-reorder-stack">
													<button
														type="button"
														class="btn-reorder-arrow"
														:disabled="announcementOffset + idx <= 0"
														title="上移"
														aria-label="此公告上移"
														@click="handleReorderAnnouncement(announcementOffset + idx, 'up')"
													>
														↑
													</button>
													<button
														type="button"
														class="btn-reorder-arrow"
														:disabled="
															announcementOffset + idx >= (draft.announcements || []).length - 1
														"
														title="下移"
														aria-label="此公告下移"
														@click="handleReorderAnnouncement(announcementOffset + idx, 'down')"
													>
														↓
													</button>
												</div>
												<button
													type="button"
													class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-2 text-sm font-light text-white transition-all hover:bg-white/10"
													@click="requestRemoveAnnouncement(announcementOffset + idx)"
												>
													刪除
												</button>
											</div>
										</div>

										<div class="mt-3 grid grid-cols-2 gap-3">
											<label class="block">
												<div class="mb-1 text-sm text-white/80">開始日期</div>
												<input v-model="a.startDate" type="date" class="form-input-small w-full" />
											</label>
											<label class="block">
												<div class="mb-1 text-sm text-white/80">結束日期</div>
												<input v-model="a.endDate" type="date" class="form-input-small w-full" />
											</label>
										</div>

										<div class="mt-3 grid grid-cols-1 gap-3">
											<label class="block">
												<div class="mb-1 text-sm text-white/80">內容</div>
												<textarea
													v-model="a.title"
													rows="2"
													class="form-input-small w-full"
													placeholder="例如：社區水泵維護"
												/>
											</label>
										</div>
									</div>
									<Pagination
										:total="draft.announcements.length"
										:offset="announcementOffset"
										:limit="ITEMS_PER_PAGE"
										:show="draft.announcements.length > ITEMS_PER_PAGE"
										@previous="handleAnnouncementPrevious"
										@next="handleAnnouncementNext"
									/>
								</div>
							</section>
						</div>

						<div class="col-span-5 space-y-6">
							<section
								class="min-h-[420px] monitoring-panel rounded-2xl p-5 text-white"
							>
								<div class="flex items-center justify-between gap-3">
									<h2 class="text-xl font-semibold tracking-[6px]">今日社區排程</h2>
									<button
										type="button"
										class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
										@click="handleAddSchedule"
									>
										新增排程
									</button>
								</div>
								<div class="mt-4 space-y-4">
									<div
										v-for="(s, idx) in pagedSchedules"
										:key="s.id"
										class="rounded-xl border border-white/15 bg-black/15 p-4"
									>
										<div class="flex items-center justify-between gap-3">
											<div class="flex items-center gap-3">
												<label class="flex items-center gap-2 text-xl text-white/80">
													<input v-model="s.enabled" type="checkbox" class="h-4 w-4" />
													啟用
												</label>
											</div>
											<div class="flex items-center gap-2">
												<div class="btn-reorder-stack">
													<button
														type="button"
														class="btn-reorder-arrow"
														:disabled="scheduleOffset + idx <= 0"
														title="上移"
														aria-label="此排程上移"
														@click="handleReorderSchedule(scheduleOffset + idx, 'up')"
													>
														↑
													</button>
													<button
														type="button"
														class="btn-reorder-arrow"
														:disabled="scheduleOffset + idx >= (draft.schedules || []).length - 1"
														title="下移"
														aria-label="此排程下移"
														@click="handleReorderSchedule(scheduleOffset + idx, 'down')"
													>
														↓
													</button>
												</div>
												<button
													type="button"
													class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-2 text-sm font-light text-white transition-all hover:bg-white/10"
													@click="requestRemoveSchedule(scheduleOffset + idx)"
												>
													刪除
												</button>
											</div>
										</div>

										<div class="mt-3 grid grid-cols-2 gap-3">
											<label class="block">
												<div class="mb-1 text-sm text-white/80">開始</div>
												<input v-model="s.startTime" type="time" class="form-input-small w-full" />
											</label>
											<label class="block">
												<div class="mb-1 text-sm text-white/80">結束</div>
												<input v-model="s.endTime" type="time" class="form-input-small w-full" />
											</label>
										</div>

										<label class="mt-3 block">
											<div class="mb-1 text-sm text-white/80">內容</div>
											<input
												v-model="s.title"
												type="text"
												class="form-input-small w-full"
												placeholder="例如：社區水泵維護"
											/>
										</label>
									</div>
									<Pagination
										:total="draft.schedules.length"
										:offset="scheduleOffset"
										:limit="ITEMS_PER_PAGE"
										:show="draft.schedules.length > ITEMS_PER_PAGE"
										@previous="handleSchedulePrevious"
										@next="handleScheduleNext"
									/>
								</div>
							</section>
						</div>
					</div>
				</template>

				<template #seats>
					<section class="space-y-4" aria-label="資訊牆授權席次">
						<header class="me-4 flex flex-col gap-1">
							<h2 class="text-2xl font-semibold tracking-[4px] text-white">授權電腦</h2>
							<p class="text-sm text-white/70 2xl:text-base">
								每台資訊牆佔 1 席（本機啟用憑證綁定指紋）；約 60 分鐘無請求自動回收。撤銷後原機須重新啟用。
							</p>
						</header>

						<div
							v-if="seatsLoading && wallSeats.length === 0"
							class="py-10 text-center text-white/60"
						>
							載入中…
						</div>
						<div
							v-else-if="wallSeats.length === 0"
							class="monitoring-panel rounded-2xl px-6 py-12 text-center text-white/70"
						>
							目前無已註冊牆面電腦
						</div>

						<ul
							v-else
							class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
						>
							<li
								v-for="seat in wallSeats"
								:key="seat.fingerprint"
								class="monitoring-panel flex flex-col rounded-2xl p-5 text-white"
							>
								<div class="flex items-center justify-between gap-3">
									<h3 class="min-w-0 truncate text-xl font-semibold tracking-[2px]">
										{{ seat.hostname || "未知主機" }}
									</h3>
									<span
										class="shrink-0 text-sm font-semibold"
										:class="seat.active ? 'text-emerald-300' : 'text-white/45'"
									>
										{{ seat.active ? "使用中" : "離線" }}
									</span>
								</div>

								<div class="mt-4 space-y-2 text-sm text-white/75">
									<div class="flex items-baseline justify-between gap-3">
										<span class="text-white/50">最近連線</span>
										<span>{{ formatSeatTime(seat.lastSeenAt) }}</span>
									</div>
									<div class="flex items-baseline justify-between gap-3">
										<span class="text-white/50">首次註冊</span>
										<span>{{ formatSeatTime(seat.registeredAt) }}</span>
									</div>
								</div>

								<button
									type="button"
									class="mt-5 w-full rounded-xl border border-rose-300/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
									:disabled="!canUpdateSettings || seatsLoading"
									:aria-label="`撤銷席次 ${seat.hostname || seat.fingerprint}`"
									@click="handleRevokeSeat(seat.fingerprint)"
								>
									撤銷席次
								</button>
							</li>
						</ul>
					</section>
				</template>
			</PageTabs>
		</fieldset>

		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			:confirm-text="confirmDialogConfig.confirmText"
			:cancel-text="confirmDialogConfig.cancelText"
			@confirm="handleConfirmDelete"
		/>
	</div>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import PageTabs from "~/components/common/PageTabs.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import Pagination from "~/components/common/Pagination.vue"
import ImageField from "~/components/multimedia/ImageField.vue"
import { getParameterDisplayName } from "~/utils/sensorUtils"
import type { Device, DeviceModel, SensorParameterDefinition } from "~/types/device"
import type {
	MultimediaAnnouncement,
	MultimediaDashboardSettings,
	MultimediaSchedule,
} from "~/types/multimedia"

definePageMeta({ layout: "default" })

import { useMultimediaRbac } from "~/composables/core/useAccessGate"
import { MSG_PERMISSION_LOCKED } from "~/utils/apiError"
const { canUpdateSettings } = useMultimediaRbac()
const toast = useToast()
const { handleError } = useErrorHandler()
const api = useMultimediaDashboardApi()
const deviceApi = useDeviceApi()

type WallSeatRow = {
	fingerprint: string
	hostname: string | null
	registeredAt: string
	lastSeenAt: string
	active: boolean
}
const wallSeats = ref<WallSeatRow[]>([])
const seatsLoading = ref(false)

const formatSeatTime = (raw: string | null | undefined) => {
	const s = String(raw || "").trim()
	if (!s) return "—"
	const d = new Date(s)
	if (Number.isNaN(d.getTime())) return s
	return d.toLocaleString("zh-TW", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	})
}

const handleRefreshSeats = async () => {
	seatsLoading.value = true
	try {
		const res = await api.listWallSeats()
		wallSeats.value = Array.isArray(res?.seats) ? res.seats : []
	} catch (error) {
		handleError(error, "載入授權席次失敗")
	} finally {
		seatsLoading.value = false
	}
}

const handleRevokeSeat = async (fingerprint: string) => {
	if (!canUpdateSettings.value) return
	seatsLoading.value = true
	try {
		await api.revokeWallSeat(fingerprint)
		await handleRefreshSeats()
	} catch (error) {
		handleError(error, "撤銷席次失敗")
		seatsLoading.value = false
	}
}

const isSaving = ref(false)
const activeTab = ref<"basic" | "content" | "seats">("basic")
const multimediaTabs = [
	{ id: "basic" as const, label: "基本設定" },
	{ id: "content" as const, label: "公告列表" },
	{ id: "seats" as const, label: "授權電腦" },
]

watch(activeTab, (tab) => {
	if (tab === "seats") void handleRefreshSeats()
})

const FIXED_ENV_SKELETON_KEYS = [
	"temperature",
	"humidity",
	"aqi",
	"illuminance",
	"heatIndex",
	"ph",
] as const

const draft = reactive<MultimediaDashboardSettings>({
	backgroundImageUrl: "",
	projectImageUrl: "",
	heroImageUrl: "",
	bannerMarqueeText: "",
	envDeviceIds: [],
	envDisplayParameters: [],
	wallAnnouncementsPerPage: 5,
	wallSchedulesPerPage: 4,
	wallAnnouncementsAutoPageIntervalMs: 10000,
	wallSchedulesAutoPageIntervalMs: 10000,
	announcements: [],
	schedules: [],
})

const wallAnnouncementAutoPageIntervalSec = computed({
	get: () =>
		Math.max(1, Math.round(Number(draft.wallAnnouncementsAutoPageIntervalMs || 10000) / 1000)),
	set: (sec: number) => {
		const n = Number(sec)
		if (!Number.isFinite(n)) return
		draft.wallAnnouncementsAutoPageIntervalMs = Math.round(Math.max(1, n) * 1000)
	},
})

const wallScheduleAutoPageIntervalSec = computed({
	get: () => Math.max(1, Math.round(Number(draft.wallSchedulesAutoPageIntervalMs || 10000) / 1000)),
	set: (sec: number) => {
		const n = Number(sec)
		if (!Number.isFinite(n)) return
		draft.wallSchedulesAutoPageIntervalMs = Math.round(Math.max(1, n) * 1000)
	},
})

const ITEMS_PER_PAGE = 5
const announcementOffset = ref(0)
const scheduleOffset = ref(0)

const pagedAnnouncements = computed(() =>
	(draft.announcements || []).slice(
		announcementOffset.value,
		announcementOffset.value + ITEMS_PER_PAGE
	)
)

const pagedSchedules = computed(() =>
	(draft.schedules || []).slice(scheduleOffset.value, scheduleOffset.value + ITEMS_PER_PAGE)
)

const clampOffset = (offset: Ref<number>, total: number) => {
	if (total <= 0) {
		offset.value = 0
		return
	}
	const maxOffset = Math.max(0, Math.floor((total - 1) / ITEMS_PER_PAGE) * ITEMS_PER_PAGE)
	offset.value = Math.max(0, Math.min(offset.value, maxOffset))
}

watch(
	() => (draft.announcements || []).length,
	(total) => clampOffset(announcementOffset, total),
	{ immediate: true }
)

watch(
	() => (draft.schedules || []).length,
	(total) => clampOffset(scheduleOffset, total),
	{ immediate: true }
)

const handleAnnouncementPrevious = () => {
	announcementOffset.value = Math.max(0, announcementOffset.value - ITEMS_PER_PAGE)
}

const handleAnnouncementNext = () => {
	const total = (draft.announcements || []).length
	if (announcementOffset.value + ITEMS_PER_PAGE >= total) return
	announcementOffset.value = announcementOffset.value + ITEMS_PER_PAGE
}

const handleSchedulePrevious = () => {
	scheduleOffset.value = Math.max(0, scheduleOffset.value - ITEMS_PER_PAGE)
}

const handleScheduleNext = () => {
	const total = (draft.schedules || []).length
	if (scheduleOffset.value + ITEMS_PER_PAGE >= total) return
	scheduleOffset.value = scheduleOffset.value + ITEMS_PER_PAGE
}

const isLoadingSensorDevices = ref(false)
const allDevices = ref<Device[]>([])
const sensorModelParameterDefinitions = ref<Map<number, SensorParameterDefinition[]>>(new Map())

const sensorDevices = computed(() =>
	(allDevices.value || []).filter(
		(d) => (d as any)?.type_code === "sensor" || (d as any)?.typeCode === "sensor"
	)
)

const isEnvDeviceSelected = (deviceId: number) => (draft.envDeviceIds || []).includes(deviceId)

const deviceIdToModelIdMap = computed(() => {
	const map = new Map<number, number>()
	for (const d of allDevices.value || []) {
		const deviceId = Number((d as any)?.id)
		const modelId = Number((d as any)?.model_id ?? (d as any)?.modelId)
		if (!Number.isFinite(deviceId) || deviceId <= 0) continue
		if (!Number.isFinite(modelId) || modelId <= 0) continue
		map.set(deviceId, modelId)
	}
	return map
})

const getDeviceParameterDefinitions = (deviceId: number): SensorParameterDefinition[] => {
	const modelId = deviceIdToModelIdMap.value.get(deviceId) ?? null
	if (!modelId) return []
	return sensorModelParameterDefinitions.value.get(modelId) || []
}

const envAvailableParameters = computed(() => {
	const ids = draft.envDeviceIds || []
	if (ids.length === 0) return []
	const seen = new Set<string>()
	const out: SensorParameterDefinition[] = []
	for (const deviceId of ids) {
		const defs = getDeviceParameterDefinitions(deviceId)
		for (const d of defs) {
			if (!seen.has(d.type)) {
				seen.add(d.type)
				out.push(d)
			}
		}
	}
	return out
})

const fixedEnvSkeleton = computed(() => {
	const supported = new Set(envAvailableParameters.value.map((p) => String(p.type)))
	const isSupported = (key: string) => {
		if (key === "aqi" || key === "heatIndex") return true
		return supported.has(key)
	}

	const label = (key: string) => {
		if (key === "aqi") return "AQI"
		if (key === "illuminance") return "照度"
		if (key === "heatIndex") return "熱指數"
		if (key === "ph") return "酸鹼值"
		return getParameterDisplayName(key as any)
	}

	const unit = (key: string) => {
		if (key === "aqi") return ""
		if (key === "illuminance") return "lux"
		if (key === "heatIndex") return "°C"
		if (key === "ph") return ""
		if (key === "temperature") return "°C"
		if (key === "humidity") return "%"
		return ""
	}

	return FIXED_ENV_SKELETON_KEYS.map((key) => ({
		key,
		label: label(key),
		unit: unit(key),
		isSupported: isSupported(key),
	}))
})

const handleToggleEnvDevice = (deviceId: number) => {
	const next = [...(draft.envDeviceIds || [])]
	const idx = next.indexOf(deviceId)
	if (idx >= 0) next.splice(idx, 1)
	else next.push(deviceId)
	next.sort((a, b) => a - b)
	draft.envDeviceIds = next
}

const newId = (prefix: string) => `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}`

const isValidDateKey = (v: unknown): v is string => {
	if (typeof v !== "string") return false
	return /^\d{4}-\d{2}-\d{2}$/.test(v)
}
const isValidTimeKey = (v: unknown): v is string => {
	if (typeof v !== "string") return false
	if (!/^\d{2}:\d{2}$/.test(v)) return false
	const [hh, mm] = v.split(":").map((x) => Number(x))
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false
	if (hh < 0 || hh > 23) return false
	if (mm < 0 || mm > 59) return false
	return true
}
const toDateKeyOrEmpty = (v: unknown) => (isValidDateKey(v) ? v : "")
const toTimeKeyOrEmpty = (v: unknown) => (isValidTimeKey(v) ? v : "")

const swapInPlace = <T,>(arr: T[], i: number, j: number) => {
	if (i < 0 || j < 0) return
	if (i >= arr.length || j >= arr.length) return
	;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}

const handleReorderAnnouncement = (globalIndex: number, direction: "up" | "down") => {
	const list = draft.announcements || []
	const nextIndex = direction === "up" ? globalIndex - 1 : globalIndex + 1
	swapInPlace(list, globalIndex, nextIndex)
}

const handleReorderSchedule = (globalIndex: number, direction: "up" | "down") => {
	const list = draft.schedules || []
	const nextIndex = direction === "up" ? globalIndex - 1 : globalIndex + 1
	swapInPlace(list, globalIndex, nextIndex)
}

const validateDraft = (): { ok: true } | { ok: false; message: string } => {
	const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
		const n = Number(v)
		if (!Number.isFinite(n)) return fallback
		const i = Math.floor(n)
		if (i < min) return min
		if (i > max) return max
		return i
	}

	draft.wallAnnouncementsPerPage = clampInt(draft.wallAnnouncementsPerPage, 1, 20, 5)
	draft.wallSchedulesPerPage = clampInt(draft.wallSchedulesPerPage, 1, 20, 4)
	draft.wallAnnouncementsAutoPageIntervalMs = clampInt(
		draft.wallAnnouncementsAutoPageIntervalMs,
		1000,
		120000,
		10000
	)
	draft.wallSchedulesAutoPageIntervalMs = clampInt(
		draft.wallSchedulesAutoPageIntervalMs,
		1000,
		120000,
		10000
	)

	for (const [i, a] of (draft.announcements || []).entries()) {
		const startKey = (a as any)?.startDate
		const endKey = (a as any)?.endDate
		const start = toDateKeyOrEmpty(startKey)
		const end = toDateKeyOrEmpty(endKey)
		if (startKey && !start) return { ok: false, message: `公告第 ${i + 1} 筆開始日期格式不正確` }
		if (endKey && !end) return { ok: false, message: `公告第 ${i + 1} 筆結束日期格式不正確` }
		if (start && end && start > end)
			return { ok: false, message: `公告第 ${i + 1} 筆開始日期不可晚於結束日期` }
	}

	for (const [i, s] of (draft.schedules || []).entries()) {
		const start = toTimeKeyOrEmpty((s as any)?.startTime)
		const end = toTimeKeyOrEmpty((s as any)?.endTime)
		if (!start) return { ok: false, message: `排程第 ${i + 1} 筆開始時間格式不正確` }
		if (!end) return { ok: false, message: `排程第 ${i + 1} 筆結束時間格式不正確` }
		if (start >= end)
			return { ok: false, message: `排程第 ${i + 1} 筆開始時間不可晚於或等於結束時間` }
	}

	return { ok: true }
}

const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const confirmDeleteAction = ref<
	null | { type: "announcement"; index: number } | { type: "schedule"; index: number }
>(null)

const handleAddAnnouncement = () => {
	const next: MultimediaAnnouncement = {
		id: newId("a"),
		title: "",
		pinned: false,
		enabled: true,
		startDate: "",
		endDate: "",
	}
	draft.announcements.push(next)
}

const requestRemoveAnnouncement = (index: number) => {
	const item = draft.announcements[index]
	const preview = item?.title?.trim() || "（無內容）"
	confirmDeleteAction.value = { type: "announcement", index }
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此公告嗎？",
		details: `內容：${preview}`,
		type: "danger",
		confirmText: "刪除",
	})
}

const handleAddSchedule = () => {
	const next: MultimediaSchedule = {
		id: newId("s"),
		enabled: true,
		startTime: "09:00",
		endTime: "12:00",
		title: "",
	}
	draft.schedules.push(next)
}

const requestRemoveSchedule = (index: number) => {
	const item = draft.schedules[index]
	const preview = item?.title?.trim() || "（無內容）"
	confirmDeleteAction.value = { type: "schedule", index }
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此排程嗎？",
		details: `內容：${preview}`,
		type: "danger",
		confirmText: "刪除",
	})
}

const handleConfirmDelete = () => {
	const action = confirmDeleteAction.value
	if (!action) return
	if (action.type === "announcement") {
		draft.announcements.splice(action.index, 1)
	} else if (action.type === "schedule") {
		draft.schedules.splice(action.index, 1)
	}
	confirmDeleteAction.value = null
}

const handleUpload = async (file: File, onSuccess: (url: string) => void) => {
	if (!canUpdateSettings.value) {
		toast.warning(MSG_PERMISSION_LOCKED)
		return
	}
	try {
		const res = await api.uploadMedia(file)
		if (res?.file?.url) {
			onSuccess(res.file.url)
			toast.success(TOAST.MULTIMEDIA_UPLOAD_SUCCESS, 3000)
		}
	} catch (err) {
		handleError(err, "上傳失敗")
	}
}

const loadSensorDevices = async () => {
	try {
		isLoadingSensorDevices.value = true
		const res = await deviceApi.getDevices({ type_code: "sensor", limit: 200, offset: 0 })
		allDevices.value = res.devices || []

		const modelRes = await deviceApi.getDeviceModels({ type_code: "sensor" })
		const models = (modelRes.device_models || []) as DeviceModel[]
		const nextModelDefs = new Map<number, SensorParameterDefinition[]>()
		for (const m of models) {
			const id = Number((m as any)?.id)
			if (!Number.isFinite(id) || id <= 0) continue
			const cfg = (m as any)?.config
			const defs = cfg?.sensorParameters
			if (Array.isArray(defs) && defs.length) {
				nextModelDefs.set(id, defs as SensorParameterDefinition[])
			}
		}
		sensorModelParameterDefinitions.value = nextModelDefs
	} catch (err) {
		handleError(err, "載入感測器設備失敗")
	} finally {
		isLoadingSensorDevices.value = false
	}
}

const loadSettings = async () => {
	const res = await api.getSettings()
	Object.assign(draft, res.settings)
	draft.envDisplayParameters = [...FIXED_ENV_SKELETON_KEYS]
}

const handleSave = async () => {
	if (!canUpdateSettings.value) {
		toast.warning(MSG_PERMISSION_LOCKED)
		return
	}
	if (isSaving.value) return

	const validation = validateDraft()
	if (validation.ok === false) {
		toast.error(validation.message, 3500)
		return
	}

	isSaving.value = true
	try {
		draft.envDisplayParameters = [...FIXED_ENV_SKELETON_KEYS]
		const res = await api.updateSettings(draft)
		Object.assign(draft, res.settings)
		toast.success(TOAST.MULTIMEDIA_SAVED, 3000)
	} catch (err) {
		handleError(err, "儲存失敗")
	} finally {
		isSaving.value = false
	}
}

onMounted(async () => {
	await Promise.allSettled([loadSensorDevices(), loadSettings(), handleRefreshSeats()])
})
</script>
