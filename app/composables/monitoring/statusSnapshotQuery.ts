/** 快照 GET query：force 時帶 noCache 觸發後端 Modbus 重讀 */
export type StatusSnapshotQuery = {
	zoneIds?: string[]
	force?: boolean
}

export const buildStatusSnapshotQueryString = (query?: StatusSnapshotQuery): string => {
	const params = new URLSearchParams()
	if (query?.zoneIds?.length) {
		params.set("zoneIds", query.zoneIds.join(","))
	}
	if (query?.force) {
		params.set("noCache", "true")
	}
	const q = params.toString()
	return q ? `?${q}` : ""
}
