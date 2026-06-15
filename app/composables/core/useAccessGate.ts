import { computed } from "vue"
import { useAdminOnly, useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { useToast } from "~/composables/core/useToast"
import { canAccessAccountPage } from "~/composables/systems/users/useAccountSettings"
import { LOCATION_DELETE_BY_SYSTEM_TYPE, PERM } from "~/config/permissionCodes"
import type { FeatureKey } from "~/types/license"
import {
	MSG_ACCOUNT_ADMIN,
	MSG_ADMIN_ONLY,
	MSG_LICENSE_REDIRECT,
	MSG_PERMISSION_REDIRECT,
} from "~/utils/errorUtils"
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

export type CheckRouteAccessOptions = {
	/** middleware：僅用快取，不觸發可能 401 的 API；interactive：完整檢查（UI 互動） */
	mode?: "middleware" | "interactive"
}

export const useAccessGate = () => {
	const { hasPermission, isAuthenticated, user } = useAuth()
	const canAdmin = useAdminOnly()
	const moduleRegistry = useModuleRegistry()
	const { hasFeature, fetchLicense, isLoaded } = useLicense()

	const checkRouteAccess = async (
		path: string,
		options: CheckRouteAccessOptions = {},
	): Promise<RouteAccessResult> => {
		const mode = options.mode ?? "interactive"
		const isMiddlewareMode = mode === "middleware"

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

		if (isMiddlewareMode) {
			if (!moduleRegistry.registry.value?.modules?.length) {
				return { ok: true, reason: "ok" }
			}
		} else {
			await moduleRegistry.ensureLoaded()
		}

		const permissionCode = moduleRegistry.getPermissionCodeByRoute(path)
		if (permissionCode && !hasPermission(permissionCode)) {
			return {
				ok: false,
				reason: "permission",
				redirectMessage: MSG_PERMISSION_REDIRECT,
			}
		}

		const featureKey = moduleRegistry.getFeatureKeyByRoute(path) as FeatureKey | null
		if (!featureKey) return { ok: true, reason: "ok" }

		if (isMiddlewareMode && !isLoaded.value) {
			return { ok: true, reason: "ok" }
		}

		if (!isLoaded.value) await fetchLicense()
		if (hasFeature(featureKey)) return { ok: true, reason: "ok" }

		return {
			ok: false,
			reason: "license",
			redirectMessage: MSG_LICENSE_REDIRECT,
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

	const handleAccessDenied = (path: string, result: RouteAccessResult) => {
		if (result.ok || path === "/") return

		if (result.reason === "account") {
			if (process.client) useToast().warning(MSG_ACCOUNT_ADMIN)
			return navigateTo("/")
		}

		if (result.reason === "admin") {
			if (process.client) useToast().warning(MSG_ADMIN_ONLY)
			return navigateTo("/")
		}

		if (result.redirectMessage && process.client) {
			useToast().warning(result.redirectMessage)
		}

		return navigateTo("/")
	}

	return {
		checkRouteAccess,
		handleAccessDenied,
		canAccessModule,
		isModuleLocked,
	}
}

// --- 模組 RBAC（按鈕／操作權限）---

/** 含地點 CRUD 的模組權限碼；deviceControl 供照明／空調開關；reportFull 供工地監控完整報表 */
export type LocationPermCodes = {
	locationCreate: string
	locationUpdate: string
	locationDelete: string
	deviceControl?: string
	reportFull?: string
	floorManage?: string
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
		canControlDevice: perm.deviceControl
			? useHasPermission(perm.deviceControl)
			: computed(() => false),
		canFullReport: perm.reportFull
			? useHasPermission(perm.reportFull)
			: computed(() => false),
		canFloorManage: perm.floorManage
			? useHasPermission(perm.floorManage)
			: computed(() => false),
	}
}

export const useHomeRbac = () => {
	const { useHasPermission } = useAuth()
	return { canWrite: useHasPermission(PERM.home.settingsUpdate) }
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
	}
}

/** 門禁管理：名單編輯與門禁設備重新同步（權限碼歸屬人流統計模組） */
export const usePeopleCountingAccessRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth()
	const p = PERM.peopleCounting
	const canDeviceSync = useHasPermission(p.deviceSync)
	const canSyncEdit = useHasPermission(p.syncEdit)
	const canManageSync = useHasAnyPermission(p.deviceSync, p.syncEdit)
	return {
		canOpenAccessManage: canManageSync,
		canEditAccessMembers: canSyncEdit,
		canResyncAccessDevices: canDeviceSync,
	}
}

/** 車輛進出「車牌管理」：名單、車牌 CRUD 與攝影機重新同步 */
export const useVehiclePlateManageRbac = () => {
	const { useHasAnyPermission } = useAuth()
	const v = PERM.vehicleAccess
	const p = PERM.peopleCounting
	const { canManagePlates, canCreatePlate, canUpdatePlate, canDeletePlate } =
		useVehicleAccessRbac()
	return {
		canOpenPlateManage: useHasAnyPermission(
			v.plateManage,
			v.plateCreate,
			v.plateUpdate,
			v.plateDelete,
			p.syncEdit,
		),
		canEditPlateMembers: useHasAnyPermission(v.plateManage, p.syncEdit),
		canResyncPlates: useHasAnyPermission(v.plateManage, p.deviceSync),
		canManagePlates,
		canCreatePlate,
		canUpdatePlate,
		canDeletePlate,
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
	return {
		canUpdateSettings: useHasPermission(PERM.multimedia.settingsUpdate),
	}
}

export const useAreaPointMapRbac = () => {
	const { useHasPermission, useHasAnyPermission, hasPermission } = useAuth()
	const p = PERM.areaPointMap
	const canDeleteZone = useHasPermission(p.zoneDelete)
	const canDeleteLocation = useHasPermission(p.locationDelete)
	const canManageOperations = useHasAnyPermission(p.zoneDelete, p.locationDelete)
	const canDeleteLocationForSystem = (systemType: string | null | undefined) => {
		if (!systemType) return canDeleteLocation.value
		const code = LOCATION_DELETE_BY_SYSTEM_TYPE[String(systemType)]
		if (code && hasPermission(code)) return true
		return canDeleteLocation.value
	}
	return {
		canDeleteZone,
		canDeleteLocation,
		canManageOperations,
		canDeleteLocationForSystem,
	}
}
