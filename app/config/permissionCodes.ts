// AUTO-GENERATED — do not edit; run: npm run gen:perm (ba-backend)
/** Profile: construction — aligned with access/catalog.js */

export const PERM = {
	home: {
		module: "system.home",
		settingsUpdate: "system.home.settings.update",
	},
	equipment: {
		module: "system.equipment_management",
		deviceCreate: "system.equipment_management.device.create",
		deviceUpdate: "system.equipment_management.device.update",
		deviceDelete: "system.equipment_management.device.delete",
	},
	personnel: {
		module: "system.personnel",
		groupCreate: "system.personnel.group.create",
		groupUpdate: "system.personnel.group.update",
		groupDelete: "system.personnel.group.delete",
		personCreate: "system.personnel.person.create",
		personUpdate: "system.personnel.person.update",
		personDelete: "system.personnel.person.delete",
	},
	alertLog: {
		module: "system.alert_log",
		ignore: "system.alert_log.alert.ignore",
		export: "system.alert_log.report.export",
		create: "system.alert_log.alert.create",
		update: "system.alert_log.alert.update",
		delete: "system.alert_log.alert.delete",
	},
	operationalLog: {
		module: "system.operational_log",
		export: "system.operational_log.report.export",
	},
	peopleCounting: {
		module: "system.people_counting",
		locationCreate: "system.people_counting.location.create",
		locationUpdate: "system.people_counting.location.update",
		locationDelete: "system.people_counting.location.delete",
		reportFull: "system.people_counting.report.full",
		deviceSync: "system.people_counting.device_sync",
		syncEdit: "system.people_counting.sync.edit",
		statisticsReset: "system.people_counting.statistics.reset",
		doorControl: "system.people_counting.door.control",
	},
	environment: {
		module: "system.environment",
		locationCreate: "system.environment.location.create",
		locationUpdate: "system.environment.location.update",
		locationDelete: "system.environment.location.delete",
		reportFull: "system.environment.report.full",
	},
	vehicleAccess: {
		module: "system.vehicle_access",
		locationCreate: "system.vehicle_access.location.create",
		locationUpdate: "system.vehicle_access.location.update",
		locationDelete: "system.vehicle_access.location.delete",
		plateManage: "system.vehicle_access.plate.manage",
		plateCreate: "system.vehicle_access.plate.create",
		plateUpdate: "system.vehicle_access.plate.update",
		plateDelete: "system.vehicle_access.plate.delete",
		reportFull: "system.vehicle_access.report.full",
		statisticsReset: "system.vehicle_access.statistics.reset",
		barrierControl: "system.vehicle_access.barrier.control",
	},
	videoSurveillance: {
		module: "system.video_surveillance",
		streamControl: "system.video_surveillance.stream.control",
	},
} as const

/** locationType（DB／API）→ 地點刪除權限碼；全區點位圖依系統刪除地點時使用 */
export const LOCATION_DELETE_BY_SYSTEM_TYPE: Record<string, string> = {
	people_counting: PERM.peopleCounting.locationDelete,
	environment: PERM.environment.locationDelete,
	vehicle_access: PERM.vehicleAccess.locationDelete,
}
