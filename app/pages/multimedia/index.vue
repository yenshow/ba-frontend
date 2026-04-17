<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl 2xl:text-4xl font-semibold tracking-[8px] text-white">資訊牆管理</h1>
			<div class="flex items-center gap-3">
				<NuxtLink
					to="/multimedia/dashboard"
					target="_blank"
					rel="noopener noreferrer"
					class="rounded-xl bg-white/10 px-4 py-2 text-base text-white hover:bg-white/20 2xl:px-6 2xl:py-3 2xl:text-lg"
					aria-label="前往資訊看板"
				>
					資訊看板
				</NuxtLink>
				<button
					type="button"
					class="rounded-xl bg-purple-500/80 px-4 py-2 text-base text-white hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-purple-500/40 2xl:px-6 2xl:py-3 2xl:text-lg"
					:disabled="isSaving"
					@click="handleSave"
				>
					{{ isSaving ? "儲存中..." : "儲存" }}
				</button>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				class="whitespace-nowrap rounded-2xl border-2 px-4 py-2 text-base text-white transition-all 2xl:text-lg"
				:class="
					activeTab === 'basic'
						? 'border-white bg-white/10 hover:bg-white/15'
						: 'border-white/30 bg-transparent hover:bg-white/10'
				"
				@click="activeTab = 'basic'"
			>
				基本設定
			</button>
			<button
				type="button"
				class="whitespace-nowrap rounded-2xl border-2 px-4 py-2 text-base text-white transition-all 2xl:text-lg"
				:class="
					activeTab === 'content'
						? 'border-white bg-white/10 hover:bg-white/15'
						: 'border-white/30 bg-transparent hover:bg-white/10'
				"
				@click="activeTab = 'content'"
			>
				公告 / 排程
			</button>
		</div>

		<div v-show="activeTab === 'basic'" class="grid grid-cols-12 gap-6">
			<!-- 圖片 -->
			<div class="col-span-7 space-y-6">
				<section class="rounded-2xl border-2 border-white/80 bg-white/30 p-5 text-white">
					<h2 class="text-2xl font-semibold tracking-[4px]">圖片設定</h2>

					<div class="mt-4 grid grid-cols-3 gap-4">
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
							label="多媒體影音"
							:value="draft.heroImageUrl"
							accept="image/*,video/*"
							@upload="(f) => handleUpload(f, (url) => (draft.heroImageUrl = url))"
						/>
					</div>
				</section>

				<section class="rounded-2xl border-2 border-white/80 bg-white/30 p-5 text-white">
					<h2 class="text-2xl font-semibold tracking-[4px]">佈告文案</h2>
					<div class="mt-4">
						<textarea
							v-model="draft.bannerMarqueeText"
							rows="3"
							class="form-input-small w-full"
							placeholder="Banner 文字"
						/>
					</div>
				</section>
			</div>

			<!-- Right -->
			<div class="col-span-5">
				<section class="rounded-2xl border-2 border-white/80 bg-white/30 p-5 text-white min-h-[560px]">
					<h2 class="text-2xl font-semibold tracking-[4px]">環境資料來源</h2>

					<div class="mt-4">
						<div class="mb-2 text-lg font-semibold text-white/80">感測器設備</div>
						<div v-if="isLoadingSensorDevices" class="py-4 text-center text-base text-white/60">載入中...</div>
						<div v-else-if="sensorDevices.length === 0" class="py-4 text-center text-base text-amber-300">
							尚無可用感測器，請先在「設備管理」中建立感測器設備
						</div>
						<div v-else class="grid grid-cols-2 gap-2">
							<label
								v-for="device in sensorDevices"
								:key="device.id"
								class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
								:class="{ 'border-cyan-400/50 bg-cyan-500/20': isEnvDeviceSelected(device.id) }"
							>
								<input
									type="checkbox"
									:checked="isEnvDeviceSelected(device.id)"
									@change="handleToggleEnvDevice(device.id)"
									class="h-4 w-4 cursor-pointer accent-cyan-400"
									:aria-label="`勾選感測器：${device.name}`"
								/>
								<span class="text-base text-white">{{ device.name }}</span>
							</label>
						</div>
						<p class="mt-4 text-sm text-white/50">可勾選多台設備，資訊牆數值將由所選設備提供</p>
					</div>

					<div class="mt-5 border-t border-white/50 pt-4">
						<div class="mb-4 text-lg font-semibold text-white/80">環境骨架（固定順序）</div>

						<div class="grid grid-cols-2 gap-2">
							<div
								v-for="item in fixedEnvSkeleton"
								:key="item.key"
								class="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2"
							>
								<span
									class="h-2.5 w-2.5 rounded-full"
									:class="item.isSupported ? 'bg-emerald-400' : 'bg-white/25'"
									:title="item.isSupported ? '設備已支援' : '設備未支援 / 無資料'"
								/>
								<span class="text-base text-white">{{ item.label }}</span>
								<span class="ml-auto text-sm text-white/50">{{ item.unit }}</span>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>

		<div v-show="activeTab === 'content'" class="grid grid-cols-12 gap-6">
			<div class="col-span-7 space-y-6">
				<section class="min-h-[420px] rounded-2xl border-2 border-white/80 bg-white/30 p-5 text-white">
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
									<label class="flex items-center gap-2 text-sm text-white/80">
										<input v-model="a.pinned" type="checkbox" class="h-4 w-4" />
										置頂
									</label>
									<span class="text-xs text-white/50">排序：{{ a.sortOrder }}</span>
								</div>
								<button
									type="button"
									class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-2 text-sm font-light text-white transition-all hover:bg-white/10"
									@click="handleRemoveAnnouncement(announcementOffset + idx)"
								>
									刪除
								</button>
							</div>

							<div class="mt-3 grid grid-cols-2 gap-3">
								<label class="block">
									<div class="mb-1 text-sm text-white/80">標題</div>
									<input
										v-model="a.title"
										type="text"
										class="form-input-small w-full"
										placeholder="例如：設備施工公告"
									/>
								</label>
								<label class="block">
									<div class="mb-1 text-sm text-white/80">顯示排序（數字小先）</div>
									<input v-model.number="a.sortOrder" type="number" class="form-input-small w-full" />
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
				<section class="min-h-[420px] rounded-2xl border-2 border-white/80 bg-white/30 p-5 text-white">
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
								<span class="text-xs text-white/50">排序：{{ s.sortOrder }}</span>
								<button
									type="button"
									class="whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-3 py-2 text-sm font-light text-white transition-all hover:bg-white/10"
									@click="handleRemoveSchedule(scheduleOffset + idx)"
								>
									刪除
								</button>
							</div>

							<div class="mt-3 grid grid-cols-2 gap-3">
								<label class="block">
									<div class="mb-1 text-sm text-white/80">日期</div>
									<input v-model="s.date" type="date" class="form-input-small w-full" />
								</label>
								<label class="block">
									<div class="mb-1 text-sm text-white/80">顯示排序（數字小先）</div>
									<input v-model.number="s.sortOrder" type="number" class="form-input-small w-full" />
								</label>
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
									placeholder="例如：社區園藝維護"
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
	</div>
</template>

<script setup lang="ts">
import { useAuth } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import Pagination from "~/components/common/Pagination.vue"
import ImageField from "~/components/multimedia/ImageField.vue"
import { getParameterDisplayName } from "~/utils/sensorUtils"
import type { Device, DeviceModel, SensorParameterDefinition } from "~/types/device"
import type { MultimediaAnnouncement, MultimediaDashboardSettings, MultimediaSchedule } from "~/types/multimedia"

definePageMeta({ layout: "default" })

const { isOperator } = useAuth()
const toast = useToast()
const { handleError } = useErrorHandler()
const api = useMultimediaDashboardApi()
const deviceApi = useDeviceApi()

const isSaving = ref(false)
const activeTab = ref<"basic" | "content">("basic")

const FIXED_ENV_SKELETON_KEYS = ["temperature", "humidity", "aqi", "illuminance", "heatIndex", "ph"] as const

const draft = reactive<MultimediaDashboardSettings>({
	backgroundImageUrl: "",
	projectImageUrl: "",
	heroImageUrl: "",
	bannerMarqueeText: "",
	envDeviceIds: [],
	envDisplayParameters: [],
	announcements: [],
	schedules: [],
})

const ITEMS_PER_PAGE = 5
const announcementOffset = ref(0)
const scheduleOffset = ref(0)

const pagedAnnouncements = computed(() =>
	(draft.announcements || []).slice(announcementOffset.value, announcementOffset.value + ITEMS_PER_PAGE)
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

const handleAddAnnouncement = () => {
	const next: MultimediaAnnouncement = {
		id: newId("a"),
		title: "",
		pinned: false,
		sortOrder: draft.announcements.length,
	}
	draft.announcements.push(next)
}

const handleRemoveAnnouncement = (index: number) => {
	draft.announcements.splice(index, 1)
}

const handleAddSchedule = () => {
	const today = new Date()
	const yyyy = today.getFullYear()
	const mm = String(today.getMonth() + 1).padStart(2, "0")
	const dd = String(today.getDate()).padStart(2, "0")
	const next: MultimediaSchedule = {
		id: newId("s"),
		date: `${yyyy}-${mm}-${dd}`,
		startTime: "09:00",
		endTime: "12:00",
		title: "",
		sortOrder: draft.schedules.length,
	}
	draft.schedules.push(next)
}

const handleRemoveSchedule = (index: number) => {
	draft.schedules.splice(index, 1)
}

const handleUpload = async (file: File, onSuccess: (url: string) => void) => {
	try {
		const res = await api.uploadMedia(file)
		if (res?.file?.url) {
			onSuccess(res.file.url)
			toast.success("上傳成功", 3000)
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
	if (!isOperator.value) {
		toast.warning("權限不足")
		return
	}
	if (isSaving.value) return

	isSaving.value = true
	try {
		draft.envDisplayParameters = [...FIXED_ENV_SKELETON_KEYS]
		const res = await api.updateSettings(draft)
		Object.assign(draft, res.settings)
		toast.success("已儲存", 3000)
	} catch (err) {
		handleError(err, "儲存失敗")
	} finally {
		isSaving.value = false
	}
}

onMounted(async () => {
	await Promise.allSettled([loadSensorDevices(), loadSettings()])
})
</script>

