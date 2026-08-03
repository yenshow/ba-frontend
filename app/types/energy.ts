export type EnergySettingsConfig = {
	contract_capacity_kw: number
	demand_window_minutes: number
	demand_alert_enabled: boolean
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

export type EnergyDistributionItem = {
	deviceId: number
	deviceName: string
	energyKwh: number
	percent: number
}

export type EnergyReadingRow = {
	id: number
	deviceId: number
	deviceName?: string
	recordedAt: string
	data: Record<string, number>
}
