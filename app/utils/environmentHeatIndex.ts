export type HeatIndexInput = {
	temperatureC: number | null
	humidityPercent: number | null
}

// Heat Index（NOAA Rothfusz regression）：
// - 公式原本以華氏為單位，這裡轉換 C↔F 後計算
// - 僅在條件接近「炎熱且潮濕」時較有意義，若資料不足回傳 null
const cToF = (c: number) => c * (9 / 5) + 32
const fToC = (f: number) => (f - 32) * (5 / 9)

export const calculateHeatIndexC = (input: HeatIndexInput): number | null => {
	const tC = input.temperatureC
	const rh = input.humidityPercent
	if (tC === null || rh === null) return null
	if (!Number.isFinite(tC) || !Number.isFinite(rh)) return null

	const tF = cToF(tC)
	if (tF < 80 || rh < 40) return tC

	const T = tF
	const R = rh

	// Rothfusz regression (°F)
	const hiF =
		-42.379 +
		2.04901523 * T +
		10.14333127 * R -
		0.22475541 * T * R -
		0.00683783 * T * T -
		0.05481717 * R * R +
		0.00122874 * T * T * R +
		0.00085282 * T * R * R -
		0.00000199 * T * T * R * R

	const hiC = fToC(hiF)
	return Number.isFinite(hiC) ? hiC : null
}
