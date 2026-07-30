import type {
	MultimediaDashboardSettings,
	MultimediaEnvDeviceStatus,
	MultimediaEnvReadingsSnapshot,
} from "~/types/multimedia"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { formatClockDisplay } from "~/utils/dateUtils"

export const WALL_SETTINGS_STATE_KEY = "multimedia-wall-settings"
export const WALL_ENV_SNAPSHOT_STATE_KEY = "multimedia-wall-env-snapshot"
export const WALL_NOW_STATE_KEY = "multimedia-wall-now"
export const WALL_ALERT_RULES_STATE_KEY = "multimedia-wall-alert-rules"
export const WALL_RULES_LOADED_STATE_KEY = "multimedia-wall-rules-loaded"

export const DEFAULT_ANNOUNCEMENTS_PER_PAGE = 5
export const DEFAULT_SCHEDULES_PER_PAGE = 4
export const DEFAULT_ANNOUNCEMENTS_AUTO_PAGE_INTERVAL_MS = 10_000
export const DEFAULT_SCHEDULES_AUTO_PAGE_INTERVAL_MS = 10_000

export const ENV_METRIC_META = {
	temperature: { label: "溫度", unit: "°C" },
	humidity: { label: "濕度", unit: "%" },
	aqi: { label: "AQI", unit: "" },
	illuminance: { label: "照度", unit: "LUX" },
	heatIndex: { label: "熱指數", unit: "級" },
	ph: { label: "酸鹼值", unit: "" },
} as const satisfies Record<string, { label: string; unit: string }>

export type EnvironmentMetricKey = keyof typeof ENV_METRIC_META

export const isEnvironmentMetricKey = (k: string): k is EnvironmentMetricKey =>
	Object.prototype.hasOwnProperty.call(ENV_METRIC_META, k)

export const normalizeEnvSnapshotResponse = (
	res: unknown
): MultimediaEnvReadingsSnapshot | null => {
	if (!res || typeof res !== "object") return null
	const r = res as Record<string, unknown>

	const wrapped = r.snapshot
	if (wrapped && typeof wrapped === "object") {
		return wrapped as MultimediaEnvReadingsSnapshot
	}

	if (!Array.isArray(r.devices) || !r.data || typeof r.data !== "object") return null

	const data = r.data as Record<string, unknown>
	if (Object.keys(data).length === 0) return null

	return {
		timestamp: typeof r.timestamp === "string" ? r.timestamp : new Date().toISOString(),
		data,
		devices: r.devices as MultimediaEnvDeviceStatus[],
	}
}

export const createDefaultWallSettings = (): MultimediaDashboardSettings => ({
	backgroundImageUrl: "",
	projectImageUrl: "",
	heroImageUrl: "",
	bannerMarqueeText: "",
	envDeviceIds: [],
	envDisplayParameters: [],
	announcements: [],
	schedules: [],
})

export const clampWallInt = (v: unknown, min: number, max: number, fallback: number) => {
	const n = Number(v)
	if (!Number.isFinite(n)) return fallback
	return Math.max(min, Math.min(max, Math.floor(n)))
}

/** layout 用：只讀共用狀態，不啟動輪詢／時鐘 */
export const useMultimediaWallShell = () => {
	const { resolveUrl } = useImageCenter()
	const settings = useState(WALL_SETTINGS_STATE_KEY, createDefaultWallSettings)
	const now = useState(WALL_NOW_STATE_KEY, () => new Date())

	const bgUrl = computed(() => resolveUrl(settings.value.backgroundImageUrl))
	const projectImageUrl = computed(() => resolveUrl(settings.value.projectImageUrl))
	const bannerText = computed(() => settings.value.bannerMarqueeText?.trim() || "")
	const formattedDate = computed(() => formatClockDisplay(now.value))

	return { settings, bgUrl, projectImageUrl, bannerText, formattedDate }
}

export const createWallPager = <T>(
	items: ComputedRef<T[]>,
	perPage: ComputedRef<number>,
	intervalMs: ComputedRef<number>
) => {
	const pageIndex = ref(0)
	const totalPages = computed(() => {
		const total = items.value.length
		return total > 0 ? Math.ceil(total / perPage.value) : 0
	})

	const clampPageIndex = () => {
		const total = totalPages.value
		pageIndex.value = total ? Math.max(0, Math.min(pageIndex.value, total - 1)) : 0
	}

	const handleSetPage = (idx: number) => {
		pageIndex.value = idx
		clampPageIndex()
	}

	watch(() => items.value.length, clampPageIndex, { immediate: true })

	const pagedItems = computed(() => {
		const start = pageIndex.value * perPage.value
		return items.value.slice(start, start + perPage.value)
	})

	let timer: ReturnType<typeof setInterval> | null = null
	const start = () => {
		if (timer) return
		timer = setInterval(() => {
			const total = totalPages.value
			if (total <= 1) return
			handleSetPage((pageIndex.value + 1) % total)
		}, intervalMs.value)
	}
	const stop = () => {
		if (!timer) return
		clearInterval(timer)
		timer = null
	}

	watch(intervalMs, () => {
		if (!timer) return
		stop()
		start()
	})

	return { pageIndex, totalPages, pagedItems, handleSetPage, start, stop }
}
