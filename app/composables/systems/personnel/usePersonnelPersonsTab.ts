import type { Device } from "~/types/device"
import type {
	ImportResult,
	Person,
	PersonCardFormItem,
	PersonFingerprintFormItem,
	PersonLicensePlateFormItem,
} from "~/types/personnel"
import {
	createEmptyFingerprintFormItem,
	fingerprintItemsToPayload,
	fingerprintsJsonForSnapshot,
	mapAccessControlFingerprintsToForm,
	validateFingerprintFormItems,
} from "~/utils/fingerprintFormUtils"
import {
	MAX_PERSON_CARDS,
	cardItemsToPayload,
	cardsJsonForSnapshot,
	createEmptyCardFormItem,
	mapAccessControlCardsToForm,
	validateCardFormItems,
} from "~/utils/cardFormUtils"
import {
	createEmptyLicensePlateFormItem,
	licensePlateItemsToPayload,
	mapPersonLicensePlatesToForm,
	validateLicensePlateFormItems,
} from "~/utils/licensePlateFormUtils"
import {
	type ElevatorLocationFloorOption,
	type LadderFloorDefaultsByLocation,
	type PersonLadderLocationFormItem,
	remapLegacyLadderFloorKey,
	buildElevatorLocationFloorOptions,
	createEmptyLadderLocationFormItem,
	hasAnyLadderFloorSelection,
	ladderFloorFormMapToPayload,
	mapLadderCardFloorsToForm,
	mapLadderFloorsToLocationItems,
	personHasLadderCard,
} from "~/utils/ladderFloorFormUtils"
import { useElevatorLocationApi } from "~/composables/location/api/useElevatorLocationApi"
import { useLicense } from "~/composables/core/useLicense"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import {
	useAccessControlApi,
	type CaptureFaceResult,
} from "~/composables/systems/accessControl/useAccessControlApi"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { base64ToFile, handleImageError } from "~/utils/imageUtils"
import {
	getAccessControlConfigSummary,
	isPersonSaveRequestTimeout,
	PERSON_SAVE_TIMEOUT_MESSAGE,
	revokeObjectUrl,
	updatePersonInList as updatePersonInListHelper,
} from "~/utils/personnelUtils"
import { usePersonsList } from "~/composables/systems/personnel/usePersonsList"
import { parsePersonGroupIdFromForm } from "~/utils/personnelGroups"
import { resolveFormApiError } from "~/utils/errorUtils"
import {
	PERSONNEL_API_ERROR_OPTS,
	type PersonnelHandleApiError,
} from "~/composables/systems/personnel/usePersonnelApi"
import { getPrevOffset } from "~/composables/systems/personnel/personnelList"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"

type DeviceApi = ReturnType<typeof useDeviceApi>
type AccessControlApi = ReturnType<typeof useAccessControlApi>

/** 人員大頭照大小上限（與後端 PERSONNEL_FACE_MAX_BYTES 一致） */
export const PERSONNEL_FACE_MAX_BYTES = 512 * 1024

/** 人員大頭照裁切 Dialog（PersonnelPersonsTab + ImageCropDialog） */
export const PERSONNEL_FACE_CROP_DIALOG_PROPS = {
	title: "上傳大頭照",
	description: `圖片用於臉型比對或臉型驗證，建議上傳五官清晰正面照（≤ ${PERSONNEL_FACE_MAX_BYTES / 1024}KB）。`,
	canvasWidth: 520,
	canvasHeight: 520,
	mask: "ellipse" as const,
	maxOutputBytes: PERSONNEL_FACE_MAX_BYTES,
	outputMaxLongEdge: 320,
}

const PERSON_DIALOG_UNSAVED_CLOSE_CONFIRM = {
	title: "確認關閉",
	message: "您有未保存的變更，確定要關閉嗎？",
	details: "未保存的變更將會遺失。",
	type: "warning" as const,
}

type PersonDialogSnapshot = {
	employeeNo: string
	fullName: string
	status: "active" | "inactive"
	faceUrl: string
	personGroupId: string
	licensePlateItemsJson: string
	password: string
	isLongTerm: boolean
	validBeginDate: string
	validEndDate: string
	cardItemsJson: string
	fingerPrintItemsJson: string
	hasPendingFace: boolean
	ladderFloorsJson: string
}

const normalizeLicensePlatesForSnapshot = (items: PersonLicensePlateFormItem[]) =>
	items
		.filter((i) => i.plateNumber.trim())
		.map((i) => ({
		plateNumber: i.plateNumber.trim(),
		listType: i.listType,
		effectiveBegin: i.effectiveBegin,
		effectiveEnd: i.effectiveEnd,
	}))

export const usePersonnelPersonsTab = (params: {
	personnelApi: PersonnelApi
	deviceApi: DeviceApi
	accessControlApi: AccessControlApi
	toast: { success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void }
	handleApiError: PersonnelHandleApiError
}) => {
	const { personnelApi, deviceApi, accessControlApi, toast, handleApiError } = params
	const { canLoadFeature, fetchLicense, isLoaded } = useLicense()
	const personsList = usePersonsList({ personnelApi, handleApiError, pageSize: 10 })
	const {
		PAGE_SIZE,
		persons,
		isLoadingPersons,
		personsLoadError,
		personFilter,
		groupFilter,
		personsTotal,
		personsOffset,
		employeeNoSortOptions,
		selectedEmployeeNoSort,
		loadPersons,
		handleSearch,
		setGroupFilterAll,
		setGroupFilterUngrouped,
		setGroupFilterByMainGroupId,
		setGroupFilterByChildGroupId,
		goPrevPage,
		goNextPage,
	} = personsList

	const showPersonDialog = ref(false)
	const editingPerson = ref<Person | null>(null)
	const isSubmitting = ref(false)
	const errorMessage = ref<string | null>(null)

	const personForm = reactive<{
		employeeNo: string
		fullName: string
		status: "active" | "inactive"
		faceUrl: string
		personGroupId: string
		licensePlateItems: PersonLicensePlateFormItem[]
	}>({
		employeeNo: "",
		fullName: "",
		status: "active",
		faceUrl: "",
		personGroupId: "",
		licensePlateItems: [],
	})

	const { resolveDirectUrl } = useImageCenter()
	const getFaceImageSrc = (url: string | null | undefined): string | null => {
		if (!url) return null
		if (url.startsWith("data:")) return url
		const normalized = url.startsWith("/") ? url : `/${url}`
		return resolveDirectUrl(normalized)
	}

	const pendingFaceFile = ref<File | null>(null)
	const facePreviewObjectUrl = ref<string | null>(null)
	const showFaceCropDialog = ref(false)
	const faceCropSourceFile = ref<File | null>(null)

	const getPersonAccessControlDataSummary = (p: Person) => {
		const ac = getAccessControlConfigSummary(p)
		const hasFace = Boolean(getFaceImageSrc(p.face_url))
		const hasPassword = Boolean(ac.password?.trim())
		const hasCard = Boolean(ac.cards?.length || ac.cardNo?.trim())
		const hasFingerprint = Boolean(ac.fingerPrintItems?.length || ac.fingerPrintData?.trim())
		const plateCount =
			p.license_plate_count ?? p.license_plates?.filter(pl => pl.plate_number?.trim()).length ?? 0
		const hasLicensePlate = plateCount > 0
		const hasLadderCard = personHasLadderCard(p)
		return { hasFace, hasPassword, hasCard, hasFingerprint, hasLicensePlate, hasLadderCard }
	}

	const accessControlDevices = ref<Device[]>([])
	const captureDeviceId = ref<number | null>(null)
	const isCapturingFace = ref(false)
	const captureErrorMessage = ref<string | null>(null)

	const cardDeviceId = ref<number | null>(null)
	const isCapturingCard = ref(false)
	const cardErrorMessage = ref<string | null>(null)
	const cardItems = ref<PersonCardFormItem[]>([createEmptyCardFormItem()])
	const isGeneratingVirtualCard = ref(false)

	const fingerDeviceId = ref<number | null>(null)
	const fingerPrintItems = ref<PersonFingerprintFormItem[]>([
		createEmptyFingerprintFormItem(),
	])
	const isCapturingFingerPrint = ref(false)
	const fingerPrintErrorMessage = ref<string | null>(null)

	const isLongTerm = ref<boolean>(true)
	const validBeginDate = ref<string>("")
	const validEndDate = ref<string>("")
	const personPassword = ref<string>("")

	const elevatorLocationApi = useElevatorLocationApi()
	const elevatorLocationOptions = ref<ElevatorLocationFloorOption[]>([])
	const ladderFloorDefaultsByLocation = ref<LadderFloorDefaultsByLocation>({})
	const ladderLocationItems = ref<PersonLadderLocationFormItem[]>([
		createEmptyLadderLocationFormItem(),
	])
	const resetLadderCardForm = () => {
		ladderFloorDefaultsByLocation.value = {}
		ladderLocationItems.value = [createEmptyLadderLocationFormItem()]
	}

	const applyLadderCardToForm = (card: Person["ladder_card"]) => {
		const firstLocationId = elevatorLocationOptions.value[0]?.id
		const map = remapLegacyLadderFloorKey(mapLadderCardFloorsToForm(card), firstLocationId)
		ladderFloorDefaultsByLocation.value = map
		ladderLocationItems.value = mapLadderFloorsToLocationItems(map)
	}

	const addLadderLocationRow = () => {
		ladderLocationItems.value.push(createEmptyLadderLocationFormItem())
	}

	const removeLadderLocationRow = (index: number) => {
		if (ladderLocationItems.value.length <= 1) return
		const removed = ladderLocationItems.value[index]
		if (removed?.locationId) {
			const locId = Number(removed.locationId)
			if (Number.isFinite(locId) && locId > 0) {
				const next = { ...ladderFloorDefaultsByLocation.value }
				delete next[locId]
				ladderFloorDefaultsByLocation.value = next
			}
		}
		ladderLocationItems.value.splice(index, 1)
	}

	const loadElevatorLocationOptions = async () => {
		if (!isLoaded.value) await fetchLicense()
		if (!canLoadFeature("elevator")) {
			elevatorLocationOptions.value = []
			return
		}
		try {
			const { zones } = await elevatorLocationApi.getZones()
			elevatorLocationOptions.value = buildElevatorLocationFloorOptions(zones || [])
		} catch {
			elevatorLocationOptions.value = []
		}
	}

	const toggleLadderFloor = (locationId: number, floorIndex: number, checked: boolean) => {
		const current = new Set(ladderFloorDefaultsByLocation.value[locationId] || [])
		if (checked) current.add(floorIndex)
		else current.delete(floorIndex)
		ladderFloorDefaultsByLocation.value = {
			...ladderFloorDefaultsByLocation.value,
			[locationId]: [...current].sort((a, b) => a - b),
		}
	}

	const isLadderFloorChecked = (locationId: number, floorIndex: number) =>
		(ladderFloorDefaultsByLocation.value[locationId] || []).includes(floorIndex)

	const personDialogSnapshot = ref<PersonDialogSnapshot | null>(null)
	const personCloseConfirm = useConfirmDialog()

	const buildPersonDialogSnapshot = (): PersonDialogSnapshot => ({
		employeeNo: personForm.employeeNo.trim(),
		fullName: personForm.fullName.trim(),
		status: personForm.status,
		faceUrl: personForm.faceUrl.trim(),
		personGroupId: personForm.personGroupId,
		licensePlateItemsJson: JSON.stringify(
			normalizeLicensePlatesForSnapshot(personForm.licensePlateItems),
		),
		password: personPassword.value.trim(),
		isLongTerm: isLongTerm.value,
		validBeginDate: validBeginDate.value,
		validEndDate: validEndDate.value,
		cardItemsJson: cardsJsonForSnapshot(cardItems.value),
		fingerPrintItemsJson: fingerprintsJsonForSnapshot(fingerPrintItems.value),
		hasPendingFace: pendingFaceFile.value != null || facePreviewObjectUrl.value != null,
		ladderFloorsJson: JSON.stringify(ladderFloorDefaultsByLocation.value),
	})

	const capturePersonDialogSnapshot = () => {
		personDialogSnapshot.value = buildPersonDialogSnapshot()
	}

	const personChangedFieldsList = computed(() => {
		const snap = personDialogSnapshot.value
		if (!snap) return []
		const cur = buildPersonDialogSnapshot()
		const fields: string[] = []
		if (cur.fullName !== snap.fullName) fields.push("姓名")
		if (cur.employeeNo !== snap.employeeNo) fields.push("ID")
		if (cur.status !== snap.status) fields.push("狀態")
		if (cur.personGroupId !== snap.personGroupId) fields.push("群組")
		if (cur.faceUrl !== snap.faceUrl || cur.hasPendingFace !== snap.hasPendingFace) {
			fields.push("大頭照")
		}
		if (cur.password !== snap.password) fields.push("密碼設定")
		if (
			cur.isLongTerm !== snap.isLongTerm ||
			cur.validBeginDate !== snap.validBeginDate ||
			cur.validEndDate !== snap.validEndDate
		) {
			fields.push("有效期限")
		}
		if (cur.cardItemsJson !== snap.cardItemsJson) fields.push("卡號")
		if (cur.fingerPrintItemsJson !== snap.fingerPrintItemsJson) fields.push("指紋")
		if (cur.licensePlateItemsJson !== snap.licensePlateItemsJson) fields.push("車牌設定")
		if (cur.ladderFloorsJson !== snap.ladderFloorsJson) fields.push("梯控樓層")
		return fields
	})

	const isAccessControlSectionDirty = computed(() =>
		personChangedFieldsList.value.some((f) =>
			["密碼設定", "有效期限", "卡號", "指紋"].includes(f),
		),
	)

	const hasUnsavedPersonChanges = computed(() => personChangedFieldsList.value.length > 0)

	const closePersonDialog = () => {
		showPersonDialog.value = false
	}

	const requestClosePersonDialog = () => {
		if (hasUnsavedPersonChanges.value) {
			personCloseConfirm.show(PERSON_DIALOG_UNSAVED_CLOSE_CONFIRM)
			return
		}
		closePersonDialog()
	}

	const confirmPersonDialogDismiss = () => {
		closePersonDialog()
	}

	const updatePersonInList = (next: Person) => {
		editingPerson.value = updatePersonInListHelper({
			people: persons.value,
			next,
			editingPerson: editingPerson.value,
		})
	}

	const loadAccessControlDevices = async () => {
		try {
			const res = await deviceApi.getDevices({ type_code: "access_control", limit: 200, offset: 0 })
			accessControlDevices.value = Array.isArray(res?.devices) ? res.devices : []
		} catch (err) {
			handleApiError(err, "載入門禁設備失敗")
			accessControlDevices.value = []
		}
	}

	const personFormFacePreview = computed(() => {
		if (facePreviewObjectUrl.value) return facePreviewObjectUrl.value
		const u = personForm.faceUrl?.trim()
		if (!u) return null
		if (u.startsWith("data:")) return u
		return getFaceImageSrc(u)
	})

	const revokeFacePreviewUrl = () => {
		revokeObjectUrl(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = null
	}

	const openFaceCrop = (file: File) => {
		faceCropSourceFile.value = file
		showFaceCropDialog.value = true
	}

	const applyCroppedFace = async (file: File) => {
		if (!file) return
		pendingFaceFile.value = file
		revokeFacePreviewUrl()
		facePreviewObjectUrl.value = URL.createObjectURL(file)
	}

	const clearFaceUrl = async () => {
		personForm.faceUrl = ""
		pendingFaceFile.value = null
		faceCropSourceFile.value = null
		showFaceCropDialog.value = false
		revokeFacePreviewUrl()
	}

	const handleFaceFileChange = async (file: File) => {
		if (!file) return

		const mimeType = String(file.type || "").toLowerCase()
		if (!mimeType.startsWith("image/")) {
			toast.error("請選擇圖片檔案")
			return
		}
		openFaceCrop(file)
	}

	const resetPersonDialogState = () => {
		pendingFaceFile.value = null
		captureDeviceId.value = null
		captureErrorMessage.value = null
		cardDeviceId.value = null
		cardErrorMessage.value = null
		cardItems.value = [createEmptyCardFormItem()]
		isGeneratingVirtualCard.value = false
		fingerDeviceId.value = null
		fingerPrintItems.value = [createEmptyFingerprintFormItem()]
		fingerPrintErrorMessage.value = null
		isLongTerm.value = true
		validBeginDate.value = ""
		validEndDate.value = ""
		personPassword.value = ""
		resetLadderCardForm()
		revokeFacePreviewUrl()
		errorMessage.value = null
	}

	const resetCaptureState = () => {
		captureDeviceId.value = null
		captureErrorMessage.value = null
		cardDeviceId.value = null
		cardErrorMessage.value = null
		fingerDeviceId.value = null
		fingerPrintErrorMessage.value = null
		isCapturingFace.value = false
		isCapturingCard.value = false
		isCapturingFingerPrint.value = false
	}

	const openPersonCreate = () => {
		editingPerson.value = null
		personForm.employeeNo = ""
		personForm.fullName = ""
		personForm.status = "active"
		personForm.faceUrl = ""
		personForm.personGroupId = ""
		personForm.licensePlateItems = [createEmptyLicensePlateFormItem()]
		resetPersonDialogState()
		void loadAccessControlDevices()
		void loadElevatorLocationOptions()
		capturePersonDialogSnapshot()
		showPersonDialog.value = true
	}

	const applyPersonToEditForm = (p: Person) => {
		editingPerson.value = p
		personForm.employeeNo = p.employee_no
		personForm.fullName = p.full_name ?? ""
		personForm.status = p.status === "active" ? "active" : "inactive"
		personForm.faceUrl = p.face_url ?? ""
		personForm.personGroupId =
			p.person_group_id != null && Number.isFinite(Number(p.person_group_id))
				? String(Math.trunc(Number(p.person_group_id)))
				: ""
		resetCaptureState()
		const plates = mapPersonLicensePlatesToForm(p)
		personForm.licensePlateItems =
			plates.length > 0 ? plates : [createEmptyLicensePlateFormItem()]
		const ac = getAccessControlConfigSummary(p)
		cardItems.value = mapAccessControlCardsToForm(p)
		fingerPrintItems.value = mapAccessControlFingerprintsToForm(p)
		isLongTerm.value = ac.isLongTerm
		validBeginDate.value = ac.validBeginDate
		validEndDate.value = ac.validEndDate
		personPassword.value = ac.password
	}

	const editPerson = async (p: Person) => {
		let full: Person
		try {
			full = await personnelApi.getPersonById(p.id)
		} catch (err) {
			handleApiError(err, "載入人員資料失敗", PERSONNEL_API_ERROR_OPTS)
			return
		}
		applyPersonToEditForm(full)
		void loadAccessControlDevices()
		await loadElevatorLocationOptions()
		applyLadderCardToForm(full.ladder_card)
		capturePersonDialogSnapshot()
		showPersonDialog.value = true
	}

	const handleCaptureFace = async () => {
		captureErrorMessage.value = null
		const deviceId = captureDeviceId.value
		if (!deviceId) {
			captureErrorMessage.value = "請先選擇門禁設備"
			return
		}

		isCapturingFace.value = true
		try {
			const result = await accessControlApi.captureFace(deviceId, {
				captureInfrared: true,
				readerID: 1,
			})
			if (result.dataType !== "binary" || !result.base64)
				throw new Error("設備截圖回傳格式不正確")

			const file = base64ToFile({
				base64: result.base64,
				mimeType: result.contentType || "image/jpeg",
				filename: `capture_${Date.now()}.jpg`,
			})

			await handleFaceFileChange(file)
		} catch (err) {
			captureErrorMessage.value = handleApiError(err, "設備截圖失敗") || "設備截圖失敗"
		} finally {
			isCapturingFace.value = false
		}
	}

	const extractCardNoFromCapture = (raw: unknown): string | null => {
		if (!raw || typeof raw !== "object") return null
		const visited = new Set<unknown>()
		const stack: unknown[] = [raw]
		while (stack.length > 0) {
			const cur = stack.pop()
			if (!cur || typeof cur !== "object") continue
			if (visited.has(cur)) continue
			visited.add(cur)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const obj: any = cur
			const val = obj.cardNo ?? obj.CardNo ?? obj.cardNO
			if (typeof val === "string" && val.trim()) return val.trim()
			if (typeof val === "number" && Number.isFinite(val)) return String(val)
			for (const v of Object.values(obj)) stack.push(v)
		}
		return null
	}

	const resolveTargetTabIndex = (
		itemsLength: number,
		preferredIndex: number | undefined,
		max: number,
	): number | null => {
		if (itemsLength >= max) return null
		if (
			preferredIndex != null &&
			preferredIndex >= 0 &&
			preferredIndex < itemsLength
		) {
			return preferredIndex
		}
		return itemsLength > 0 ? itemsLength - 1 : 0
	}

	const handleCaptureCard = async (preferredTabIndex?: number) => {
		cardErrorMessage.value = null
		const deviceId = cardDeviceId.value
		if (!deviceId) {
			cardErrorMessage.value = "請先選擇門禁設備"
			return
		}

		isCapturingCard.value = true
		try {
			const raw = await accessControlApi.captureCard(deviceId)
			const extracted = extractCardNoFromCapture(raw)
			if (!extracted) {
				cardErrorMessage.value = "讀卡失敗：找不到卡號"
				return
			}
			let targetIdx = resolveTargetTabIndex(
				cardItems.value.length,
				preferredTabIndex,
				MAX_PERSON_CARDS,
			)
			if (targetIdx == null) {
				cardErrorMessage.value = `卡號最多 ${MAX_PERSON_CARDS} 張`
				return
			}
			if (targetIdx >= cardItems.value.length) {
				cardItems.value.push(createEmptyCardFormItem())
				targetIdx = cardItems.value.length - 1
			}
			cardItems.value[targetIdx] = { cardNo: extracted, source: "captured" }
		} catch (err) {
			cardErrorMessage.value = handleApiError(err, "讀卡失敗") || "讀卡失敗"
		} finally {
			isCapturingCard.value = false
		}
	}

	const handleGenerateVirtualCard = async (preferredTabIndex?: number) => {
		cardErrorMessage.value = null
		isGeneratingVirtualCard.value = true
		try {
			const res = await personnelApi.generateVirtualCard()
			const cardNo = String(res?.cardNo || "").trim()
			if (!cardNo) {
				cardErrorMessage.value = "虛擬卡號產生失敗"
				return
			}
			let targetIdx = resolveTargetTabIndex(
				cardItems.value.length,
				preferredTabIndex,
				MAX_PERSON_CARDS,
			)
			if (targetIdx == null) {
				cardErrorMessage.value = `卡號最多 ${MAX_PERSON_CARDS} 張`
				return
			}
			if (targetIdx >= cardItems.value.length) {
				cardItems.value.push(createEmptyCardFormItem())
				targetIdx = cardItems.value.length - 1
			}
			cardItems.value[targetIdx] = { cardNo, source: "virtual" }
		} catch (err) {
			cardErrorMessage.value =
				handleApiError(err, "虛擬卡號產生失敗") || "虛擬卡號產生失敗"
		} finally {
			isGeneratingVirtualCard.value = false
		}
	}

	const handleCaptureFingerPrint = async (preferredTabIndex?: number) => {
		fingerPrintErrorMessage.value = null
		const deviceId = fingerDeviceId.value
		if (!deviceId) {
			fingerPrintErrorMessage.value = "請先選擇門禁設備"
			return
		}

		isCapturingFingerPrint.value = true
		try {
			const fingerNo =
				(preferredTabIndex != null && preferredTabIndex >= 0
					? preferredTabIndex
					: fingerPrintItems.value.length - 1) + 1
			const res = await accessControlApi.captureFingerPrint(deviceId, { fingerNo })
			const next = String(res?.base64 || "").trim()
			if (!next) {
				fingerPrintErrorMessage.value = "讀取指紋失敗：找不到指紋資料"
				return
			}
			let targetIdx = resolveTargetTabIndex(
				fingerPrintItems.value.length,
				preferredTabIndex,
				5,
			)
			if (targetIdx == null) {
				fingerPrintErrorMessage.value = "指紋最多 5 筆"
				return
			}
			if (targetIdx >= fingerPrintItems.value.length) {
				fingerPrintItems.value.push(createEmptyFingerprintFormItem())
				targetIdx = fingerPrintItems.value.length - 1
			}
			fingerPrintItems.value[targetIdx] = { fingerData: next, source: "captured" }
		} catch (err) {
			fingerPrintErrorMessage.value =
				handleApiError(err, "讀取指紋失敗") || "讀取指紋失敗"
		} finally {
			isCapturingFingerPrint.value = false
		}
	}

	const toBeginTime = (dateStr: string) => {
		const s = String(dateStr || "").trim()
		if (!s) return ""
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`
		return s
	}

	const toEndTime = (dateStr: string) => {
		const s = String(dateStr || "").trim()
		if (!s) return ""
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T23:59:59`
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:59`
		return s
	}

	const todayDateString = () => new Date().toISOString().slice(0, 10)

	const saveAccessControlExtras = async (personId: number) => {
		const validity = isLongTerm.value
			? {
					longTerm: true,
					beginTime: toBeginTime(todayDateString()),
					endTime: toEndTime("2035-12-31"),
				}
			: {
					longTerm: false,
					beginTime: toBeginTime(validBeginDate.value),
					endTime: toEndTime(validEndDate.value),
				}

		if (!validity.beginTime || !validity.endTime) throw new Error("請設定有效的起始日與結束日")

		const res = await personnelApi.setPersonAccessControlConfig(personId, {
			validity,
			cards: cardItemsToPayload(cardItems.value),
			fingerprints: fingerprintItemsToPayload(fingerPrintItems.value),
			password: personPassword.value.trim() ? personPassword.value.trim() : null,
		})
		if (res?.person) updatePersonInList(res.person)
	}

	type SavePersonTransactionMode = "create" | "update"

	const validatePersonFormForSave = (input: {
		fullName: string
		employeeNo: string
		mode: SavePersonTransactionMode
		licensePlateItems: PersonLicensePlateFormItem[]
		cardItems: PersonCardFormItem[]
		fingerPrintItems: PersonFingerprintFormItem[]
		personGroupId: string
	}): string | null => {
		if (!input.fullName.trim()) return "姓名為必填"
		if (input.mode === "create" && !input.employeeNo.trim()) return "ID 為必填"

		const licensePlateError = validateLicensePlateFormItems(input.licensePlateItems)
		if (licensePlateError) return licensePlateError

		const cardError = validateCardFormItems(input.cardItems)
		if (cardError) return cardError

		const fingerprintError = validateFingerprintFormItems(input.fingerPrintItems)
		if (fingerprintError) return fingerprintError

		const parsedGroup = parsePersonGroupIdFromForm(input.personGroupId)
		if (!parsedGroup.ok) return "群組選擇無效"

		return null
	}

	const savePersonTransaction = async (mode: SavePersonTransactionMode) => {
		const fail = (err: unknown, fallback: string) => {
			errorMessage.value = resolveFormApiError(err, fallback)
		}

		const formError = validatePersonFormForSave({
			fullName: personForm.fullName,
			employeeNo: personForm.employeeNo,
			mode,
			licensePlateItems: personForm.licensePlateItems,
			cardItems: cardItems.value,
			fingerPrintItems: fingerPrintItems.value,
			personGroupId: personForm.personGroupId,
		})
		if (formError) {
			errorMessage.value = formError
			return { ok: false as const }
		}

		isSubmitting.value = true
		errorMessage.value = null
		try {
			const parsedGroup = parsePersonGroupIdFromForm(personForm.personGroupId)
			const personGroupId = parsedGroup.ok ? parsedGroup.personGroupId : null
			const snap = personDialogSnapshot.value
			const currentPlatesJson = JSON.stringify(
				normalizeLicensePlatesForSnapshot(personForm.licensePlateItems),
			)
			const licensePlatesDirty =
				mode === "create"
					? licensePlateItemsToPayload(personForm.licensePlateItems).length > 0
					: snap != null && currentPlatesJson !== snap.licensePlateItemsJson

			let saved: Person
			if (mode === "update") {
				const personId = editingPerson.value?.id ?? null
				if (!personId) {
					errorMessage.value = "找不到要更新的人員"
					return { ok: false as const }
				}
				saved = await personnelApi.updatePerson(personId, {
					fullName: personForm.fullName || null,
					status: personForm.status,
					faceUrl: personForm.faceUrl.trim() || null,
					personGroupId,
				})
			} else {
				saved = await personnelApi.createPerson({
					employeeNo: personForm.employeeNo.trim(),
					fullName: personForm.fullName.trim(),
					status: personForm.status,
					personGroupId,
				})
			}

			const effectivePersonId = saved.id

			if (licensePlatesDirty) {
				try {
					await personnelApi.replacePersonLicensePlates(
						effectivePersonId,
						licensePlateItemsToPayload(personForm.licensePlateItems),
					)
				} catch (err) {
					fail(err, "儲存車牌設定失敗")
					return { ok: false as const }
				}
			}

			if (isAccessControlSectionDirty.value) {
				try {
					await saveAccessControlExtras(effectivePersonId)
				} catch (err) {
					fail(err, "儲存門禁設定失敗")
					return { ok: false as const }
				}
			}

			try {
				if (!hasAnyLadderFloorSelection(ladderFloorDefaultsByLocation.value)) {
					await personnelApi.replacePersonLadderCard(effectivePersonId, { clear: true })
				} else {
					if (!cardItemsToPayload(cardItems.value).length) {
						errorMessage.value = "請於門禁設定填寫卡號"
						return { ok: false as const }
					}
					await personnelApi.replacePersonLadderCard(effectivePersonId, {
						floors: ladderFloorFormMapToPayload(ladderFloorDefaultsByLocation.value),
					})
				}
			} catch (err) {
				fail(err, "儲存梯控卡設定失敗")
				return { ok: false as const }
			}

			if (pendingFaceFile.value) {
				try {
					const uploadRes = await personnelApi.uploadFaceForPerson(
						effectivePersonId,
						pendingFaceFile.value
					)
					pendingFaceFile.value = null
					revokeFacePreviewUrl()
					if (uploadRes?.faceUrl) personForm.faceUrl = uploadRes.faceUrl
					if (uploadRes?.person) updatePersonInList(uploadRes.person)
				} catch (err) {
					fail(err, "上傳大頭照失敗")
					return { ok: false as const }
				}
			}

			if (mode === "create") personsOffset.value = 0
			const plateHint = licensePlatesDirty
				? "車牌已存平台；請至車牌管理同步至攝影機。"
				: ""
			toast.success(
				mode === "update"
					? `已更新人員。${plateHint}請至門禁管理設定地點名單並同步門禁設備。`.trim()
					: `已新增人員。${plateHint}請至門禁管理設定地點名單並同步門禁設備。`.trim(),
			)
			showPersonDialog.value = false
			void loadPersons()
			return { ok: true as const }
		} catch (err) {
			if (isPersonSaveRequestTimeout(err)) {
				await loadPersons()
				errorMessage.value = PERSON_SAVE_TIMEOUT_MESSAGE
				return { ok: false as const }
			}
			fail(err, "儲存失敗")
			return { ok: false as const }
		} finally {
			isSubmitting.value = false
		}
	}

	const submitPerson = async () => {
		if (editingPerson.value) await savePersonTransaction("update")
		else await savePersonTransaction("create")
	}

	const deletePerson = async (p: Person) => {
		try {
			await personnelApi.deletePerson(p.id)
			await loadPersons()
			// 若當前頁資料被刪光且不在第一頁，回到上一頁避免列表為空
			if (personsOffset.value > 0 && persons.value.length === 0) {
				personsOffset.value = getPrevOffset({ offset: personsOffset.value, limit: PAGE_SIZE })
				await loadPersons()
			}
			toast.success("已刪除人員")
		} catch (err) {
			handleApiError(err, "刪除人員失敗", PERSONNEL_API_ERROR_OPTS)
		}
	}

	const showImportDialog = ref(false)
	const importError = ref("")
	const importResult = ref<ImportResult | null>(null)
	const isImporting = ref(false)

	const submitImport = async (payload: { excel: File; imagesZip: File | null }) => {
		importError.value = ""
		importResult.value = null
		isImporting.value = true
		try {
			const form = new FormData()
			form.append("excel", payload.excel)
			if (payload.imagesZip) form.append("imagesZip", payload.imagesZip)
			const result = await personnelApi.importPersons(form)
			importResult.value = result
			if (result.errors?.length) {
				toast.warning(`匯入完成，但有 ${result.errors.length} 筆錯誤，請查看下方明細`)
			}
			if (result.created > 0) {
				toast.success(`已匯入 ${result.created} 筆`)
				void loadPersons()
			} else if (!result.errors?.length) {
				toast.warning("未匯入任何資料")
			}
		} catch (err) {
			importError.value =
				handleApiError(err, "匯入失敗", PERSONNEL_API_ERROR_OPTS) || "匯入失敗"
		} finally {
			isImporting.value = false
		}
	}

	watch(showPersonDialog, (v) => {
		if (v) return
		revokeFacePreviewUrl()
		editingPerson.value = null
		errorMessage.value = null
		personDialogSnapshot.value = null
	})

	watch(showImportDialog, (v) => {
		if (!v) return
		importError.value = ""
		importResult.value = null
	})

	return {
		// list state
		persons,
		isLoadingPersons,
		personsLoadError,
		personFilter,
		groupFilter,
		PAGE_SIZE,
		personsTotal,
		personsOffset,
		selectedEmployeeNoSort,
		employeeNoSortOptions,

		// list actions
		loadPersons,
		handleSearch,
		setGroupFilterAll,
		setGroupFilterUngrouped,
		setGroupFilterByMainGroupId,
		setGroupFilterByChildGroupId,
		goPrevPage,
		goNextPage,

		// dialog state
		showPersonDialog,
		editingPerson,
		personForm,
		accessControlDevices,
		captureDeviceId,
		isCapturingFace,
		captureErrorMessage,
		cardDeviceId,
		isCapturingCard,
		cardErrorMessage,
		cardItems,
		isGeneratingVirtualCard,
		handleGenerateVirtualCard,
		fingerDeviceId,
		fingerPrintItems,
		elevatorLocationOptions,
		ladderLocationItems,
		ladderFloorDefaultsByLocation,
		toggleLadderFloor,
		isLadderFloorChecked,
		addLadderLocationRow,
		removeLadderLocationRow,
		isLongTerm,
		validBeginDate,
		validEndDate,
		personPassword,
		isCapturingFingerPrint,
		fingerPrintErrorMessage,
		personFormFacePreview,
		showFaceCropDialog,
		faceCropSourceFile,
		faceCropDialogProps: PERSONNEL_FACE_CROP_DIALOG_PROPS,
		isSubmitting,
		errorMessage,
		hasUnsavedPersonChanges,
		personChangedFieldsList,
		requestClosePersonDialog,
		showPersonCloseConfirmDialog: personCloseConfirm.showDialog,
		personCloseConfirmConfig: personCloseConfirm.config,
		confirmPersonDialogDismiss,

		// dialog actions
		openPersonCreate,
		editPerson,
		submitPerson,
		deletePerson,
		handleFaceFileChange,
		applyCroppedFace,
		clearFaceUrl,
		handleCaptureFace,
		handleCaptureCard,
		handleCaptureFingerPrint,

		// helpers for UI
		getFaceImageSrc,
		handleImageError,
		getPersonAccessControlDataSummary,

		// import dialog
		showImportDialog,
		importError,
		importResult,
		isImporting,
		submitImport,
	}
}
