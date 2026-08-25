/** 地點管理／表單用（id 與 UnifiedZone／ZoneManagementDialog 相同為字串） */
export type AccessSecurityLocation = {
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
	/** 區域綁定的管理中心主機（與 zone.manageDeviceId 同步寫入 system_config） */
	manageDeviceId?: number
}

export type AccessSecurityZone = {
	id?: string
	name: string
	locations: AccessSecurityLocation[]
	imageUrl?: string
	description?: string
	sortOrder?: number
	/** 此區域綁定的管理中心主機（video_intercom + unitType=manage） */
	manageDeviceId?: number
}

/** `/access-security/sites` 總覽列（voipNumber／host 不進本 API；SIP 直撥讀設備檔） */
export type AccessSecuritySiteLocation = {
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

export type AccessSecuritySiteZone = {
	id: number
	name: string
	locations: AccessSecuritySiteLocation[]
	manageDeviceId: number | null
}

export type AccessSecurityMainStation = {
	deviceId: number
	name: string
	host: string | null
	port: number
	armed: boolean
	armingStatus: string
}

/** POST /access-security/locations/:id/ring（前端只用 ok／result／played） */
export type AccessSecurityInviteResult = {
	ok: boolean
	result: string
	played?: boolean
}

/** GET /access-security/zones/:id/logs/latest（監控頁對講事件；層 2） */
export type AccessSecurityIntercomLog = {
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
