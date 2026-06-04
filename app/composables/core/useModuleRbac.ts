import { useAuth, useAdminOnly } from "~/composables/core/useAuth"
import { PERM } from "~/config/permissionCodes"

type LocationPermCodes = {
	locationCreate: string
	locationUpdate: string
	locationDelete: string
	reportFull: string
	reportExport?: string
}

/**
 * Central 快照子系統頁（照明、排水、消防等）
 * - canWrite：模組父層（設備控制）
 * - canAdmin：平台 admin（區域 CRUD，與後端 requireAdmin 對齊）
 */
export const useSnapshotSystemPageRbac = (moduleCode: string) => {
	const canAdmin = useAdminOnly()
	const { useHasPermission } = useAuth()
	return {
		canAdmin,
		canWrite: useHasPermission(moduleCode),
	}
}

/** 地點／區域管理（人流、環境、車輛） */
export const useLocationModuleRbac = (perm: LocationPermCodes) => {
	const { useHasAnyPermission, useHasPermission } = useAuth()
	return {
		canCreateLocation: useHasPermission(perm.locationCreate),
		canUpdateLocation: useHasPermission(perm.locationUpdate),
		canDeleteLocation: useHasPermission(perm.locationDelete),
		canManageLocation: useHasAnyPermission(
			perm.locationCreate,
			perm.locationUpdate,
			perm.locationDelete,
		),
		canFullReport: useHasPermission(perm.reportFull),
		canExportReport: perm.reportExport
			? useHasPermission(perm.reportExport)
			: computed(() => false),
	}
}

export const useEquipmentRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.equipment
	return {
		canCreateDevice: useHasPermission(p.deviceCreate),
		canUpdateDevice: useHasPermission(p.deviceUpdate),
		canDeleteDevice: useHasPermission(p.deviceDelete),
		canManageDeviceModels: useHasAnyPermission(
			p.deviceCreate,
			p.deviceUpdate,
			p.deviceDelete,
		),
	}
}

export const usePersonnelRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.personnel
	return {
		canCreateGroup: useHasPermission(p.groupCreate),
		canUpdateGroup: useHasPermission(p.groupUpdate),
		canDeleteGroup: useHasPermission(p.groupDelete),
		canManageGroups: useHasAnyPermission(p.groupCreate, p.groupUpdate, p.groupDelete),
		canCreatePerson: useHasPermission(p.personCreate),
		canUpdatePerson: useHasPermission(p.personUpdate),
		canDeletePerson: useHasPermission(p.personDelete),
		canManagePersons: useHasAnyPermission(p.personCreate, p.personUpdate, p.personDelete),
		canDeviceSync: useHasPermission(p.deviceSync),
		canSyncEdit: useHasPermission(p.syncEdit),
		canManageSync: useHasAnyPermission(p.deviceSync, p.syncEdit),
	}
}

export const useVehicleAccessRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.vehicleAccess
	return {
		canManagePlates: useHasPermission(p.plateManage),
		canCreatePlate: useHasPermission(p.plateCreate),
		canUpdatePlate: useHasPermission(p.plateUpdate),
		canDeletePlate: useHasPermission(p.plateDelete),
		canWritePlates: useHasAnyPermission(
			p.plateManage,
			p.plateCreate,
			p.plateUpdate,
			p.plateDelete,
		),
		canResetStatistics: useHasPermission(p.statisticsReset),
		canBarrierControl: useHasPermission(p.barrierControl),
	}
}

export const useAlertLogRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.alertLog
	return {
		canIgnoreAlert: useHasPermission(p.ignore),
		canExportReport: useHasPermission(p.export),
		canCreateAlert: useHasPermission(p.create),
		canManageRules: useHasAnyPermission(p.create, p.update, p.delete),
		canUpdateRule: useHasPermission(p.update),
		canDeleteRule: useHasPermission(p.delete),
	}
}

export const useSurveillanceRbac = () => {
	const { useHasPermission } = useAuth()
	const p = PERM.videoSurveillance
	return {
		canViewModule: useHasPermission(p.module),
		canControlStream: useHasPermission(p.streamControl),
	}
}

export const useMultimediaRbac = () => {
	const { useHasPermission } = useAuth()
	return { canWrite: useHasPermission(PERM.multimedia.module) }
}

export const useHomeRbac = () => {
	const { useHasPermission } = useAuth()
	return { canWrite: useHasPermission(PERM.home.module) }
}

/** 全區點位圖（統一區域／地點刪除；進入頁面需父層 module） */
export const useAreaPointMapRbac = () => {
	const { useHasPermission, useHasAnyPermission, hasPermission } = useAuth()
	const p = PERM.areaPointMap
	const canDeleteZone = useHasPermission(p.zoneDelete)
	const canUpdateZone = useHasPermission(p.zoneUpdate)
	const canCreateZone = useHasPermission(p.zoneCreate)
	const canDeleteLocation = useHasPermission(p.locationDelete)
	const canManageOperations = useHasAnyPermission(
		p.zoneDelete,
		p.zoneUpdate,
		p.zoneCreate,
		p.locationDelete,
	)
	const canDeleteLocationForSystem = (systemType: string | null | undefined) => {
		if (!systemType) return canDeleteLocation.value
		const map: Record<string, string> = {
			people_counting: PERM.peopleCounting.locationDelete,
			environment: PERM.environment.locationDelete,
			vehicle_access: PERM.vehicleAccess.locationDelete,
		}
		const code = map[String(systemType)]
		if (code && hasPermission(code)) return true
		return canDeleteLocation.value || canUpdateZone.value
	}
	return {
		canCreateZone,
		canUpdateZone,
		canDeleteZone,
		canDeleteLocation,
		canManageOperations,
		canDeleteLocationForSystem,
	}
}
