import { useEnvironmentApi, type AggregatedBucket } from "~/composables/systems/environment/useEnvironmentApi"
import { getTimeRangeForTrend } from "~/utils/dateUtils"
import type { SensorParameterType, SensorReading } from "~/types/environment"

export type TrendGaugeType = SensorParameterType
export type TrendPeriod = "day" | "week" | "month" | "year"
export type TrendLoadStatus = "ok" | "no_data" | "error" | "loading"

const periodToBucket: Record<TrendPeriod, AggregatedBucket> = {
	day: "hour",
	week: "day",
	month: "day",
	year: "month",
}

const resolveTrendValue = (
	type: TrendGaugeType,
	data: Record<string, number | null | undefined> | undefined
): number | null => {
	if (!data) return null
	const value = data[type]
	return typeof value === "number" && Number.isFinite(value) ? value : null
}

const formatTrendLabel = (timestamp: string, period: TrendPeriod): string => {
	const d = new Date(timestamp)
	if (period === "day") return `${d.getUTCHours().toString().padStart(2, "0")}:00`
	if (period === "year") return `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}`
	return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

const readingsToChartPoints = (
	type: TrendGaugeType,
	readings: SensorReading[],
	period: TrendPeriod
): { labels: string[]; values: number[] } => {
	const labels: string[] = []
	const values: number[] = []
	for (const r of readings) {
		const value = resolveTrendValue(type, r.data as Record<string, number | null | undefined>)
		if (value !== null) {
			labels.push(formatTrendLabel(r.timestamp, period))
			values.push(Number(Number(value).toFixed(1)))
		}
	}
	return { labels, values }
}

export type TrendChartResult = {
	status: TrendLoadStatus
	labels: string[]
	values: number[]
	errorMessage: string | null
}

export const useEnvironmentTrendSeries = () => {
	const environmentApi = useEnvironmentApi()
	let requestSeq = 0

	const loadTrend = async (
		type: TrendGaugeType,
		locationId: string | number | null | undefined,
		period: TrendPeriod
	): Promise<TrendChartResult> => {
		const seq = ++requestSeq
		const locId = locationId != null && locationId !== "" ? String(locationId) : null
		if (!locId) {
			return { status: "no_data", labels: [], values: [], errorMessage: null }
		}

		const bucket = periodToBucket[period]
		const { start, end } = getTimeRangeForTrend(period)

		try {
			const { readings } = await environmentApi.getReadingsAggregated(locId, {
				bucket,
				startTime: start.toISOString(),
				endTime: end.toISOString(),
			})
			if (seq !== requestSeq) {
				return { status: "loading", labels: [], values: [], errorMessage: null }
			}

			const { labels, values } = readingsToChartPoints(type, readings ?? [], period)
			return {
				status: labels.length > 0 ? "ok" : "no_data",
				labels,
				values,
				errorMessage: null,
			}
		} catch (err: unknown) {
			if (seq !== requestSeq) {
				return { status: "loading", labels: [], values: [], errorMessage: null }
			}
			const message = err instanceof Error ? err.message : "載入資料失敗"
			return {
				status: "error",
				labels: [],
				values: [],
				errorMessage: message,
			}
		}
	}

	return { loadTrend }
}
