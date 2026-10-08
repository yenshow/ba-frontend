import type { EnergyTrendPoint } from "~/types/energy"

/** 背景刷新時比對趨勢點是否實質相同，避免無謂換 reference 觸發圖表 watch */
export const sameEnergyTrendSeries = (a: EnergyTrendPoint[], b: EnergyTrendPoint[]) =>
	a.length === b.length &&
	a.every(
		(p, i) =>
			p.timestamp === b[i]?.timestamp &&
			p.energyKwh === b[i]?.energyKwh &&
			p.waterM3 === b[i]?.waterM3
	)
