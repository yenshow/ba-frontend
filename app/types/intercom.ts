/** 地點管理／表單用（id 與 UnifiedZone／ZoneManagementDialog 相同為字串） */
export type IntercomLocation = {
	id?: string
	systemId?: string
	/** 戶號（不含樓層前綴；儲存時 adapter 會組成 `{floor}-{name}`） */
	name: string
	/** 樓層標籤（1F / 2F / B1） */
	floor?: string
	/** 綁定的室內機（與 deviceId 同義，供 location factory） */
	indoorDeviceId?: number
	deviceId?: number
	createdAt?: string
	sortOrder?: number
	/** 區域主機（選填；與 zone.manageDeviceId 同步；對講／廣播不經此欄） */
	manageDeviceId?: number
}

export type IntercomZone = {
	id?: string
	name: string
	locations: IntercomLocation[]
	imageUrl?: string
	description?: string
	sortOrder?: number
	/** 此區域主機（選填；video_intercom + unitType=manage） */
	manageDeviceId?: number
}

/** `/intercom/sites` 總覽列（voipNumber／host 不進本 API；SIP 直撥讀設備檔） */
export type IntercomSiteLocation = {
	id: number
	name: string
	systemId: number
	indoorDeviceId: number | null
	indoorDeviceName: string | null
	floor: string | null
	/** `{floor}-{name}`；無樓層時為 name */
	displayName: string
	/** 戶號（已剝離樓層前綴） */
	unitName: string
}

export type IntercomSiteZone = {
	id: number
	name: string
	locations: IntercomSiteLocation[]
	manageDeviceId: number | null
}

export type IntercomMainStation = {
	deviceId: number
	name: string
	host: string | null
	port: number
	armed: boolean
	armingStatus: string
}

/** POST /intercom/locations/:id/ring（前端只用 ok／result／played） */
export type IntercomInviteResult = {
	ok: boolean
	result: string
	played?: boolean
}

/** GET /intercom/zones/:id/logs/latest（監控頁對講事件；層 2） */
export type IntercomLog = {
	id: number
	created_at: string
	source: string
	event_kind: "intercom"
	location_id: number | null
	system_id: number | null
	device_id: number | null
	message: string
	location_name?: string | null
	device_name?: string | null
	zone_name?: string | null
	payload?: Record<string, unknown> | null
}
