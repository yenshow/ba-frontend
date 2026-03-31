export type AQIBreakpoint = {
	concentrationRange: [number, number]
	indexRange: [number, number]
}

const PM25_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 12], indexRange: [0, 50] },
	{ concentrationRange: [12.1, 35.4], indexRange: [51, 100] },
	{ concentrationRange: [35.5, 55.4], indexRange: [101, 150] },
	{ concentrationRange: [55.5, 150.4], indexRange: [151, 200] },
	{ concentrationRange: [150.5, 250.4], indexRange: [201, 300] },
	{ concentrationRange: [250.5, 350.4], indexRange: [301, 400] },
	{ concentrationRange: [350.5, 500.4], indexRange: [401, 500] },
]

const PM10_BREAKPOINTS: AQIBreakpoint[] = [
	{ concentrationRange: [0, 54], indexRange: [0, 50] },
	{ concentrationRange: [55, 154], indexRange: [51, 100] },
	{ concentrationRange: [155, 254], indexRange: [101, 150] },
	{ concentrationRange: [255, 354], indexRange: [151, 200] },
	{ concentrationRange: [355, 424], indexRange: [201, 300] },
	{ concentrationRange: [425, 504], indexRange: [301, 400] },
	{ concentrationRange: [505, 604], indexRange: [401, 500] },
]

export const calculatePollutantAQI = (
	value: number | null,
	breakpoints: AQIBreakpoint[]
): number | null => {
	if (value === null) return null

	const targetBreakpoint =
		breakpoints.find((breakpoint) => {
			const [cLow, cHigh] = breakpoint.concentrationRange
			return value >= cLow && value <= cHigh
		}) ?? breakpoints[breakpoints.length - 1]

	const [cLow, cHigh] = targetBreakpoint.concentrationRange
	const [iLow, iHigh] = targetBreakpoint.indexRange

	const clampedValue = Math.min(Math.max(value, cLow), cHigh)
	const index = ((iHigh - iLow) / (cHigh - cLow)) * (clampedValue - cLow) + iLow

	return Math.round(index)
}

export type AqiReadingInput = {
	pm25: number | null
	pm10: number | null
}

export const calculateAqiScore = (data: AqiReadingInput): number | null => {
	const pollutantAQIs = [
		calculatePollutantAQI(data.pm25, PM25_BREAKPOINTS),
		calculatePollutantAQI(data.pm10, PM10_BREAKPOINTS),
	].filter((value): value is number => value !== null)

	if (!pollutantAQIs.length) return null
	return Math.max(...pollutantAQIs)
}

