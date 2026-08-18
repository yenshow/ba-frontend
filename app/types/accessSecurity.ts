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

/** `/access-security/sites` 總覽列 */
export type AccessSecuritySiteLocation = {
	id: number
	name: string
	systemId: number
	indoorDeviceId: number | null
	indoorDeviceName: string | null
	voipNumber: string | null
	host: string | null
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

export type AccessSecurityFloorGroup = {
	floor: string
	locations: AccessSecuritySiteLocation[]
}

/** POST /access-security/locations/:id/ring */
export type AccessSecurityInviteResult = {
	ok: boolean
	result: string
	statusCode: number | null
	mode?: "ring" | "broadcast"
	played?: boolean
	playDurationMs?: number
	playError?: string | null
}
