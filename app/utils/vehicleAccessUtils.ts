/**
 * 車輛進出共用工具（車牌正規化、在場列凸顯）
 */

import type { VehicleDataLog } from "~/types/vehicleAccess";
import { getOnSitePassageLogIds, normalizePlate } from "~/utils/vehicleAccessPassageStats";

export { normalizePlate };

/** 在場車輛最後一筆進場 log id（transition 策略） */
export const getEntryOnlyLogIds = (logs: VehicleDataLog[]): Set<number> =>
	getOnSitePassageLogIds(logs);
