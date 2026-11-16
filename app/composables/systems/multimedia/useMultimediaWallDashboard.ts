import { useMultimediaDashboardApi } from "~/composables/systems/multimedia/useMultimediaDashboardApi"
import type { MultimediaEnvReadingsSnapshot } from "~/types/multimedia"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { formatDateInput } from "~/utils/dateUtils"
import {
	getAqiDerivedStatusFromReading,
	getHeatIndexDerivedResultFromReading,
} from "~/utils/environmentDerivedMetrics"
import type { MonitoringUiStatus } from "~/utils/monitoringStatus"
import { FALLBACK_POLL_MS } from "~/utils/realtimeTiming"
import {
	ENV_METRIC_META,
	WALL_ENV_SNAPSHOT_STATE_KEY,
	WALL_GATE_ERROR_STATE_KEY,
	WALL_NOW_STATE_KEY,
	WALL_SETTINGS_STATE_KEY,
	clampWallInt,
	createDefaultWallSettings,
	createWallPager,
	isEnvironmentMetricKey,
	DEFAULT_ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS,
	DEFAULT_ANNOUNCEMENTS_PER_PAGE,
	DEFAULT_SCHEDULES_AUTO_PAGE_INTERVAL_MS,
	DEFAULT_SCHEDULES_PER_PAGE,
	normalizeEnvSnapshotResponse,
} from "~/composables/systems/multimedia/multimediaWallShared"

const VIDEO_EXTS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"])
const isValidDateKey = (v: unknown): v is string =>
	typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
const toDateKeyOrEmpty = (v: unknown) => (isValidDateKey(v) ? v : "")
const isDateInRange = (dateKey: string, startKey: string, endKey: string) =>
	!!dateKey && (!startKey || dateKey >= startKey) && (!endKey || dateKey <= endKey)
const getUrlExt = (url: string) => {
	const clean = url.split("?")[0].split("#")[0]
	const dot = clean.lastIndexOf(".")
	return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : ""
}

const gateMessageFromError = (err: unknown): string => {
	const e = err as { code?: string; message?: string; statusCode?: number }
	if (e?.code === "FEATURE_NOT_LICENSED") return "未授權多媒體功能"
	if (e?.code === "LICENSE_QUOTA_EXCEEDED") return "資訊牆授權額度已滿"
	return e?.message || "無法連線至後端"
}

/** 資訊牆：載入設定、環境快照 REST 輪詢、公告／班表輪播（免登入） */
export const useMultimediaWallDashboard = () => {
	const api = useMultimediaDashboardApi()
	const { resolveUrl } = useImageCenter()

	const settings = useState(WALL_SETTINGS_STATE_KEY, createDefaultWallSettings)
	const envSnapshot = useState<MultimediaEnvReadingsSnapshot | null>(
		WALL_ENV_SNAPSHOT_STATE_KEY,
		() => null,
	)
	const now = useState(WALL_NOW_STATE_KEY, () => new Date())
	const gateError = useState<string | null>(WALL_GATE_ERROR_STATE_KEY, () => null)

	const heroUrl = computed(() => resolveUrl(settings.value.heroImageUrl))
	const isHeroVideo = computed(() =>
		VIDEO_EXTS.has(getUrlExt(heroUrl.value || settings.value.heroImageUrl || "")),
	)

	const displayMetricKeys = computed(() =>
		(settings.value.envDisplayParameters || [])
			.map((k) => String(k || "").trim())
			.filter(isEnvironmentMetricKey),
	)

	const loadEnvSnapshot = async () => {
		if (!(settings.value.envDeviceIds || []).some((n) => Number.isFinite(n) && n > 0)) {
			envSnapshot.value = { timestamp: new Date().toISOString(), data: {}, devices: [] }
			return
		}
		try {
			const res = await api.getEnvReadingsSnapshot()
			const snapshot = normalizeEnvSnapshotResponse(res)
			if (snapshot) envSnapshot.value = snapshot
			gateError.value = null
		} catch (err) {
			gateError.value = gateMessageFromError(err)
		}
	}

	const announcementsPerPage = computed(() =>
		clampWallInt(
			settings.value.wallAnnouncementsPerPage,
			1,
			20,
			DEFAULT_ANNOUNCEMENTS_PER_PAGE,
		),
	)
	const schedulesPerPage = computed(() =>
		clampWallInt(settings.value.wallSchedulesPerPage, 1, 20, DEFAULT_SCHEDULES_PER_PAGE),
	)
	const announcementsAutoPageIntervalMs = computed(() =>
		clampWallInt(
			settings.value.wallAnnouncementsAutoPageIntervalMs,
			1000,
			120000,
			DEFAULT_ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS,
		),
	)
	const schedulesAutoPageIntervalMs = computed(() =>
		clampWallInt(
			settings.value.wallSchedulesAutoPageIntervalMs,
			1000,
			120000,
			DEFAULT_SCHEDULES_AUTO_PAGE_INTERVAL_MS,
		),
	)

	const sortedAnnouncements = computed(() => {
		const today = formatDateInput(new Date())
		return [...(settings.value.announcements || [])]
			.filter((a) => {
				if (a.enabled === false) return false
				const startKey = toDateKeyOrEmpty(a.startDate)
				const endKey = toDateKeyOrEmpty(a.endDate)
				return !startKey && !endKey ? true : isDateInRange(today, startKey, endKey)
			})
			.map((a, idx) => ({ a, idx }))
			.sort((x, y) => Number(y.a.pinned) - Number(x.a.pinned) || x.idx - y.idx)
			.map((x) => x.a)
	})

	const todaySchedules = computed(() =>
		(settings.value.schedules || []).filter((s) => s.enabled !== false),
	)

	const announcementPager = createWallPager(
		sortedAnnouncements,
		announcementsPerPage,
		announcementsAutoPageIntervalMs,
	)
	const schedulePager = createWallPager(
		todaySchedules,
		schedulesPerPage,
		schedulesAutoPageIntervalMs,
	)

	const toReadingNumber = (v: unknown): number | null => {
		const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN
		return Number.isFinite(n) ? n : null
	}

	const getReading = (key: string): number | null =>
		toReadingNumber(envSnapshot.value?.data?.[key])

	const aqiDerived = computed(() =>
		getAqiDerivedStatusFromReading({
			aqi: getReading("aqi"),
		}),
	)
	const heatIndexDerived = computed(() =>
		getHeatIndexDerivedResultFromReading({
			heatIndex: getReading("heatIndex"),
		}),
	)

	const getMetricStatus = (type: string, value: number | null): MonitoringUiStatus => {
		if (type === "aqi") return aqiDerived.value.status
		if (type === "heatIndex") return heatIndexDerived.value.status
		if (value === null) return "offline"
		return "normal"
	}

	const environmentMetrics = computed(() =>
		displayMetricKeys.value.map((key) => {
			const meta = ENV_METRIC_META[key]
			if (key === "aqi") {
				const value = aqiDerived.value.aqi ?? getReading("aqi")
				return { key, ...meta, value, status: getMetricStatus("aqi", value) }
			}
			if (key === "heatIndex") {
				return {
					key,
					...meta,
					value: heatIndexDerived.value.level || null,
					status: getMetricStatus("heatIndex", heatIndexDerived.value.valueC),
				}
			}
			const value = getReading(key)
			return { key, ...meta, value, status: getMetricStatus(key, value) }
		}),
	)

	let clockTimer: ReturnType<typeof setInterval> | null = null
	let pollTimer: ReturnType<typeof setInterval> | null = null

	onMounted(async () => {
		try {
			const res = await api.getSettings()
			Object.assign(settings.value, res.settings)
			gateError.value = null
		} catch (err) {
			gateError.value = gateMessageFromError(err)
		}

		await loadEnvSnapshot()

		clockTimer = setInterval(() => {
			now.value = new Date()
		}, 1000)

		pollTimer = setInterval(() => {
			void loadEnvSnapshot()
		}, FALLBACK_POLL_MS)

		announcementPager.start()
		schedulePager.start()
	})

	onBeforeUnmount(() => {
		announcementPager.stop()
		schedulePager.stop()
		if (clockTimer) {
			clearInterval(clockTimer)
			clockTimer = null
		}
		if (pollTimer) {
			clearInterval(pollTimer)
			pollTimer = null
		}
	})

	return {
		settings,
		heroUrl,
		isHeroVideo,
		gateError,
		pagedAnnouncements: announcementPager.pagedItems,
		announcementPageIndex: announcementPager.pageIndex,
		announcementTotalPages: announcementPager.totalPages,
		handleSetAnnouncementPage: announcementPager.handleSetPage,
		todaySchedules,
		pagedTodaySchedules: schedulePager.pagedItems,
		schedulePageIndex: schedulePager.pageIndex,
		scheduleTotalPages: schedulePager.totalPages,
		handleSetSchedulePage: schedulePager.handleSetPage,
		environmentMetrics,
	}
}
