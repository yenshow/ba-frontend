import { computed, reactive, ref, type Ref } from "vue"
import type { LocationLicensePlateRow, SyncWarning } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import {
	SYNC_WARNING_LABELS,
	formatPersonLabel,
	locationPlateRowsToSyncWarnings,
} from "~/utils/personnelUtils"
import {
	clampOffset,
	getNextOffset,
	getPrevOffset,
} from "~/composables/systems/personnel/personnelList"
import { useLocationMembersOnly } from "~/composables/systems/personnel/useLocationMembersStep"
import { useDeviceSyncObserver, indexSyncableLocationDevices } from "~/composables/systems/personnel/useDeviceSyncCore"
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils"
import {
	createDefaultIsapiPlateForm,
	isapiPlateFormFromLocationRow,
	licensePlateItemsToPayload,
	mapPersonLicensePlatesToForm,
	validateLicensePlateFormItems,
	type IsapiPlateFormModel,
} from "~/utils/licensePlateFormUtils"

const PLATES_PAGE_SIZE = 10

export const useLocationPlateSync = (params: {
	personnelApi: PersonnelApi
	locationApi: ReturnType<typeof useLocationApi>
	toast: { success: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canResyncPlates: Ref<boolean>
	toastError?: (msg: string) => void
}) => {
	const { personnelApi, locationApi, toast, handleApiError, canResyncPlates, toastError } = params
	const notifyError = (msg: string) => {
		if (toastError) toastError(msg)
		else handleApiError(new Error(msg), msg)
	}

	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type
	const syncDevicesByLocationId = reactive<Record<number, { entry: string[]; exit: string[] }>>({})
	const platesByLocationId = reactive<Record<number, LocationLicensePlateRow[]>>({})
	const platesLoading = reactive<Record<number, boolean>>({})
	const platesErrorByLocation = reactive<Record<number, string>>({})
	const platesOffsetByLocation = reactive<Record<number, number>>({})
	const activeSyncLocationId = ref<number | null>(null)
	const isSyncingPlates = ref(false)
	const showWarningsDialog = ref(false)
	const syncWarnings = ref<SyncWarning[]>([])
	const locationNameById = reactive<Record<number, string>>({})

	const membersOnly = useLocationMembersOnly({ personnelApi, toast, handleApiError })
	const deviceSyncObserver = useDeviceSyncObserver()

	const loadLocationSyncDevicesLabels = async () => {
		try {
			const res = await locationApi.getVehicleAccessSyncableLocationsWithDevices()
			indexSyncableLocationDevices(res?.locations, syncDevicesByLocationId, locationNameById)
		} catch {
			// ignore
		}
	}

	const getLocationDevicesLabel = (locationId: number) => {
		const v = syncDevicesByLocationId[locationId] || { entry: [], exit: [] }
		return {
			entry: Array.isArray(v.entry) ? v.entry : [],
			exit: Array.isArray(v.exit) ? v.exit : [],
		}
	}

	const isPlatesLoading = (locationId: number) => Boolean(platesLoading[locationId])

	const ensurePlates = async (locationId: number) => {
		platesLoading[locationId] = true
		platesErrorByLocation[locationId] = ""
		try {
			const res = await personnelApi.getLocationLicensePlates(locationId)
			platesByLocationId[locationId] = res.items ?? []
		} catch (e) {
			platesByLocationId[locationId] = []
			platesErrorByLocation[locationId] = resolveUserFacingCatchMessage(e, "載入車牌列表失敗")
		} finally {
			platesLoading[locationId] = false
		}
	}

	const getPlatesForLocation = (locationId: number) => platesByLocationId[locationId] ?? []

	const getPlatesError = (locationId: number) => (platesErrorByLocation[locationId] || "").trim()

	const getPlatesOffset = (locationId: number) =>
		Math.max(0, Math.trunc(Number(platesOffsetByLocation[locationId] ?? 0)))

	const setPlatesOffset = (locationId: number, nextOffset: number) => {
		const total = getPlatesForLocation(locationId).length
		platesOffsetByLocation[locationId] = clampOffset({
			offset: nextOffset,
			total,
			limit: PLATES_PAGE_SIZE,
		})
	}

	const getPagedPlatesForLocation = (locationId: number) => {
		const all = getPlatesForLocation(locationId)
		const total = all.length
		const limit = PLATES_PAGE_SIZE
		const offset = clampOffset({ offset: getPlatesOffset(locationId), total, limit })
		return { rows: all.slice(offset, offset + limit), total, offset, limit }
	}

	const goPrevPlatesPage = (locationId: number) => {
		setPlatesOffset(
			locationId,
			getPrevOffset({ offset: getPlatesOffset(locationId), limit: PLATES_PAGE_SIZE }),
		)
	}

	const goNextPlatesPage = (locationId: number) => {
		const total = getPlatesForLocation(locationId).length
		setPlatesOffset(
			locationId,
			getNextOffset({ offset: getPlatesOffset(locationId), total, limit: PLATES_PAGE_SIZE }),
		)
	}

	const refreshSyncWarnings = (locationId: number, locationName?: string | null) => {
		syncWarnings.value = locationPlateRowsToSyncWarnings(
			getPlatesForLocation(locationId),
			locationName ?? locationNameById[locationId] ?? null,
		)
	}

	const openWarningsDialog = () => {
		if (syncWarnings.value.length <= 0) return
		showWarningsDialog.value = true
	}

	const isSingleLocationSyncing = computed(
		() => isSyncingPlates.value || deviceSyncObserver.isUiLocked.value,
	)

	const isLocationCurrentlySyncing = (locationId: number) =>
		(isSyncingPlates.value || deviceSyncObserver.isUiLocked.value) &&
		activeSyncLocationId.value === locationId

	const isLocationSyncButtonDisabled = (locationId: number) => {
		if (!canResyncPlates.value) return true
		if (deviceSyncObserver.isUiLocked.value) return true
		if (isSyncingPlates.value && activeSyncLocationId.value === locationId) return true
		if (
			isSyncingPlates.value &&
			activeSyncLocationId.value !== null &&
			activeSyncLocationId.value !== locationId
		) {
			return true
		}
		return false
	}

	const syncOneLocation = async (locationId: number, locationName?: string | null) => {
		if (!canResyncPlates.value) return
		activeSyncLocationId.value = locationId
		isSyncingPlates.value = true
		try {
			await personnelApi.syncLocationLicensePlates(locationId)
			await deviceSyncObserver.watchPlateStatus(personnelApi, locationId)
			await ensurePlates(locationId)
			refreshSyncWarnings(locationId, locationName)
			if (syncWarnings.value.length > 0) {
				notifyError(`重新同步完成（含 ${syncWarnings.value.length} 筆警告）`)
				showWarningsDialog.value = true
			} else {
				toast.success("已重新同步車牌至攝影機")
			}
		} catch (e) {
			handleApiError(e, "重新同步失敗")
		} finally {
			isSyncingPlates.value = false
			activeSyncLocationId.value = null
		}
	}

	const finalizePlateSyncFeedback = (locationId: number, locationName?: string | null) => {
		refreshSyncWarnings(locationId, locationName)
		if (syncWarnings.value.length > 0) {
			notifyError(`同步完成（含 ${syncWarnings.value.length} 筆警告）`)
			showWarningsDialog.value = true
		} else {
			toast.success("已套用名單並同步至設備")
		}
	}

	const applyLocationMembers = async (locationId: number, locationName?: string | null) => {
		const res = await membersOnly.applyLocationMembers(locationId, { silentSuccess: true })
		if (res == null) return null

		await ensurePlates(locationId)

		if (res.plateSync?.triggered) {
			activeSyncLocationId.value = locationId
			try {
				await deviceSyncObserver.watchPlateStatus(personnelApi, locationId)
				await ensurePlates(locationId)
				finalizePlateSyncFeedback(locationId, locationName)
			} catch (err) {
				handleApiError(err, "車牌同步失敗")
			} finally {
				activeSyncLocationId.value = null
			}
		} else {
			toast.success("已套用名單")
		}

		return res
	}

	const prepareLocationDialog = async (locationId: number) => {
		await loadLocationSyncDevicesLabels()
		await membersOnly.loadAllLocationMembers(locationId)
	}

	const setLocationDisplayName = (locationId: number, name: string) => {
		locationNameById[locationId] = name
	}

	// --- Plate CRUD ---
	const showPlateForm = ref(false)
	const plateFormMode = ref<"add" | "modify">("add")
	const isSavingPlate = ref(false)
	const plateForm = ref<IsapiPlateFormModel>(createDefaultIsapiPlateForm())
	const plateFormError = ref("")
	const editingPlateRow = ref<LocationLicensePlateRow | null>(null)
	const personBindOptions = ref<Array<{ value: string; label: string }>>([])
	const isLoadingPersonOptions = ref(false)

	const loadPersonBindOptions = async (locationId: number) => {
		isLoadingPersonOptions.value = true
		try {
			const res = await personnelApi.getLocationMembers(locationId, { limit: 500, offset: 0 })
			personBindOptions.value = (res.items ?? []).map((p) => ({
				value: String(p.id),
				label: formatPersonLabel(p.employee_no, p.full_name) || `人員 #${p.id}`,
			}))
		} catch {
			personBindOptions.value = []
		} finally {
			isLoadingPersonOptions.value = false
		}
	}

	const ensureStep2Data = async (locationId: number) => {
		await Promise.all([loadPersonBindOptions(locationId), ensurePlates(locationId)])
		refreshSyncWarnings(locationId)
	}

	const pushPersonPlatesToDevices = async (locationId: number, personId: number, plates: ReturnType<typeof licensePlateItemsToPayload>) => {
		await personnelApi.replacePersonLicensePlates(personId, plates, { syncToDevices: true })
		await ensurePlates(locationId)
	}

	const openPlateForm = (row?: LocationLicensePlateRow) => {
		plateFormError.value = ""
		editingPlateRow.value = row ?? null
		if (row) {
			plateFormMode.value = "modify"
			plateForm.value = isapiPlateFormFromLocationRow(row)
		} else {
			plateFormMode.value = "add"
			plateForm.value = createDefaultIsapiPlateForm()
		}
		showPlateForm.value = true
	}

	const cancelPlateForm = () => {
		plateFormError.value = ""
		showPlateForm.value = false
		editingPlateRow.value = null
	}

	const resolvePersonIdFromForm = (): number | null => {
		const raw = plateForm.value.bindPersonId?.trim()
		if (!raw) return editingPlateRow.value?.person_id ?? null
		const n = Number.parseInt(raw, 10)
		return Number.isFinite(n) ? n : null
	}

	const savePlate = async (locationId: number) => {
		plateFormError.value = ""
		const personId = resolvePersonIdFromForm()
		if (personId == null) {
			plateFormError.value = "請選擇綁定人員"
			return false
		}

		const plateItem = {
			plateNumber: plateForm.value.licensePlate.trim(),
			listType: plateForm.value.listType,
			effectiveBegin: plateForm.value.createTimeLocal,
			effectiveEnd: plateForm.value.effectiveTimeLocal,
		}
		const formError = validateLicensePlateFormItems([plateItem])
		if (formError) {
			plateFormError.value = formError
			return false
		}

		isSavingPlate.value = true
		try {
			const person = await personnelApi.getPersonById(personId)
			let items = mapPersonLicensePlatesToForm(person)

			if (plateFormMode.value === "modify" && editingPlateRow.value) {
				const norm = editingPlateRow.value.plate_normalized
				items = items.filter(
					(i) => i.plateNumber.trim().toUpperCase() !== norm && i.plateNumber.trim(),
				)
				items.push(plateItem)
			} else {
				items = [...items.filter((i) => i.plateNumber.trim()), plateItem]
			}

			await pushPersonPlatesToDevices(locationId, personId, licensePlateItemsToPayload(items))
			toast.success("已儲存車牌")
			cancelPlateForm()
			return true
		} catch (e) {
			plateFormError.value = resolveUserFacingCatchMessage(e, "儲存車牌失敗")
			return false
		} finally {
			isSavingPlate.value = false
		}
	}

	const deletePlate = async (locationId: number, row: LocationLicensePlateRow) => {
		if (!window.confirm(`確定刪除車牌 ${row.plate_number}？`)) return false
		try {
			const person = await personnelApi.getPersonById(row.person_id)
			const items = mapPersonLicensePlatesToForm(person).filter(
				(i) => i.plateNumber.trim().toUpperCase() !== row.plate_normalized,
			)
			await pushPersonPlatesToDevices(locationId, row.person_id, licensePlateItemsToPayload(items))
			toast.success("已刪除車牌")
			return true
		} catch (e) {
			handleApiError(e, "刪除車牌失敗")
			return false
		}
	}

	return {
		isSingleLocationSyncing,
		showWarningsDialog,
		syncWarnings,
		syncWarningTypeLabel,
		openWarningsDialog,
		refreshSyncWarnings,
		getLocationDevicesLabel,
		setLocationDisplayName,
		prepareLocationDialog,
		ensurePlates,
		ensureStep2Data,
		isPlatesLoading,
		getPlatesError,
		getPagedPlatesForLocation,
		goPrevPlatesPage,
		goNextPlatesPage,
		syncOneLocation,
		isLocationCurrentlySyncing,
		isLocationSyncButtonDisabled,
		...membersOnly,
		applyLocationMembers,
		showPlateForm,
		plateFormMode,
		isSavingPlate,
		plateForm,
		plateFormError,
		personBindOptions,
		isLoadingPersonOptions,
		openPlateForm,
		cancelPlateForm,
		savePlate,
		deletePlate,
	}
}

export type LocationPlateSync = ReturnType<typeof useLocationPlateSync>
