export type MultimediaAnnouncement = {
	id: string
	title: string
	pinned: boolean
	enabled: boolean
	startDate?: string // YYYY-MM-DD
	endDate?: string // YYYY-MM-DD
}

export type MultimediaSchedule = {
	id: string
	enabled: boolean
	startTime: string // HH:mm
	endTime: string // HH:mm
	title: string
}

export type MultimediaDashboardSettings = {
	backgroundImageUrl: string
	projectImageUrl: string
	heroImageUrl: string
	bannerMarqueeText: string
	envDeviceIds: number[]
	envDisplayParameters: string[]
	wallAnnouncementsPerPage?: number
	wallSchedulesPerPage?: number
	wallAnnouncementsAutoPageIntervalMs?: number
	wallSchedulesAutoPageIntervalMs?: number
	announcements: MultimediaAnnouncement[]
	schedules: MultimediaSchedule[]
}

export type MultimediaEnvironmentSnapshot = {
	locationId: number | null
	timestamp: string | null
	data: Record<string, unknown>
}

export type MultimediaEnvDeviceStatus = {
	deviceId: number
	status: "online" | "offline"
	reason?: string
}

export type MultimediaEnvReadingsSnapshot = {
	timestamp: string
	data: Record<string, unknown>
	devices: MultimediaEnvDeviceStatus[]
}

export type MultimediaEnvReadingsSnapshotResponse = {
	snapshot: MultimediaEnvReadingsSnapshot
}
