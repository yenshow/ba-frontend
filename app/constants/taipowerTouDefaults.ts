/**
 * 設定「還原台電預設／切換二三段式」用；計費以 GET/PUT /energy/settings 後端 normalize 為準。
 * 數字須與 ba-backend/src/constants/taipowerTouDefaults.js 一致。
 */
import type { EnergyElectricityTariff, EnergyTariffScheme, EnergyTouWindow } from "~/types/energy"

const WEEKDAYS = [1, 2, 3, 4, 5]

const wd = (start: string, end: string): EnergyTouWindow => ({
	dow: WEEKDAYS,
	start,
	end,
})

const THREE_STAGE: EnergyElectricityTariff = {
	currency: "TWD",
	scheme: "three_stage",
	summer_start: "06-01",
	summer_end: "09-30",
	excess_threshold_kwh: 2000,
	excess_surcharge_per_kwh: 1.04,
	peak: {
		summer_rate: 7.13,
		non_summer_rate: 0,
		summer_windows: [wd("16:00", "22:00")],
		non_summer_windows: [],
	},
	semi_peak: {
		summer_rate: 4.69,
		non_summer_rate: 4.48,
		summer_windows: [wd("09:00", "16:00"), wd("22:00", "24:00")],
		non_summer_windows: [wd("06:00", "11:00"), wd("14:00", "24:00")],
	},
	off_peak: {
		summer_rate: 2.06,
		non_summer_rate: 1.99,
		summer_windows: [],
		non_summer_windows: [],
	},
}

const TWO_STAGE: EnergyElectricityTariff = {
	currency: "TWD",
	scheme: "two_stage",
	summer_start: "06-01",
	summer_end: "09-30",
	excess_threshold_kwh: 2000,
	excess_surcharge_per_kwh: 1.04,
	peak: {
		summer_rate: 5.16,
		non_summer_rate: 4.93,
		summer_windows: [wd("09:00", "24:00")],
		non_summer_windows: [wd("06:00", "11:00"), wd("14:00", "24:00")],
	},
	semi_peak: {
		summer_rate: 0,
		non_summer_rate: 0,
		summer_windows: [],
		non_summer_windows: [],
	},
	off_peak: {
		summer_rate: 2.06,
		non_summer_rate: 1.99,
		summer_windows: [],
		non_summer_windows: [],
	},
}

export const buildTaipowerTariff = (scheme: EnergyTariffScheme): EnergyElectricityTariff =>
	structuredClone(scheme === "two_stage" ? TWO_STAGE : THREE_STAGE)

export const formatTouWindows = (windows: EnergyTouWindow[] | undefined) => {
	if (!windows?.length) return "—"
	return windows.map((w) => `${w.start}–${w.end}`).join("、")
}
