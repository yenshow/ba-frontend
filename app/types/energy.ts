export type EnergySettingsConfig = {
	contract_capacity_kw: number
	demand_window_minutes: number
	demand_warning_enabled: boolean
	demand_warning_pct: number
	demand_alert_enabled: boolean
	meter_stale_enabled: boolean
	meter_stale_minutes: number
	reading_jump_enabled: boolean
	reading_jump_multiplier: number
	reading_jump_min_kwh: number
	usage_vs_avg_enabled: boolean
	usage_vs_avg_pct: number
	usage_vs_avg_days: number
	offpeak_low_enabled: boolean
	offpeak_low_pct: number
	offpeak_baseline_days: number
	meter_share_enabled: boolean
	meter_share_pct: number
	water_usage_vs_avg_enabled: boolean
	include_device_ids: number[]
	electricity_tariff: {
		currency: string
		peak: { rate: number; windows: Array<{ dow?: number | "all"; start: string; end: string }> }
		semi_peak: { rate: number; windows: Array<{ dow?: number | "all"; start: string; end: string }> }
		off_peak: { rate: number; windows: Array<{ dow?: number | "all"; start: string; end: string }> }
	}
	water_tariff: { rate: number }
	load_shed_stages: unknown[]
}

export type EnergySettingsResponse = {
	id: number
	config: EnergySettingsConfig
	updatedAt: string | null
}

export type EnergyDashboardSummary = {
	todayEnergyKwh: number
	todayWaterM3: number
	contractCapacityKw: number
	currentDemandKw: number
	currentPowerKw: number
	overContract: boolean
	demandAlertEnabled: boolean
	monthElectricityCost: {
		isReference: boolean
		currency: string
		amount: number
		peak_kwh?: number
		semi_peak_kwh?: number
		off_peak_kwh?: number
	}
	monthWaterCost: { isReference: boolean; currency: string; amount: number }
	includedDeviceCount: number
}

export type EnergyTrendPoint = {
	timestamp: string
	energyKwh: number
	waterM3: number
}

/** 電量使用分佈：用途系統維度 */
export type EnergySystemDistributionItem = {
	systemKey: string
	systemName: string
	energyKwh: number
	percent: number
	deviceCount: number
}

/** 用電排行：電表設備維度 */
export type EnergyMeterRankingItem = {
	deviceId: number
	deviceName: string
	energyKwh: number
	percent: number
}

export type EnergyBreakdownMeter = {
	deviceId: number
	deviceName: string
	systemKey: string
	systemName: string
	energyKwh: number
	percentOfTotal: number
	percentOfSystem: number
	activePowerKw: number | null
	location: string | null
	lastReadingAt: string | null
	included: boolean
}

export type EnergyBreakdownSystem = {
	systemKey: string
	systemName: string
	energyKwh: number
	percent: number
	deviceCount: number
	meters: EnergyBreakdownMeter[]
}

export type EnergyBreakdownResponse = {
	totalEnergyKwh: number
	systems: EnergyBreakdownSystem[]
}

export type EnergyReadingRow = {
	id: number
	deviceId: number
	deviceName?: string
	recordedAt: string
	data: Record<string, number>
}

/** 完整報表用量彙總列（GET /energy/usage/aggregated） */
export type EnergyUsageAggregatedRow = {
	deviceId: number
	bucketType: string
	timestamp: string
	deltaEnergyKwh: number | null
	deltaWaterM3: number | null
	touPeakKwh?: number | null
	touSemiPeakKwh?: number | null
	touOffPeakKwh?: number | null
	maxPowerKw?: number | null
	maxDemandKw?: number | null
}

export type EnergyNotificationItem = {
	id: number | string
	kind: "incident" | "insight"
	message: string
	severity: string
	created_at: string
	updated_at?: string
	source?: string
	source_id?: number
	dimension_key?: string
	alert_type?: string
	source_name?: string | null
}

/** 儀表板告警列表顯示用欄位 */
export type EnergyAlertDisplayItem = Pick<
	EnergyNotificationItem,
	"id" | "kind" | "message" | "severity" | "created_at"
>

export type EnergyNotificationsResponse = {
	incidents: EnergyNotificationItem[]
	insights: EnergyNotificationItem[]
	items: EnergyNotificationItem[]
	totalIncidents: number
	totalInsights: number
}
