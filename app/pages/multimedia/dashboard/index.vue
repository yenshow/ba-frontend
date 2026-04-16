<template>
	<div class="relative overflow-hidden rounded-2xl border-2 border-white/80 bg-white/30">
		<!-- Background -->
		<div class="absolute inset-0">
			<img
				v-if="settings.backgroundImageUrl"
				:src="bgUrl"
				alt="背景"
				class="h-full w-full object-cover"
			/>
			<div class="absolute inset-0 bg-black/35 backdrop-blur-[1px]"></div>
		</div>

		<div class="relative flex flex-col gap-6 2xl:gap-8">
			<!-- Header -->
			<section class="pt-6 2xl:pt-10 grid grid-cols-3 items-center">
				<div class="col-span-1 flex items-center justify-center">
					<img src="/layout/yenshow-logo.svg" alt="YENSHOW" class="h-16 object-contain 2xl:h-20" />
				</div>

				<div class="col-span-1 flex items-center justify-center">
					<img
						v-if="settings.projectImageUrl"
						:src="projectImageUrl"
						alt="專案圖片"
						class="h-28 object-contain 2xl:h-32"
					/>
				</div>

				<ClientOnly>
					<div class="col-span-1 flex flex-col items-center justify-center text-white">
						<div class="ms-[12px] text-[28px] font-semibold tracking-[12px] 2xl:text-[36px]">
							{{ formattedDate.date }}
						</div>
						<div class="ms-[4px] text-[18px] tracking-[4px] 2xl:text-[24px]">
							{{ formattedDate.weekday }} {{ formattedDate.period }} {{ formattedDate.time }}
						</div>
					</div>
					<template #fallback>
						<div class="col-span-1 flex flex-col items-center justify-center text-white">
							<div class="ms-[12px] text-[28px] font-semibold tracking-[12px] 2xl:text-[36px]">
								--
							</div>
							<div class="ms-[4px] text-[18px] tracking-[4px] 2xl:text-[24px]">--</div>
						</div>
					</template>
				</ClientOnly>
			</section>

			<NuxtLink
				v-if="isOperator"
				to="/multimedia/dashboard/admin"
				class="absolute top-4 right-4 whitespace-nowrap rounded-2xl border-2 border-white/30 bg-transparent px-4 py-2 text-lg font-semibold text-white transition-all hover:bg-white/10 2xl:text-2xl"
				aria-label="前往資訊牆管理"
			>
				管理
			</NuxtLink>

			<!-- Main -->
			<section class="grid grid-cols-12 gap-6 2xl:gap-8 px-6 2xl:px-10">
				<!-- Announcements -->
				<div
					class="relative col-span-7 rounded-2xl border-2 border-white/80 bg-white/30 p-4 text-white"
				>
					<div class="flex items-center justify-center border-b-2 border-white/50 pb-4">
						<h2 class="text-4xl font-semibold tracking-[8px]">社區公告</h2>
					</div>

					<div class="space-y-3 py-3">
						<div
							v-for="a in pagedAnnouncements"
							:key="a.id"
							class="flex gap-3 border-b-2 border-white/30 pb-3"
						>
							<div class="min-w-0 px-4">
								<div class="flex items-center gap-2 text-2xl font-semibold text-white">
									<img
										v-if="a.pinned"
										src="/multiMedia/ping.png"
										alt="置頂"
										class="h-6 w-6 flex-shrink-0 object-contain"
									/>
									<span class="min-w-0 truncate">{{ a.title || "（未命名公告）" }}</span>
								</div>
								<div class="whitespace-pre-line text-base text-white/80">
									{{ a.content }}
								</div>
							</div>
						</div>

						<div v-if="pagedAnnouncements.length === 0" class="py-16 text-center text-white/70">
							<div class="text-2xl font-semibold">目前沒有公告</div>
						</div>

						<div
							v-if="announcementTotalPages > 1"
							class="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 pt-2"
							aria-label="社區公告分頁"
						>
							<button
								v-for="idx in announcementTotalPages"
								:key="idx"
								type="button"
								class="h-2.5 w-2.5 rounded-full transition-all"
								:class="{
									'bg-white/80': announcementPageIndex === idx - 1,
									'bg-white/30 hover:bg-white/50': announcementPageIndex !== idx - 1,
								}"
								:aria-label="`切換公告頁：第 ${idx} 頁`"
								@click="handleSetAnnouncementPage(idx - 1)"
								@keydown.enter.prevent="handleSetAnnouncementPage(idx - 1)"
								@keydown.space.prevent="handleSetAnnouncementPage(idx - 1)"
							/>
						</div>
					</div>
				</div>

				<!-- Hero Image -->
				<div class="col-span-5 overflow-hidden rounded-2xl border-2 border-white/80">
					<img
						v-if="settings.heroImageUrl"
						:src="heroUrl"
						alt="右側圖片"
						class="min-h-[400px] h-full aspect-[16/9] object-cover"
					/>
					<div v-else class="flex min-h-[400px] items-center justify-center text-white/70">
						尚未設定圖片
					</div>
				</div>
			</section>

			<!-- Bottom -->
			<section class="grid grid-cols-12 gap-6 2xl:gap-8 px-6 2xl:px-10">
				<!-- Environment -->
				<div class="col-span-8 rounded-2xl border-2 border-white/80 bg-white/30 text-white px-4">
					<div class="flex items-center h-full">
						<div class="flex items-center justify-center">
							<div
								class="[writing-mode:vertical-rl] text-2xl font-semibold mt-[12px] tracking-[12px] text-white border-r-2 border-white/80 pr-4"
							>
								社區環境
							</div>
						</div>

						<div class="min-w-0 flex-1 px-4">
							<div class="grid grid-cols-6 gap-4">
								<EnvironmentMetricCard
									v-for="m in environmentMetrics"
									:key="m.key"
									:label="m.label"
									:unit="m.unit"
									:value="m.value"
									:status="m.status"
								/>
							</div>
						</div>
					</div>
				</div>

				<!-- Schedule -->
				<div class="col-span-4 rounded-2xl border-2 border-white/80 bg-white/30 p-4 text-white">
					<h2 class="text-center ms-[12px] text-2xl font-semibold tracking-[12px]">今日社區排程</h2>
					<div class="mt-2 space-y-3">
						<div
							v-for="s in todaySchedules"
							:key="s.id"
							class="rounded-xl border border-white/15 bg-black/15 px-4 py-3"
						>
							<div class="text-lg font-semibold">{{ s.startTime }}-{{ s.endTime }}</div>
							<div class="mt-1 text-base text-white/80">{{ s.title }}</div>
						</div>
						<div v-if="todaySchedules.length === 0" class="py-10 text-center text-white/70">
							今日無排程
						</div>
					</div>
				</div>
			</section>

			<!-- Banner -->
			<footer class="flex items-center bg-black/80 p-4 gap-4">
				<img src="/multiMedia/banner.png" alt="Banner" class="px-4 h-12 w-auto object-contain" />
				<div
					v-if="bannerText"
					class="flex items-center justify-center text-center text-3xl font-semibold tracking-[4px] text-white 2xl:text-5xl"
				>
					{{ bannerText }}
				</div>
			</footer>
		</div>
	</div>
</template>

<script setup lang="ts">
import { usePolling } from "~/composables/monitoring/usePolling"
import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import { useEnvironmentSensors } from "~/composables/systems/environment/useEnvironmentSensors"
import { useAuth } from "~/composables/core/useAuth"
import { useAlertRules } from "~/composables/monitoring/useAlertRules"
import EnvironmentMetricCard from "~/components/multimedia/EnvironmentMetricCard.vue"
import type { MultimediaDashboardSettings } from "~/types/multimedia"
import { calculateAqiScore } from "~/utils/environmentAqi"
import { calculateHeatIndexC } from "~/utils/environmentHeatIndex"
import { resolveUploadUrl } from "~/utils/apiUtils"
import { formatClockDisplay, formatDateInput } from "~/utils/dateUtils"
import type { EnvironmentLocation, EnvironmentZone } from "~/types/environment"
import type { AlertRule } from "~/types/alert"

definePageMeta({ layout: "default" })

const api = useMultimediaDashboardApi()
const { isOperator } = useAuth()
const { apiBase } = useRuntimeConfig().public as { apiBase: string }

const settings = reactive<MultimediaDashboardSettings>({
	backgroundImageUrl: "",
	projectImageUrl: "",
	heroImageUrl: "",
	bannerMarqueeText: "",
	envDeviceIds: [],
	envDisplayParameters: [],
	announcements: [],
	schedules: [],
})

const bgUrl = computed(() => resolveUploadUrl(settings.backgroundImageUrl, apiBase))
const projectImageUrl = computed(() => resolveUploadUrl(settings.projectImageUrl, apiBase))
const heroUrl = computed(() => resolveUploadUrl(settings.heroImageUrl, apiBase))

// --- 即時讀值：沿用 construction-monitoring/environment.vue 的流程（useEnvironmentSensors） ---
// 使用 synthetic location 讀值，無須載入 zone/location 清單
const environmentZones = ref<EnvironmentZone[]>([])
const selectedLocationId = computed(() => {
	const ids = settings.envDeviceIds || []
	return ids.length ? `multimedia:${ids.join(",")}` : ""
})

const getLocationId = (location: EnvironmentLocation) => String(location.id ?? "")

const currentLocationData = computed<EnvironmentLocation | null>(() => {
	const deviceIds = (settings.envDeviceIds || []).filter((n) => Number.isFinite(n) && n > 0)
	if (deviceIds.length === 0) return null

	// 固定骨架讀值：溫度 / 濕度 / AQI(pm25/pm10) / 照度 / 熱指數(temperature+humidity) / 酸鹼值
	// 這裡只需要確保 useEnvironmentSensors 會去讀取必要參數
	const enabledTypes = new Set(["temperature", "humidity", "pm25", "pm10", "illuminance", "ph"])
	const parameters = [...enabledTypes].map((t) => ({ type: t as any, enabled: true }))

	return {
		id: "multimedia",
		name: "多媒體資訊牆",
		deviceIds,
		parameters,
	} as any
})

const { sensorData, loadSensorData } = useEnvironmentSensors({
	environmentZones,
	selectedLocationId: computed(() => selectedLocationId.value),
	currentLocationData,
	getLocationId,
})

// --- 警報規則：用於顯示異常/警報狀態（與 construction-monitoring/environment.vue 一致） ---
const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules()
const alertRules = ref<AlertRule[]>([])
const rulesLoaded = ref(false)

const now = ref(new Date())
const formattedDate = computed(() => formatClockDisplay(now.value))

let clockTimer: ReturnType<typeof setInterval> | null = null

const bannerText = computed(
	() => settings.bannerMarqueeText || "管理室社區物業管理服務時間：每日 08:00～20:00，歡迎洽詢"
)

const sortedAnnouncements = computed(() => {
	const list = [...(settings.announcements || [])]
	return list.sort(
		(a, b) => Number(b.pinned) - Number(a.pinned) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
	)
})

const ANNOUNCEMENTS_PER_PAGE = 5
const announcementPageIndex = ref(0)

const announcementTotalPages = computed(() => {
	const total = sortedAnnouncements.value.length
	return total > 0 ? Math.ceil(total / ANNOUNCEMENTS_PER_PAGE) : 0
})

const handleSetAnnouncementPage = (idx: number) => {
	const total = announcementTotalPages.value
	if (!total) {
		announcementPageIndex.value = 0
		return
	}
	announcementPageIndex.value = Math.max(0, Math.min(idx, total - 1))
}

watch(
	() => sortedAnnouncements.value.length,
	() => {
		handleSetAnnouncementPage(announcementPageIndex.value)
	},
	{ immediate: true }
)

const pagedAnnouncements = computed(() => {
	const start = announcementPageIndex.value * ANNOUNCEMENTS_PER_PAGE
	return sortedAnnouncements.value.slice(start, start + ANNOUNCEMENTS_PER_PAGE)
})

const todayKey = computed(() => {
	return formatDateInput(new Date())
})

const todaySchedules = computed(() => {
	const list = (settings.schedules || []).filter((s) => s.date === todayKey.value)
	return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

const getReading = (key: string): number | null => {
	const v = (sensorData as any)[key]
	return typeof v === "number" && Number.isFinite(v) ? v : null
}

const aqiValue = computed(() => {
	const pm25 = getReading("pm25")
	const pm10 = getReading("pm10")
	const score = calculateAqiScore({ pm25, pm10 })
	return typeof score === "number" && Number.isFinite(score) ? score : null
})

const heatIndexValue = computed(() => {
	const temperature = getReading("temperature")
	const humidity = getReading("humidity")
	const v = calculateHeatIndexC({ temperatureC: temperature, humidityPercent: humidity })
	return typeof v === "number" && Number.isFinite(v) ? v : null
})

const DISPLAY_LABELS: Record<string, { label: string; unit: string }> = {
	temperature: { label: "溫度", unit: "°C" },
	humidity: { label: "濕度", unit: "%" },
	aqi: { label: "AQI", unit: "" },
	illuminance: { label: "照度", unit: "lux" },
	heatIndex: { label: "熱指數", unit: "°C" },
	ph: { label: "酸鹼值", unit: "" },
	co2: { label: "CO₂", unit: "ppm" },
	pm25: { label: "PM2.5", unit: "µg/m³" },
	pm10: { label: "PM10", unit: "µg/m³" },
	noise: { label: "噪音", unit: "dB" },
	wind: { label: "風速", unit: "m/s" },
	tvoc: { label: "TVOC", unit: "ppm" },
	hcho: { label: "HCHO", unit: "ppm" },
}

const getDefaultStatusText = (type: string, value: number | null): "正常" | "注意" | "警報" => {
	if (value === null) return "正常"

	switch (type) {
		case "pm25":
			if (value <= 25) return "正常"
			if (value <= 50) return "注意"
			return "警報"
		case "pm10":
			if (value <= 50) return "正常"
			if (value <= 100) return "注意"
			return "警報"
		case "co2":
			if (value <= 1000) return "正常"
			if (value <= 2000) return "注意"
			return "警報"
		case "temperature":
			if (value >= 20 && value <= 26) return "正常"
			if ((value >= 18 && value < 20) || (value > 26 && value <= 28)) return "注意"
			return "警報"
		case "heatIndex":
			if (value <= 27) return "正常"
			if (value <= 32) return "注意"
			return "警報"
		case "humidity":
			if (value >= 30 && value <= 60) return "正常"
			if ((value >= 20 && value < 30) || (value > 60 && value <= 70)) return "注意"
			return "警報"
		case "noise":
			if (value <= 55) return "正常"
			if (value <= 70) return "注意"
			return "警報"
		default:
			return "正常"
	}
}

const getMetricStatus = (
	type: string,
	value: number | null
): "normal" | "offline" | "abnormal" | "alarm" => {
	if (value === null) return "offline"
	if (type === "aqi") return "normal"

	if (rulesLoaded.value && alertRules.value.length > 0) {
		const s = getStatusTextFromRules(type, value, alertRules.value)
		if (s === "警報") return "alarm"
		if (s === "注意") return "abnormal"
		return "normal"
	}

	const fallback = getDefaultStatusText(type, value)
	if (fallback === "警報") return "alarm"
	if (fallback === "注意") return "abnormal"
	return "normal"
}

const environmentMetrics = computed(() => {
	// 固定骨架順序：溫度 / 濕度 / AQI / 照度 / 熱指數 / 酸鹼值
	const keys = ["temperature", "humidity", "aqi", "illuminance", "heatIndex", "ph"] as const

	return keys.map((key) => {
		if (key === "aqi") {
			return {
				key,
				...DISPLAY_LABELS.aqi,
				value: aqiValue.value,
				status: getMetricStatus("aqi", aqiValue.value),
			}
		}
		if (key === "heatIndex") {
			return {
				key,
				...DISPLAY_LABELS.heatIndex,
				value: heatIndexValue.value,
				status: getMetricStatus("heatIndex", heatIndexValue.value),
			}
		}
		const meta = DISPLAY_LABELS[key] || { label: key, unit: "" }
		const value = getReading(key)
		return { key, ...meta, value, status: getMetricStatus(key, value) }
	})
})

const loadSettings = async () => {
	const res = await api.getSettings()
	Object.assign(settings, res.settings)
}

const loadAlertRules = async () => {
	const rules = await getRules("environment", "threshold")
	alertRules.value = rules as AlertRule[]
	rulesLoaded.value = true
}

const { start: startPolling, stop: stopPolling } = usePolling({
	callback: async () => {
		await loadSensorData()
	},
	interval: 30000,
	immediate: true,
})

onMounted(async () => {
	await loadAlertRules()
	await loadSettings()
	startPolling()
	clockTimer = setInterval(() => {
		now.value = new Date()
	}, 1000)
})

onBeforeUnmount(() => {
	stopPolling()
	if (clockTimer) clearInterval(clockTimer)
	clockTimer = null
})
</script>

<style scoped></style>
