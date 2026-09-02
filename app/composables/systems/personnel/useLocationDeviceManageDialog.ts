import { computed, unref, watch, type ComputedRef, type Ref } from "vue"
import { useLocationMembersGroupPicker } from "~/composables/systems/personnel/useLocationMembersGroupPicker"
import type { LocationMembersPickerSync } from "~/composables/systems/personnel/useLocationMembersStep"
import type { SyncWarning } from "~/types/personnel"
import { resolvePersonGroupId } from "~/utils/personnelUtils"

type MaybeRef<T> = Ref<T> | ComputedRef<T>

export type LocationDeviceManageSyncEngine = LocationMembersPickerSync & {
	isSingleLocationSyncing: Ref<boolean> | ComputedRef<boolean>
	showWarningsDialog: Ref<boolean>
	syncWarnings: Ref<SyncWarning[]>
	syncWarningTypeLabel: (type: string) => string
	openWarningsDialog: () => void
	getLocationDevicesLabel: (locationId: number) => {
		entry: string[]
		exit: string[]
		cameras?: string[]
	}
	prepareLocationDialog: (locationId: number) => Promise<void>
	isLocationCurrentlySyncing: (locationId: number) => boolean
	isLocationSyncButtonDisabled: (locationId: number) => boolean
	isSyncLocationCandidatesLoading?: (locationId: number) => boolean
}

export const useLocationDeviceManageDialog = (params: {
	modelValue: MaybeRef<boolean>
	locationId: MaybeRef<number | null>
	syncEngine: MaybeRef<LocationDeviceManageSyncEngine | undefined>
	onDialogOpen?: (locationId: number) => Promise<void>
}) => {
	const groupPicker = useLocationMembersGroupPicker({
		locationId: params.locationId,
		membersSync: params.syncEngine,
	})

	const deviceLabels = computed(() => {
		const id = unref(params.locationId)
		const engine = unref(params.syncEngine)
		if (id == null || !engine) {
			return { entry: [] as string[], exit: [] as string[], cameras: [] as string[] }
		}
		return engine.getLocationDevicesLabel(id)
	})

	const isUiLocked = computed(() => unref(params.syncEngine)?.isSingleLocationSyncing.value ?? false)

	const isSyncCandidatesLoading = computed(() => {
		const id = unref(params.locationId)
		const engine = unref(params.syncEngine)
		if (id == null || !engine?.isSyncLocationCandidatesLoading) return false
		return engine.isSyncLocationCandidatesLoading(id)
	})

	const isCurrentlySyncing = computed(() => {
		const id = unref(params.locationId)
		const engine = unref(params.syncEngine)
		if (id == null || !engine) return false
		return engine.isLocationCurrentlySyncing(id)
	})

	const isSyncButtonDisabled = computed(() => {
		const id = unref(params.locationId)
		const engine = unref(params.syncEngine)
		if (id == null || !engine) return true
		return engine.isLocationSyncButtonDisabled(id)
	})

	const isLoadingMembersPanel = computed(
		() => groupPicker.isLoadingMembers.value || isSyncCandidatesLoading.value,
	)

	const showWarningsDialog = computed({
		get: () => unref(params.syncEngine)?.showWarningsDialog.value ?? false,
		set: (value: boolean) => {
			const engine = unref(params.syncEngine)
			if (engine) engine.showWarningsDialog.value = value
		},
	})

	const syncWarnings = computed(() => unref(params.syncEngine)?.syncWarnings.value ?? [])

	const syncWarningTypeLabel = (type: string) =>
		unref(params.syncEngine)?.syncWarningTypeLabel(type) ?? type

	const openWarningsDialog = () => {
		unref(params.syncEngine)?.openWarningsDialog()
	}

	const handleAddGroupToMembers = (childGroupId: number) => {
		const locationId = unref(params.locationId)
		const engine = unref(params.syncEngine)
		if (locationId == null || !engine) return

		const idsForGroup = engine
			.getLocationCandidatesItems(locationId)
			.filter((person) => resolvePersonGroupId(person) === childGroupId)
			.map((person) => person.id)

		if (idsForGroup.length === 0) return
		engine.toggleManyLocationMembers(locationId, idsForGroup, true)
	}

	watch(
		() => unref(params.modelValue),
		(open) => {
			if (!open) return
			const locationId = unref(params.locationId)
			if (locationId == null) return
			void (async () => {
				const engine = unref(params.syncEngine)
				if (!engine) return
				if (params.onDialogOpen) {
					await params.onDialogOpen(locationId)
				} else {
					await engine.prepareLocationDialog(locationId)
				}
				await groupPicker.prepareGroupPicker()
			})()
		},
	)

	return {
		...groupPicker,
		deviceLabels,
		isUiLocked,
		isCurrentlySyncing,
		isSyncButtonDisabled,
		isLoadingMembersPanel,
		showWarningsDialog,
		syncWarnings,
		syncWarningTypeLabel,
		openWarningsDialog,
		handleAddGroupToMembers,
	}
}
