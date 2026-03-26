export type ZoneUiKeyable = { id?: string | null; name?: string | null }

/**
 * UI 層用的 zone key（優先 DB id，其次 name）
 * 注意：不要在 getter 內臨時生成隨機 temp id，避免 key 不穩定造成 UI 狀態飄移。
 */
export const getZoneUiKey = (zone: ZoneUiKeyable | null | undefined): string => {
	if (!zone) return ""
	if (zone.id != null && String(zone.id).trim() !== "") return String(zone.id)
	if (zone.name != null && String(zone.name).trim() !== "") return String(zone.name)
	return ""
}

