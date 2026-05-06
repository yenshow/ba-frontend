import { usePolling } from "~/composables/monitoring/usePolling"
import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import { useAlertRules } from "~/composables/monitoring/useAlertRules"
import type { MultimediaDashboardSettings, MultimediaEnvReadingsSnapshot } from "~/types/multimedia"
import { resolveUploadUrl } from "~/utils/apiUtils"
import { formatClockDisplay, formatDateInput } from "~/utils/dateUtils"
import type { AlertRule } from "~/types/alert"
import { getAqiDerivedStatus, getHeatIndexDerivedResult } from "~/utils/environmentDerivedMetrics"
import {
	normalizeMonitoringStatusText,
	monitoringStatusTextToUiStatus,
	type MonitoringUiStatus,
} from "~/utils/monitoringStatus"

const DEFAULT_ANNOUNCEMENTS_PER_PAGE = 5
const DEFAULT_SCHEDULES_PER_PAGE = 4
const DEFAULT_ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS = 10000
const DEFAULT_SCHEDULES_AUTO_PAGE_INTERVAL_MS = 10000

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])
const isValidDateKey = (v: unknown): v is string => {
	if (typeof v !== "string") return false
	return /^\d{4}-\d{2}-\d{2}$/.test(v)
}
const toDateKeyOrEmpty = (v: unknown) => (isValidDateKey(v) ? v : "")
const isDateInRange = (dateKey: string, startKey: string, endKey: string) => {
	if (!dateKey) return false
	if (startKey && dateKey < startKey) return false
	if (endKey && dateKey > endKey) return false
	return true
}
const getUrlExt = (url: string) => {
	if (!url) return ""
	const clean = url.split("?")[0].split("#")[0]
	const parts = clean.split(".")
	if (parts.length < 2) return ""
	return String(parts[parts.length - 1]).toLowerCase()
}

type EnvironmentMetricKey = "temperature" | "humidity" | "aqi" | "illuminance" | "heatIndex" | "ph"

const isEnvironmentMetricKey = (k: string): k is EnvironmentMetricKey => {
	return (
		k === "temperature" ||
		k === "humidity" ||
		k === "aqi" ||
		k === "illuminance" ||
		k === "heatIndex" ||
		k === "ph"
	)
}

const getEnvironmentMetricMeta = (key: EnvironmentMetricKey): { label: string; unit: string } => {
	if (key === "temperature") return { label: "溫度", unit: "°C" }
	if (key === "humidity") return { label: "濕度", unit: "%" }
	if (key === "aqi") return { label: "AQI", unit: "" }
	if (key === "illuminance") return { label: "照度", unit: "LUX" }
	if (key === "heatIndex") return { label: "熱指數", unit: "級" }
	return { label: "酸鹼值", unit: "" }
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

	const displayMetricKeys = computed<EnvironmentMetricKey[]>(() => {
		const configured = (settings.envDisplayParameters || [])
			.map((k) => String(k || "").trim())
			.filter(Boolean)
			.filter(isEnvironmentMetricKey)
		return configured
	})

	const enabledSensorTypes = computed(() => {
		const next = new Set<string>()
		for (const key of displayMetricKeys.value) {
			if (key === "aqi") {
				next.add("pm25")
				next.add("pm10")
				continue
			}
			if (key === "heatIndex") {
				next.add("temperature")
				next.add("humidity")
				continue
			}
			next.add(key)
		}
		return next
	})

	const envSnapshot = ref<MultimediaEnvReadingsSnapshot | null>(null)

	const loadEnvSnapshot = async () => {
		const ids = (settings.envDeviceIds || []).filter((n) => Number.isFinite(n) && n > 0)
		if (ids.length === 0) {
			envSnapshot.value = { timestamp: new Date().toISOString(), data: {}, devices: [] }
			return
		}
		const res = await api.getEnvReadingsSnapshot()
		envSnapshot.value = res.snapshot || null
	}

	const { getRules, getStatusText: getStatusTextFromRules } = useAlertRules()
	const alertRules = ref<AlertRule[]>([])
	const rulesLoaded = ref(false)

	const now = ref(new Date())
	const formattedDate = computed(() => formatClockDisplay(now.value))
	let clockTimer: ReturnType<typeof setInterval> | null = null

	const bannerText = computed(() => settings.bannerMarqueeText?.trim() || "")

	const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
		const n = Number(v)
		if (!Number.isFinite(n)) return fallback
		const i = Math.floor(n)
		if (i < min) return min
		if (i > max) return max
		return i
	}

	const announcementsPerPage = computed(() =>
		clampInt((settings as any)?.wallAnnouncementsPerPage, 1, 20, DEFAULT_ANNOUNCEMENTS_PER_PAGE)
	)
	const schedulesPerPage = computed(() =>
		clampInt((settings as any)?.wallSchedulesPerPage, 1, 20, DEFAULT_SCHEDULES_PER_PAGE)
	)
	const announcementsAutoPageIntervalMs = computed(() =>
		clampInt(
			(settings as any)?.wallAnnouncementsAutoPageIntervalMs,
			1000,
			120000,
			DEFAULT_ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS
		)
	)
	const schedulesAutoPageIntervalMs = computed(() =>
		clampInt(
			(settings as any)?.wallSchedulesAutoPageIntervalMs,
			1000,
			120000,
			DEFAULT_SCHEDULES_AUTO_PAGE_INTERVAL_MS
		)
	)

	const sortedAnnouncements = computed(() => {
		const today = formatDateInput(new Date())
		const list = [...(settings.announcements || [])].filter((a) => {
			if ((a as any)?.enabled === false) return false
			const startKey = toDateKeyOrEmpty((a as any)?.startDate)
			const endKey = toDateKeyOrEmpty((a as any)?.endDate)
			if (!startKey && !endKey) return true
			return isDateInRange(today, startKey, endKey)
		})
		return list
			.map((a, idx) => ({ a, idx }))
			.sort((x, y) => Number((y.a as any)?.pinned) - Number((x.a as any)?.pinned) || x.idx - y.idx)
			.map((x) => x.a)
	})

	const announcementPageIndex = ref(0)
	const announcementTotalPages = computed(() => {
		const total = sortedAnnouncements.value.length
		const perPage = announcementsPerPage.value
		return total > 0 ? Math.ceil(total / perPage) : 0
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
		const perPage = announcementsPerPage.value
		const start = announcementPageIndex.value * perPage
		return sortedAnnouncements.value.slice(start, start + perPage)
	})

	let announcementAutoPager: ReturnType<typeof setInterval> | null = null
	const startAnnouncementAutoPager = () => {
		if (announcementAutoPager) return
		announcementAutoPager = setInterval(() => {
			const total = announcementTotalPages.value
			if (total <= 1) return
			handleSetAnnouncementPage((announcementPageIndex.value + 1) % total)
		}, announcementsAutoPageIntervalMs.value)
	}
	const stopAnnouncementAutoPager = () => {
		if (!announcementAutoPager) return
		clearInterval(announcementAutoPager)
		announcementAutoPager = null
	}

	watch(
		() => announcementsAutoPageIntervalMs.value,
		() => {
			stopAnnouncementAutoPager()
			startAnnouncementAutoPager()
		}
	)

	const todaySchedules = computed(() => {
		return (settings.schedules || []).filter((s) => (s as any)?.enabled !== false)
	})

	const schedulePageIndex = ref(0)
	const scheduleTotalPages = computed(() => {
		const total = todaySchedules.value.length
		const perPage = schedulesPerPage.value
		return total > 0 ? Math.ceil(total / perPage) : 0
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
		const perPage = schedulesPerPage.value
		const start = schedulePageIndex.value * perPage
		return todaySchedules.value.slice(start, start + perPage)
	})

	let scheduleAutoPager: ReturnType<typeof setInterval> | null = null
	const startScheduleAutoPager = () => {
		if (scheduleAutoPager) return
		scheduleAutoPager = setInterval(() => {
			const total = scheduleTotalPages.value
			if (total <= 1) return
			handleSetSchedulePage((schedulePageIndex.value + 1) % total)
		}, schedulesAutoPageIntervalMs.value)
	}
	const stopScheduleAutoPager = () => {
		if (!scheduleAutoPager) return
		clearInterval(scheduleAutoPager)
		scheduleAutoPager = null
	}

	watch(
		() => schedulesAutoPageIntervalMs.value,
		() => {
			stopScheduleAutoPager()
			startScheduleAutoPager()
		}
	)

	const getReading = (key: string): number | null => {
		const v = (envSnapshot.value?.data || ({} as any))[key]
		return typeof v === "number" && Number.isFinite(v) ? v : null
	}

	const aqiDerived = computed(() => getAqiDerivedStatus(getReading("pm25"), getReading("pm10")))
	const heatIndexDerived = computed(() =>
		getHeatIndexDerivedResult(getReading("temperature"), getReading("humidity"))
	)

	const getMetricStatus = (type: string, value: number | null): MonitoringUiStatus => {
		// 計算型指標：不走警報規則，避免重複告警（由基礎指標 pm25/pm10/temperature/humidity 等負責）
		if (type === "aqi") return aqiDerived.value.status
		if (type === "heatIndex") return heatIndexDerived.value.status

		if (value === null) return "offline"
		if (rulesLoaded.value) {
			const raw = getStatusTextFromRules(type, value, alertRules.value)
			const normalized = normalizeMonitoringStatusText(raw)
			return monitoringStatusTextToUiStatus(normalized)
		}
		// 規則尚未載入時，不推測門檻；避免與「警報設定」不一致
		return "normal"
	}

	const environmentMetrics = computed(() => {
		return displayMetricKeys.value.map((key) => {
			const meta = getEnvironmentMetricMeta(key)
			if (key === "aqi") {
				return {
					key,
					...meta,
					value: aqiDerived.value.aqi,
					status: getMetricStatus("aqi", aqiDerived.value.aqi),
				}
			}
			if (key === "heatIndex") {
				return {
					key,
					...meta,
					value: heatIndexDerived.value.level ? heatIndexDerived.value.level : null,
					status: getMetricStatus("heatIndex", heatIndexDerived.value.valueC),
				}
			}
			const value = getReading(key)
			return { key, ...meta, value, status: getMetricStatus(key, value) }
		})
	})

	const isLoadingSettings = ref(false)
	const isLoadingAlertRules = ref(false)

	const loadSettings = async () => {
		isLoadingSettings.value = true
		try {
			const res = await api.getSettings()
			Object.assign(settings, res.settings)
		} finally {
			isLoadingSettings.value = false
		}
	}

	const loadAlertRules = async () => {
		isLoadingAlertRules.value = true
		try {
			const rules = await getRules("environment", "threshold")
			alertRules.value = rules as AlertRule[]
			rulesLoaded.value = true
		} finally {
			isLoadingAlertRules.value = false
		}
	}

	const { start: startPolling, stop: stopPolling } = usePolling({
		callback: async () => {
			await loadEnvSnapshot()
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
		announcementsPerPage,
		handleSetAnnouncementPage,
		todaySchedules,
		pagedTodaySchedules,
		schedulePageIndex,
		scheduleTotalPages,
		schedulesPerPage,
		handleSetSchedulePage,
		environmentMetrics,
		displayMetricKeys,
		isLoadingSettings,
		isLoadingAlertRules,
	}
}
