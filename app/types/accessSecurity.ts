/** 地點管理／表單用（id 與 UnifiedZone／ZoneManagementDialog 相同為字串） */
export type AccessSecurityLocation = {
	id?: string
	systemId?: string
	name: string
	/** 綁定的室內機（與 deviceId 同義，供 location factory） */
	indoorDeviceId?: number
	deviceId?: number
	createdAt?: string
	sortOrder?: number
}

export type AccessSecurityZone = {
	id?: string
	name: string
	locations: AccessSecurityLocation[]
	imageUrl?: string
	description?: string
	sortOrder?: number
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
}

export type AccessSecuritySiteZone = {
	id: number
	name: string
	locations: AccessSecuritySiteLocation[]
}

export type AccessSecurityMainStation = {
	deviceId: number
	name: string
	host: string | null
	port: number
	armed: boolean
	armingStatus: string
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
