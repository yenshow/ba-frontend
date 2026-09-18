import { TOAST } from "~/config/toastCatalog"
import { computed, reactive, ref, type Ref } from "vue"
import type { LocationLicensePlateRow, Person, SyncWarning } from "~/types/personnel"
import type { LocationTemporaryLicensePlate } from "~/types/vehicleAccess"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import type { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useVehicleAccessApi } from "~/composables/systems/vehicleAccess/useVehicleAccessApi"
import {
	SYNC_WARNING_LABELS,
	formatPersonLabel,
	locationPlateRowsToSyncWarnings,
} from "~/utils/personnelUtils"
import { useLocationMembersOnly } from "~/composables/systems/personnel/useLocationMembersStep"
import { useDeviceSyncObserver, indexSyncableLocationDevices } from "~/composables/systems/personnel/useDeviceSyncCore"
import { resolveUserFacingCatchMessage } from "~/utils/apiError"
import {
	createDefaultIsapiPlateForm,
	isapiPlateFormFromLocationRow,
	isapiPlateFormFromTemporaryRow,
	licensePlateItemsToPayload,
	mapPersonLicensePlatesToForm,
	resolvePersonPlateDisplayRows,
	temporaryPlatePayloadFromForm,
	validateIsapiPlateForm,
	validateLicensePlateFormItems,
	type IsapiPlateFormModel,
} from "~/utils/licensePlateFormUtils"
import { buildLocationMemberPlateSyncIndicators } from "~/utils/syncCredentialIcons"

export const useLocationPlateSync = (params: {
	personnelApi: PersonnelApi
	locationApi: ReturnType<typeof useLocationApi>
	toast: { success: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
	canResyncPlates: Ref<boolean>
	toastError?: (msg: string) => void
}) => {
	const { personnelApi, locationApi, toast, handleApiError, canResyncPlates, toastError } = params
	const vehicleAccessApi = useVehicleAccessApi()
	const notifyError = (msg: string) => {
		if (toastError) toastError(msg)
		else handleApiError(new Error(msg), msg)
	}

	const syncWarningTypeLabel = (type: string) => SYNC_WARNING_LABELS[type] ?? type
	const syncDevicesByLocationId = reactive<Record<number, { entry: string[]; exit: string[] }>>({})
	const platesByLocationId = reactive<Record<number, LocationLicensePlateRow[]>>({})
	const tempPlatesByLocationId = reactive<Record<number, LocationTemporaryLicensePlate[]>>({})
	const platesLoading = reactive<Record<number, boolean>>({})
	const platesErrorByLocation = reactive<Record<number, string>>({})
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

	const ensureTemporaryPlates = async (locationId: number) => {
		try {
			const res = await vehicleAccessApi.getLocationTemporaryPlates(locationId)
			tempPlatesByLocationId[locationId] = res.items ?? []
		} catch {
			// 保留既有列表，避免偶發失敗把剛存的資料從 UI 抹掉
			if (!Array.isArray(tempPlatesByLocationId[locationId])) {
				tempPlatesByLocationId[locationId] = []
			}
		}
	}

	const ensurePlates = async (locationId: number) => {
		platesLoading[locationId] = true
		platesErrorByLocation[locationId] = ""
		try {
			const res = await personnelApi.getLocationLicensePlates(locationId)
			platesByLocationId[locationId] = res.items ?? []
			await ensureTemporaryPlates(locationId)
		} catch (e) {
			platesByLocationId[locationId] = []
			platesErrorByLocation[locationId] = resolveUserFacingCatchMessage(e, "載入車牌列表失敗")
			await ensureTemporaryPlates(locationId)
		} finally {
			platesLoading[locationId] = false
		}
	}

	const getPlatesForLocation = (locationId: number) => platesByLocationId[locationId] ?? []
	const getTemporaryPlatesForLocation = (locationId: number) =>
		tempPlatesByLocationId[locationId] ?? []

	const getPlatesError = (locationId: number) => (platesErrorByLocation[locationId] || "").trim()

	const refreshSyncWarnings = (locationId: number, locationName?: string | null) => {
		const personWarnings = locationPlateRowsToSyncWarnings(
			getPlatesForLocation(locationId),
			locationName ?? locationNameById[locationId] ?? null,
		)
		const tempWarnings: SyncWarning[] = getTemporaryPlatesForLocation(locationId)
			.filter((row) => {
				const s = String(row.isapi_sync_status || "").toLowerCase()
				return s === "failed" || s === "partial" || Boolean(row.isapi_sync_error)
			})
			.map((row) => ({
				type: "plate_sync",
				locationName: locationName ?? locationNameById[locationId] ?? undefined,
				message:
					row.isapi_sync_error ||
					`臨時車牌 ${row.plate_number}（${row.display_name}）同步異常`,
			}))
		syncWarnings.value = [...personWarnings, ...tempWarnings]
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
				toast.success(TOAST.PERSONNEL_PLATE_RESYNCED)
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
			toast.success(TOAST.PERSONNEL_LIST_APPLIED_SYNCED)
		}
	}

	const applyLocationMembers = async (locationId: number, locationName?: string | null) => {
		const res = await membersOnly.applyLocationMembers(locationId, { silentSuccess: true })
		if (res == null) return null

		await Promise.all([ensurePlates(locationId), loadPersonBindOptions(locationId)])

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
			toast.success(TOAST.PERSONNEL_LIST_APPLIED)
		}

		return res
	}

	const prepareLocationDialog = async (locationId: number) => {
		await loadLocationSyncDevicesLabels()
		await Promise.all([
			membersOnly.loadAllLocationMembers(locationId),
			ensurePlates(locationId),
		])
		refreshSyncWarnings(locationId)
	}

	const getPlatesForPerson = (locationId: number, personId: number) =>
		getPlatesForLocation(locationId).filter(
			(row) => Number(row.person_id) === Number(personId),
		)

	const resolvePlatesForPerson = (locationId: number, person: Person) =>
		resolvePersonPlateDisplayRows(person, getPlatesForPerson(locationId, person.id))

	const plateSyncIndicatorsForPerson = (locationId: number, person: Person) =>
		buildLocationMemberPlateSyncIndicators(person, getPlatesForPerson(locationId, person.id))

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
	const editingTemporaryRow = ref<LocationTemporaryLicensePlate | null>(null)
	const personBindOptions = ref<Array<{ value: string; label: string }>>([])
	const isLoadingPersonOptions = ref(false)

	const loadPersonBindOptions = async (locationId: number) => {
		isLoadingPersonOptions.value = true
		try {
			// 僅「已套用」進出名單可綁車牌（避免寫入主檔卻不在此地點可見）
			const res = await personnelApi.getLocationMembers(locationId, {
				limit: 500,
				offset: 0,
			})
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

	const pushPersonPlatesToDevices = async (
		locationId: number,
		personId: number,
		plates: ReturnType<typeof licensePlateItemsToPayload>,
	) => {
		await personnelApi.replacePersonLicensePlates(personId, plates, { syncToDevices: true })
		await ensurePlates(locationId)
	}

	const openPlateForm = async (
		row?: LocationLicensePlateRow,
		locationId?: number,
		temporaryRow?: LocationTemporaryLicensePlate,
		addBindMode: "bound" | "temporary" = "bound",
	) => {
		plateFormError.value = ""
		editingPlateRow.value = row ?? null
		editingTemporaryRow.value = temporaryRow ?? null
		if (temporaryRow) {
			plateFormMode.value = "modify"
			plateForm.value = isapiPlateFormFromTemporaryRow(temporaryRow)
		} else if (row) {
			plateFormMode.value = "modify"
			plateForm.value = isapiPlateFormFromLocationRow(row)
		} else {
			plateFormMode.value = "add"
			plateForm.value = createDefaultIsapiPlateForm(addBindMode)
		}
		showPlateForm.value = true
		if (locationId != null && plateForm.value.bindMode === "bound") {
			await loadPersonBindOptions(locationId)
		} else {
			personBindOptions.value = []
		}
	}

	/** 表單切換類型為綁定人員時重載選項 */
	const ensurePersonBindOptions = loadPersonBindOptions

	const cancelPlateForm = () => {
		plateFormError.value = ""
		showPlateForm.value = false
		editingPlateRow.value = null
		editingTemporaryRow.value = null
	}

	const resolvePersonIdFromForm = (): number | null => {
		const n = Number.parseInt(plateForm.value.bindPersonId?.trim() || "", 10)
		if (Number.isFinite(n)) return n
		return editingPlateRow.value?.person_id ?? null
	}

	const openSyncWarningsAfterMutation = (locationId: number) => {
		refreshSyncWarnings(locationId)
		if (syncWarnings.value.length > 0) {
			notifyError(`同步完成（含 ${syncWarnings.value.length} 筆警告）`)
			showWarningsDialog.value = true
			return true
		}
		return false
	}

	const saveBoundPlate = async (locationId: number) => {
		const formError = validateIsapiPlateForm(plateForm.value)
		if (formError) {
			plateFormError.value = formError
			return false
		}

		const personId = resolvePersonIdFromForm()
		if (personId == null) {
			plateFormError.value = "請選擇綁定人員"
			return false
		}

		if (
			plateFormMode.value === "modify" &&
			editingPlateRow.value &&
			editingPlateRow.value.person_id !== personId
		) {
			plateFormError.value = "編輯時不可更換綁定人員"
			return false
		}

		const plateItem = {
			plateNumber: plateForm.value.licensePlate.trim(),
			listType: plateForm.value.listType,
			effectiveBegin: plateForm.value.effectiveBeginLocal,
			effectiveEnd: plateForm.value.effectiveEndLocal,
		}

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

		const maxError = validateLicensePlateFormItems(items)
		if (maxError) {
			plateFormError.value = maxError
			return false
		}

		await pushPersonPlatesToDevices(locationId, personId, licensePlateItemsToPayload(items))
		return true
	}

	const saveTemporaryPlate = async (locationId: number) => {
		const validationError = validateIsapiPlateForm(plateForm.value)
		if (validationError) {
			plateFormError.value = validationError
			return false
		}
		const mutation = editingTemporaryRow.value ? "update" : "create"
		await vehicleAccessApi.upsertLocationTemporaryPlate(
			locationId,
			temporaryPlatePayloadFromForm(plateForm.value),
			mutation,
		)
		await ensureTemporaryPlates(locationId)
		return true
	}

	const savePlate = async (locationId: number) => {
		plateFormError.value = ""
		isSavingPlate.value = true
		try {
			const ok =
				plateForm.value.bindMode === "temporary"
					? await saveTemporaryPlate(locationId)
					: await saveBoundPlate(locationId)
			if (!ok) return false
			if (!openSyncWarningsAfterMutation(locationId)) {
				toast.success(TOAST.PERSONNEL_PLATE_SAVED)
			}
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
		try {
			const person = await personnelApi.getPersonById(row.person_id)
			const items = mapPersonLicensePlatesToForm(person).filter(
				(i) => i.plateNumber.trim().toUpperCase() !== row.plate_normalized,
			)
			await pushPersonPlatesToDevices(locationId, row.person_id, licensePlateItemsToPayload(items))
			if (!openSyncWarningsAfterMutation(locationId)) {
				toast.success(TOAST.PERSONNEL_PLATE_DELETED)
			}
			return true
		} catch (e) {
			handleApiError(e, "刪除車牌失敗")
			return false
		}
	}

	const deleteTemporaryPlate = async (
		locationId: number,
		row: LocationTemporaryLicensePlate,
	) => {
		try {
			const result = await vehicleAccessApi.deleteLocationTemporaryPlate(locationId, row.id)
			await ensureTemporaryPlates(locationId)
			const failureCount = Array.isArray(result?.failures) ? result.failures.length : 0
			if (failureCount > 0) {
				notifyError(`平台已刪除，但有 ${failureCount} 台設備移除失敗，請稍後重新同步`)
				refreshSyncWarnings(locationId)
				showWarningsDialog.value = true
			} else if (!openSyncWarningsAfterMutation(locationId)) {
				toast.success(TOAST.PERSONNEL_PLATE_DELETED)
			}
			return true
		} catch (e) {
			handleApiError(e, "刪除臨時車牌失敗")
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
		isPlatesLoading,
		getPlatesError,
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
		ensurePersonBindOptions,
		savePlate,
		deletePlate,
		deleteTemporaryPlate,
		getPlatesForPerson,
		getPlatesForLocation,
		getTemporaryPlatesForLocation,
		resolvePlatesForPerson,
		plateSyncIndicatorsForPerson,
	}
}

export type LocationPlateSync = ReturnType<typeof useLocationPlateSync>
