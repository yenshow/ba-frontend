/**
 * TEMP：能源儀表板預覽假資料（確認 UI 後請刪除此檔，並還原 useEnergyDashboard／energy.vue 引用）
 * 開關：ENERGY_DASHBOARD_USE_MOCK = false 即可關閉
 */
import type {
	EnergyBreakdownResponse,
	EnergyDashboardSummary,
	EnergyMeterRankingItem,
	EnergySystemDistributionItem,
	EnergyTrendPoint,
} from "~/types/energy"

/** 設為 false 即改回打真實 API */
export const ENERGY_DASHBOARD_USE_MOCK = true

export type EnergyMockAlert = {
	id: number
	message: string
	severity: string
	created_at: string
}

export type EnergyMockTrendResult = {
	bucketType: string
	series: EnergyTrendPoint[]
	/** 日：昨日同時段比對；週／月／年暫無 */
	compareSeries: EnergyTrendPoint[] | null
	compareLabel: string | null
}

const startOfLocalDay = (offsetDays = 0) => {
	const d = new Date()
	d.setHours(0, 0, 0, 0)
	d.setDate(d.getDate() + offsetDays)
	return d
}

/** 固定 00:00～24:00（含 24 點）共 25 點；左→右為早→晚 */
const buildClockDaySeries = (
	dayOffset: number,
	energyFn: (h: number) => number,
	waterFn: (h: number) => number
): EnergyTrendPoint[] => {
	const base = startOfLocalDay(dayOffset)
	const series: EnergyTrendPoint[] = []
	for (let h = 0; h <= 24; h++) {
		const d = new Date(base)
		d.setHours(h === 24 ? 24 : h, 0, 0, 0)
		series.push({
			timestamp: d.toISOString(),
			energyKwh: energyFn(h),
			waterM3: waterFn(h),
		})
	}
	return series
}

const todayEnergyAt = (h: number) =>
	Math.round(120 + Math.sin(h / 3.2) * 55 + (h >= 8 && h <= 18 ? 70 : 8) + (h % 5) * 4)

const todayWaterAt = (h: number) =>
	Number(
		(2.4 + Math.cos(h / 4) * 1.2 + (h >= 7 && h <= 22 ? 1.5 : 0.2) + (h % 4) * 0.12).toFixed(2)
	)

const yesterdayEnergyAt = (h: number) => Math.round(todayEnergyAt(h) * 0.88 + Math.cos(h / 5) * 18)

const yesterdayWaterAt = (h: number) =>
	Number((todayWaterAt(h) * 0.9 + Math.sin(h / 6) * 0.35).toFixed(2))

/** 依 range 產生趨勢點（日含昨日比對；週＝近 7 日日彙總；月／年僅主系列） */
export const buildMockTrendSeries = (range: string): EnergyMockTrendResult => {
	if (range === "year") {
		const series: EnergyTrendPoint[] = []
		const now = new Date()
		for (let m = 0; m < 12; m++) {
			const d = new Date(now.getFullYear(), m, 1, 0, 0, 0, 0)
			series.push({
				timestamp: d.toISOString(),
				energyKwh: Math.round(18000 + Math.sin(m / 2) * 4000 + m * 200),
				waterM3: Math.round(320 + Math.cos(m / 3) * 40 + m * 3),
			})
		}
		return { bucketType: "month", series, compareSeries: null, compareLabel: null }
	}

	if (range === "month") {
		const series: EnergyTrendPoint[] = []
		const start = startOfLocalDay(-29)
		for (let day = 0; day < 30; day++) {
			const d = new Date(start)
			d.setDate(start.getDate() + day)
			series.push({
				timestamp: d.toISOString(),
				energyKwh: Math.round(380 + Math.sin(day / 3) * 80 + (day % 5) * 12),
				waterM3: Number((8 + Math.cos(day / 4) * 2 + (day % 3) * 0.4).toFixed(1)),
			})
		}
		return { bucketType: "day", series, compareSeries: null, compareLabel: null }
	}

	if (range === "week") {
		const series: EnergyTrendPoint[] = []
		const start = startOfLocalDay(-6)
		for (let day = 0; day < 7; day++) {
			const d = new Date(start)
			d.setDate(start.getDate() + day)
			series.push({
				timestamp: d.toISOString(),
				energyKwh: Math.round(4200 + Math.sin(day / 2) * 900 + (day % 3) * 250),
				waterM3: Number((85 + Math.cos(day / 2.5) * 22 + (day % 2) * 5).toFixed(1)),
			})
		}
		return { bucketType: "day", series, compareSeries: null, compareLabel: null }
	}

	// 日：今日 00–24 vs 昨日（小時粒度）
	const series = buildClockDaySeries(0, todayEnergyAt, todayWaterAt)
	const compareSeries = buildClockDaySeries(-1, yesterdayEnergyAt, yesterdayWaterAt)
	return {
		bucketType: "hour",
		series,
		compareSeries,
		compareLabel: "昨天",
	}
}

export const MOCK_ENERGY_SUMMARY: EnergyDashboardSummary = {
	todayEnergyKwh: 12540,
	todayWaterM3: 254,
	contractCapacityKw: 20000,
	currentDemandKw: 18420,
	currentPowerKw: 17650,
	overContract: false,
	demandAlertEnabled: true,
	monthElectricityCost: {
		isReference: true,
		currency: "TWD",
		amount: 1450,
		peak_kwh: 4200,
		semi_peak_kwh: 5100,
		off_peak_kwh: 3240,
	},
	monthWaterCost: {
		isReference: true,
		currency: "TWD",
		amount: 650,
	},
	includedDeviceCount: 5,
}

/** 分佈：共最多 6 項（5 具名 + 其他系統）；mock 以空調／照明／電梯 + 其他 示範 */
export const MOCK_ENERGY_DISTRIBUTION: {
	totalEnergyKwh: number
	items: EnergySystemDistributionItem[]
} = {
	totalEnergyKwh: 12540,
	items: [
		{ systemKey: "hvac", systemName: "空調", energyKwh: 5330, percent: 42.5, deviceCount: 2 },
		{ systemKey: "lighting", systemName: "照明", energyKwh: 3120, percent: 24.9, deviceCount: 1 },
		{ systemKey: "elevator", systemName: "電梯", energyKwh: 2660, percent: 21.2, deviceCount: 1 },
		{ systemKey: "other", systemName: "其他系統", energyKwh: 1430, percent: 11.4, deviceCount: 1 },
	],
}

export const MOCK_ENERGY_RANKING: EnergyMeterRankingItem[] = [
	{ deviceId: 101, deviceName: "B1 電表－空調主機", energyKwh: 4100, percent: 32.7 },
	{ deviceId: 102, deviceName: "1F 電表－照明幹線", energyKwh: 3120, percent: 24.9 },
	{ deviceId: 103, deviceName: "電梯幹線電表", energyKwh: 2660, percent: 21.2 },
	{ deviceId: 106, deviceName: "停車場電表", energyKwh: 1430, percent: 11.4 },
	{ deviceId: 105, deviceName: "B2 電表－空調冰水", energyKwh: 1230, percent: 9.8 },
]

export const MOCK_ENERGY_BREAKDOWN: EnergyBreakdownResponse = {
	totalEnergyKwh: 12540,
	systems: [
		{
			systemKey: "hvac",
			systemName: "空調",
			energyKwh: 5330,
			percent: 42.5,
			deviceCount: 2,
			meters: [
				{
					deviceId: 101,
					deviceName: "B1 電表－空調主機",
					systemKey: "hvac",
					systemName: "空調",
					energyKwh: 4100,
					percentOfTotal: 32.7,
					percentOfSystem: 76.9,
					activePowerKw: 820,
					location: "B1 機房",
					lastReadingAt: new Date(Date.now() - 45 * 1000).toISOString(),
					included: true,
				},
				{
					deviceId: 105,
					deviceName: "B2 電表－空調冰水",
					systemKey: "hvac",
					systemName: "空調",
					energyKwh: 1230,
					percentOfTotal: 9.8,
					percentOfSystem: 23.1,
					activePowerKw: 210,
					location: "B2 冰水主機",
					lastReadingAt: new Date(Date.now() - 90 * 1000).toISOString(),
					included: true,
				},
			],
		},
		{
			systemKey: "lighting",
			systemName: "照明",
			energyKwh: 3120,
			percent: 24.9,
			deviceCount: 1,
			meters: [
				{
					deviceId: 102,
					deviceName: "1F 電表－照明幹線",
					systemKey: "lighting",
					systemName: "照明",
					energyKwh: 3120,
					percentOfTotal: 24.9,
					percentOfSystem: 100,
					activePowerKw: 95,
					location: "1F 電氣室",
					lastReadingAt: new Date(Date.now() - 60 * 1000).toISOString(),
					included: true,
				},
			],
		},
		{
			systemKey: "elevator",
			systemName: "電梯",
			energyKwh: 2660,
			percent: 21.2,
			deviceCount: 1,
			meters: [
				{
					deviceId: 103,
					deviceName: "電梯幹線電表",
					systemKey: "elevator",
					systemName: "電梯",
					energyKwh: 2660,
					percentOfTotal: 21.2,
					percentOfSystem: 100,
					activePowerKw: 180,
					location: "B1 電梯機房",
					lastReadingAt: new Date(Date.now() - 40 * 1000).toISOString(),
					included: true,
				},
			],
		},
		{
			systemKey: "other",
			systemName: "其他系統",
			energyKwh: 1430,
			percent: 11.4,
			deviceCount: 1,
			meters: [
				{
					deviceId: 106,
					deviceName: "停車場電表",
					systemKey: "other",
					systemName: "其他系統",
					energyKwh: 1430,
					percentOfTotal: 11.4,
					percentOfSystem: 100,
					activePowerKw: 55,
					location: "B3 停車場",
					lastReadingAt: new Date(Date.now() - 120 * 1000).toISOString(),
					included: true,
				},
			],
		},
	],
}

export const MOCK_ENERGY_ALERTS: EnergyMockAlert[] = [
	{
		id: 9001,
		message: "即時功率／需量 18420.0 kW 接近契約容量 20000.0 kW（預警）",
		severity: "warning",
		created_at: new Date(Date.now() - 0.4 * 3600 * 1000).toISOString(),
	},
	{
		id: 9002,
		message: "B1 電表－空調主機：通訊逾時，最近 15 分鐘無讀數",
		severity: "critical",
		created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
	},
	{
		id: 9003,
		message: "本日累計用電已達本月平均值 92%",
		severity: "info",
		created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
	},
	{
		id: 9004,
		message: "電梯幹線電表：讀數跳動異常",
		severity: "warning",
		created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
	},
	{
		id: 9005,
		message: "停車場電表：離峰用量低於基準",
		severity: "info",
		created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
	},
]
