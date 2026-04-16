export type MultimediaAnnouncement = {
	id: string
	title: string
	content: string
	pinned: boolean
	startAt: string
	endAt: string
	sortOrder: number
}

export type MultimediaSchedule = {
	id: string
	date: string // YYYY-MM-DD
	startTime: string // HH:mm
	endTime: string // HH:mm
	title: string
	sortOrder: number
}

export type MultimediaDashboardSettings = {
	backgroundImageUrl: string
	projectImageUrl: string
	heroImageUrl: string
	bannerMarqueeText: string
	envDeviceIds: number[]
	envDisplayParameters: string[]
	announcements: MultimediaAnnouncement[]
	schedules: MultimediaSchedule[]
}

export type MultimediaEnvironmentSnapshot = {
	locationId: number | null
	timestamp: string | null
	data: Record<string, unknown>
}

