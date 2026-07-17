export type EnvironmentParamKind = "sensor" | "derived"

export type EnvironmentParamCapabilities = {
	deviceModel: boolean
	locationToggle: boolean
	alertThreshold: boolean
}

export type EnvironmentParameterStatusBand = {
	max: number | null
	status: string
}

export type EnvironmentParameterLevelBand = {
	max: number | null
	level: number
}

export type EnvironmentParameterDefinition = {
	key: string
	kind: EnvironmentParamKind
	label: string
	unit: string
	fractionDigits: number
	gaugeMax: number | null
	icon?: string
	sortOrder: number
	capabilities: EnvironmentParamCapabilities
	display?: {
		statusBands?: EnvironmentParameterStatusBand[]
		levelBands?: EnvironmentParameterLevelBand[]
		levelUnitLabel?: string
	}
}

export type EnvironmentThresholdOperator = {
	op: string
	label: string
}

export type EnvironmentParametersResponse = {
	version: string
	sensorKeys: string[]
	derivedKeys: string[]
	parameters: EnvironmentParameterDefinition[]
	thresholdOperators: EnvironmentThresholdOperator[]
}
