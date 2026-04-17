import { usePolling } from "~/composables/monitoring/usePolling"
import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import { useEnvironmentSensors } from "~/composables/systems/environment/useEnvironmentSensors"
import { useAlertRules } from "~/composables/monitoring/useAlertRules"
import type { MultimediaDashboardSettings } from "~/types/multimedia"
import { resolveUploadUrl } from "~/utils/apiUtils"
import { formatClockDisplay, formatDateInput } from "~/utils/dateUtils"
import type { EnvironmentLocation, EnvironmentZone } from "~/types/environment"
import type { AlertRule } from "~/types/alert"
import {
	getAqiDerivedStatus,
	getHeatIndexDerivedResult,
	type DerivedMetricStatus,
} from "~/utils/environmentDerivedMetrics"
import {
	normalizeMonitoringStatusText,
	monitoringStatusTextToUiStatus,
	type MonitoringUiStatus,
} from "~/utils/monitoringStatus"

const ANNOUNCEMENTS_PER_PAGE = 5
const SCHEDULES_PER_PAGE = 4

const DEFAULT_BANNER = "管理室社區物業管理服務時間：每日 08:00～20:00，歡迎洽詢"

const ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS = 10000
const SCHEDULES_AUTO_PAGE_INTERVAL_MS = 10000

const METRIC_KEYS = ["temperature", "humidity", "aqi", "illuminance", "heatIndex", "ph"] as const

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])
const getUrlExt = (url: string) => {
	if (!url) return ""
	const clean = url.split("?")[0].split("#")[0]
	const parts = clean.split(".")
	if (parts.length < 2) return ""
	return String(parts[parts.length - 1]).toLowerCase()
}

const DISPLAY_LABELS: Record<(typeof METRIC_KEYS)[number], { label: string; unit: string }> = {
	temperature: { label: "溫度", unit: "°C" },
	humidity: { label: "濕度", unit: "%" },
	aqi: { label: "AQI", unit: "" },
	illuminance: { label: "照度", unit: "LUX" },
	heatIndex: { label: "熱指數", unit: "級" },
	ph: { label: "酸鹼值", unit: "" },
}

export const useMultimediaWallDashboard = () => {
	const api = useMultimediaDashboardApi()
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
	const isHeroVideo = computed(() =>
		VIDEO_EXTS.has(getUrlExt(heroUrl.value || settings.heroImageUrl || ""))
	)

	const environmentZones = ref<EnvironmentZone[]>([])
	const selectedLocationId = computed(() => {
		const ids = settings.envDeviceIds || []
		return ids.length ? `multimedia:${ids.join(",")}` : ""
	})
	const getLocationId = (location: EnvironmentLocation) => String(location.id ?? "")

	const currentLocationData = computed<EnvironmentLocation | null>(() => {
		const deviceIds = (settings.envDeviceIds || []).filter((n) => Number.isFinite(n) && n > 0)
		if (deviceIds.length === 0) return null
		const enabledTypes = new Set(["temperature", "humidity", "pm25", "pm10", "illuminance", "ph"])
		const parameters = [...enabledTypes].map((t) => ({ type: t as any, enabled: true }))
		return { id: "multimedia", name: "多媒體資訊牆", deviceIds, parameters } as any
	})

	const { sensorData, loadSensorData } = useEnvironmentSensors({
		environmentZones,
		selectedLocationId: computed(() => selectedLocationId.value),
		currentLocationData,
		getLocationId,
	})

	const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules()
	const alertRules = ref<AlertRule[]>([])
	const rulesLoaded = ref(false)

	const now = ref(new Date())
	const formattedDate = computed(() => formatClockDisplay(now.value))
	let clockTimer: ReturnType<typeof setInterval> | null = null

	const bannerText = computed(() => settings.bannerMarqueeText?.trim() || DEFAULT_BANNER)

	const sortedAnnouncements = computed(() => {
		const list = [...(settings.announcements || [])]
		return list.sort(
			(a, b) => Number(b.pinned) - Number(a.pinned) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
		)
	})

	const announcementPageIndex = ref(0)
	const announcementTotalPages = computed(() => {
		const total = sortedAnnouncements.value.length
		return total > 0 ? Math.ceil(total / ANNOUNCEMENTS_PER_PAGE) : 0
	})

	const clampAnnouncementPageIndex = () => {
		const total = announcementTotalPages.value
		if (!total) {
			announcementPageIndex.value = 0
			return
		}
		announcementPageIndex.value = Math.max(0, Math.min(announcementPageIndex.value, total - 1))
	}

	const handleSetAnnouncementPage = (idx: number) => {
		announcementPageIndex.value = idx
		clampAnnouncementPageIndex()
	}

	watch(() => sortedAnnouncements.value.length, clampAnnouncementPageIndex, { immediate: true })

	const pagedAnnouncements = computed(() => {
		const start = announcementPageIndex.value * ANNOUNCEMENTS_PER_PAGE
		return sortedAnnouncements.value.slice(start, start + ANNOUNCEMENTS_PER_PAGE)
	})

	let announcementAutoPager: ReturnType<typeof setInterval> | null = null
	const startAnnouncementAutoPager = () => {
		if (announcementAutoPager) return
		announcementAutoPager = setInterval(() => {
			const total = announcementTotalPages.value
			if (total <= 1) return
			handleSetAnnouncementPage((announcementPageIndex.value + 1) % total)
		}, ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS)
	}
	const stopAnnouncementAutoPager = () => {
		if (!announcementAutoPager) return
		clearInterval(announcementAutoPager)
		announcementAutoPager = null
	}

	const todayKey = computed(() => formatDateInput(new Date()))
	const todaySchedules = computed(() => {
		const list = (settings.schedules || []).filter((s) => s.date === todayKey.value)
		return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	})

	const schedulePageIndex = ref(0)
	const scheduleTotalPages = computed(() => {
		const total = todaySchedules.value.length
		return total > 0 ? Math.ceil(total / SCHEDULES_PER_PAGE) : 0
	})

	const clampSchedulePageIndex = () => {
		const total = scheduleTotalPages.value
		if (!total) {
			schedulePageIndex.value = 0
			return
		}
		schedulePageIndex.value = Math.max(0, Math.min(schedulePageIndex.value, total - 1))
	}

	const handleSetSchedulePage = (idx: number) => {
		schedulePageIndex.value = idx
		clampSchedulePageIndex()
	}

	watch(() => todaySchedules.value.length, clampSchedulePageIndex, { immediate: true })

	const pagedTodaySchedules = computed(() => {
		const start = schedulePageIndex.value * SCHEDULES_PER_PAGE
		return todaySchedules.value.slice(start, start + SCHEDULES_PER_PAGE)
	})

	let scheduleAutoPager: ReturnType<typeof setInterval> | null = null
	const startScheduleAutoPager = () => {
		if (scheduleAutoPager) return
		scheduleAutoPager = setInterval(() => {
			const total = scheduleTotalPages.value
			if (total <= 1) return
			handleSetSchedulePage((schedulePageIndex.value + 1) % total)
		}, SCHEDULES_AUTO_PAGE_INTERVAL_MS)
	}
	const stopScheduleAutoPager = () => {
		if (!scheduleAutoPager) return
		clearInterval(scheduleAutoPager)
		scheduleAutoPager = null
	}

	const getReading = (key: string): number | null => {
		const v = (sensorData as any)[key]
		return typeof v === "number" && Number.isFinite(v) ? v : null
	}

	const aqiDerived = computed(() => getAqiDerivedStatus(getReading("pm25"), getReading("pm10")))
	const heatIndexDerived = computed(() =>
		getHeatIndexDerivedResult(getReading("temperature"), getReading("humidity"))
	)

	const derivedStatusToUiStatus = (s: DerivedMetricStatus): MonitoringUiStatus => {
		if (s === "offline") return "offline"
		if (s === "alarm") return "alarm"
		if (s === "abnormal") return "abnormal"
		return "normal"
	}

	const getMetricStatus = (type: string, value: number | null): MonitoringUiStatus => {
		// 計算型指標：不走警報規則，避免重複告警（由基礎指標 pm25/pm10/temperature/humidity 等負責）
		if (type === "aqi") return derivedStatusToUiStatus(aqiDerived.value.status)
		if (type === "heatIndex") return derivedStatusToUiStatus(heatIndexDerived.value.status)

		if (value === null) return "offline"
		if (rulesLoaded.value) {
			const raw = getStatusTextFromRules(type, value, alertRules.value)
			const normalized = normalizeMonitoringStatusText(raw)
			return monitoringStatusTextToUiStatus(normalized)
		}
		// 規則尚未載入時，不推測門檻；避免與「警報設定」不一致
		return "normal"
	}

	const environmentMetrics = computed(() =>
		METRIC_KEYS.map((key) => {
			if (key === "aqi") {
				return {
					key,
					...DISPLAY_LABELS.aqi,
					value: aqiDerived.value.aqi,
					status: getMetricStatus("aqi", aqiDerived.value.aqi),
				}
			}
			if (key === "heatIndex") {
				return {
					key,
					...DISPLAY_LABELS.heatIndex,
					value: heatIndexDerived.value.level ? heatIndexDerived.value.level : null,
					status: getMetricStatus("heatIndex", heatIndexDerived.value.valueC),
				}
			}
			const meta = DISPLAY_LABELS[key]
			const value = getReading(key)
			return { key, ...meta, value, status: getMetricStatus(key, value) }
		})
	)

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
		startAnnouncementAutoPager()
		startScheduleAutoPager()
		clockTimer = setInterval(() => {
			now.value = new Date()
		}, 1000)
	})

	onBeforeUnmount(() => {
		stopPolling()
		stopAnnouncementAutoPager()
		stopScheduleAutoPager()
		if (clockTimer) clearInterval(clockTimer)
		clockTimer = null
	})

	return {
		settings,
		bgUrl,
		projectImageUrl,
		heroUrl,
		isHeroVideo,
		formattedDate,
		bannerText,
		sortedAnnouncements,
		pagedAnnouncements,
		announcementPageIndex,
		announcementTotalPages,
		announcementsPerPage: ANNOUNCEMENTS_PER_PAGE,
		handleSetAnnouncementPage,
		todaySchedules,
		pagedTodaySchedules,
		schedulePageIndex,
		scheduleTotalPages,
		schedulesPerPage: SCHEDULES_PER_PAGE,
		handleSetSchedulePage,
		environmentMetrics,
	}
}
