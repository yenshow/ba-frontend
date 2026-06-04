import { useAuth, useAdminOnly } from "~/composables/core/useAuth";
import { PERM } from "~/config/permissionCodes";

export const useSnapshotSystemPageRbac = (moduleCode: string) => {
	const canAdmin = useAdminOnly();
	const { useHasPermission } = useAuth();
	return {
		canAdmin,
		canWrite: useHasPermission(moduleCode),
	};
};

type LocationPermCodes = {
	locationCreate: string;
	locationUpdate: string;
	locationDelete: string;
	reportFull: string;
	reportExport?: string;
};

export const useLocationModuleRbac = (perm: LocationPermCodes) => {
	const { useHasAnyPermission, useHasPermission } = useAuth();
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
	};
};

export const useEquipmentRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth();
	const p = PERM.equipment;
	return {
		canCreateDevice: useHasPermission(p.deviceCreate),
		canUpdateDevice: useHasPermission(p.deviceUpdate),
		canDeleteDevice: useHasPermission(p.deviceDelete),
		canManageDeviceModels: useHasAnyPermission(
			p.deviceCreate,
			p.deviceUpdate,
			p.deviceDelete,
		),
	};
};

export const usePersonnelRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth();
	const p = PERM.personnel;
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
	};
};

export const useVehicleAccessRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth();
	const p = PERM.vehicleAccess;
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
	};
};

export const useAlertLogRbac = () => {
	const { useHasPermission, useHasAnyPermission } = useAuth();
	const p = PERM.alertLog;
	return {
		canIgnoreAlert: useHasPermission(p.ignore),
		canExportReport: useHasPermission(p.export),
		canCreateAlert: useHasPermission(p.create),
		canManageRules: useHasAnyPermission(p.create, p.update, p.delete),
		canUpdateRule: useHasPermission(p.update),
		canDeleteRule: useHasPermission(p.delete),
	};
};

export const useSurveillanceRbac = () => {
	const { useHasPermission } = useAuth();
	const p = PERM.videoSurveillance;
	return {
		canViewModule: useHasPermission(p.module),
		canControlStream: useHasPermission(p.streamControl),
	};
};

export const useHomeRbac = () => {
	const { useHasPermission } = useAuth();
	return { canWrite: useHasPermission(PERM.home.module) };
};
