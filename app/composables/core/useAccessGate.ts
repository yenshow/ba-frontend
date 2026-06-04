import { computed } from "vue"
import { useAdminOnly, useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"
import { PERM } from "~/config/permissionCodes"
import type { FeatureKey } from "~/types/license"
import { LICENSE_MESSAGE_REDIRECT, PERMISSION_MESSAGE_REDIRECT } from "~/utils/errorUtils"
import type { SystemModule } from "~/types/system"

/** 僅平台管理員（role=admin）可進入的頁面 */
export const PLATFORM_ADMIN_ROUTES = [
	"/core/users",
	"/core/license",
	"/core/env",
] as const

export const matchesPlatformAdminRoute = (path: string): boolean =>
	PLATFORM_ADMIN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))

export type RouteAccessReason = "ok" | "auth" | "permission" | "license" | "admin" | "account"

export type RouteAccessResult = {
	ok: boolean
	reason: RouteAccessReason
	redirectMessage?: string
}

export const useAccessGate = () => {
	const { hasPermission, isAuthenticated, user } = useAuth()
	const canAdmin = useAdminOnly()
	const moduleRegistry = useModuleRegistry()
	const { hasFeature, fetchLicense, isLoaded } = useLicense()

	const checkRouteAccess = async (path: string): Promise<RouteAccessResult> => {
		if (path === "/login") return { ok: true, reason: "ok" }

		if (!isAuthenticated.value) {
			return { ok: false, reason: "auth" }
		}

		if (path === "/core/account") {
			if (!canAccessAccountPage(user.value)) {
				return { ok: false, reason: "account" }
			}
			return { ok: true, reason: "ok" }
		}

		if (matchesPlatformAdminRoute(path)) {
			if (!canAdmin.value) {
				return { ok: false, reason: "admin" }
			}
			return { ok: true, reason: "ok" }
		}

		await moduleRegistry.ensureLoaded()
		const permissionCode = moduleRegistry.getPermissionCodeByRoute(path)
		if (permissionCode && !hasPermission(permissionCode)) {
			return {
				ok: false,
				reason: "permission",
				redirectMessage: PERMISSION_MESSAGE_REDIRECT,
			}
		}

		const featureKey = moduleRegistry.getFeatureKeyByRoute(path) as FeatureKey | null
		if (!featureKey) return { ok: true, reason: "ok" }

		if (!isLoaded.value) await fetchLicense()
		if (hasFeature(featureKey)) return { ok: true, reason: "ok" }

		return {
			ok: false,
			reason: "license",
			redirectMessage: LICENSE_MESSAGE_REDIRECT,
		}
	}

	const canAccessModule = (module: { route: string; permissionCode?: string }): boolean => {
		if (matchesPlatformAdminRoute(module.route)) {
			return canAdmin.value
		}
		const code =
			module.permissionCode ?? moduleRegistry.getPermissionCodeByRoute(module.route) ?? null
		if (code && !hasPermission(code)) return false
		const featureKey = moduleRegistry.getFeatureKeyByRoute(module.route) as FeatureKey | null
		if (featureKey && !hasFeature(featureKey)) return false
		return true
	}

	const isModuleLocked = (module: Pick<SystemModule, "route">) => !canAccessModule(module)

	return {
		checkRouteAccess,
		canAccessModule,
		isModuleLocked,
	}
}

// --- 模組 RBAC（按鈕／操作權限）---

export type LocationPermCodes = {
	locationCreate: string
	locationUpdate: string
	locationDelete: string
	reportFull: string
	reportExport?: string
}

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

export const useHomeRbac = () => {
	const { useHasPermission } = useAuth()
	return { canWrite: useHasPermission(PERM.home.module) }
}

export const useEquipmentRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.equipment
	return {
		canCreateDevice: useHasPermission(p.deviceCreate),
		canUpdateDevice: useHasPermission(p.deviceUpdate),
		canDeleteDevice: useHasPermission(p.deviceDelete),
		canManageDeviceModels: useHasAnyPermission(p.deviceCreate, p.deviceUpdate, p.deviceDelete),
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

export const useVehicleAccessRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.vehicleAccess
	return {
		canManagePlates: useHasPermission(p.plateManage),
		canCreatePlate: useHasPermission(p.plateCreate),
		canUpdatePlate: useHasPermission(p.plateUpdate),
		canDeletePlate: useHasPermission(p.plateDelete),
		canWritePlates: useHasAnyPermission(p.plateManage, p.plateCreate, p.plateUpdate, p.plateDelete),
		canResetStatistics: useHasPermission(p.statisticsReset),
		canBarrierControl: useHasPermission(p.barrierControl),
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

/** 快照子系統：canWrite=父層模組碼；canAdmin=平台 admin（zone CRUD） */
export const useSnapshotSystemPageRbac = (moduleCode: string) => {
	const canAdmin = useAdminOnly()
	const { useHasPermission } = useAuth()
	return {
		canAdmin,
		canWrite: useHasPermission(moduleCode),
	}
}

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
