import type { Device } from "~/types/device"
import type { ImportResult, Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useAccessControlApi, type CaptureFaceResult } from "~/composables/systems/accessControl/useAccessControlApi"
import { base64ToFile, handleImageError } from "~/utils/imageUtils"
import {
	getAccessControlConfigSummary,
	revokeObjectUrl,
	updatePersonInList as updatePersonInListHelper,
} from "~/utils/personnelUtils"

type DeviceApi = ReturnType<typeof useDeviceApi>
type AccessControlApi = ReturnType<typeof useAccessControlApi>

export const usePersonnelPersonsTab = (params: {
	personnelApi: PersonnelApi
	deviceApi: DeviceApi
	accessControlApi: AccessControlApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: (err: unknown, fallbackMessage: string) => string | void | null
}) => {
	const { personnelApi, deviceApi, accessControlApi, toast, handleApiError } = params

	const persons = ref<Person[]>([])
	const isLoadingPersons = ref(false)
	const personFilter = reactive<{ q: string }>({ q: "" })
	const PAGE_SIZE = 10
	const personsTotal = ref(0)
	const personsOffset = ref(0)

	type EmployeeNoSort = "asc" | "desc"
	const employeeNoSort = ref<EmployeeNoSort>("asc")

	const employeeNoSortOptions = computed(() => [
		{ value: "asc", label: "工號（由小到大）" },
		{ value: "desc", label: "工號（由大到小）" },
	])

	const selectedEmployeeNoSort = computed<string>({
		get: () => employeeNoSort.value,
		set: (v) => {
			const next = (v === "asc" || v === "desc" ? v : "asc") as EmployeeNoSort
			if (next === employeeNoSort.value) return
			employeeNoSort.value = next
			personsOffset.value = 0
			void loadPersons()
		},
	})

	const showPersonDialog = ref(false)
	const editingPerson = ref<Person | null>(null)
	const isSubmitting = ref(false)
	const errorMessage = ref<string | null>(null)

	const personForm = reactive<{
		employeeNo: string
		fullName: string
		status: "active" | "inactive"
		faceUrl: string
	}>({ employeeNo: "", fullName: "", status: "active", faceUrl: "" })

	const config = useRuntimeConfig()
	const getFaceImageSrc = (url: string | null | undefined): string | null => {
		if (!url) return null
		if (url.startsWith("http")) return url
		const normalizedPath = url.startsWith("/") ? url : `/${url}`
		const apiBase = (config.public.apiBase as string) || ""
		if (normalizedPath.startsWith("/uploads/")) return `${apiBase}${normalizedPath}`
		const origin = apiBase.replace(/\/api\/?$/, "")
		return `${origin}${normalizedPath}`
	}

	const pendingFaceFile = ref<File | null>(null)
	const facePreviewObjectUrl = ref<string | null>(null)

	const getPersonAccessControlDataSummary = (p: Person) => {
		const ac = getAccessControlConfigSummary(p)
		const hasPassword = Boolean(ac.password?.trim())
		const hasCard = Boolean(ac.cardNo?.trim())
		const hasFingerprint = Boolean(ac.fingerPrintData?.trim())
		return { hasPassword, hasCard, hasFingerprint }
	}

	const accessControlDevices = ref<Device[]>([])
	const captureDeviceId = ref<number | null>(null)
	const isCapturingFace = ref(false)
	const captureErrorMessage = ref<string | null>(null)

	const cardDeviceId = ref<number | null>(null)
	const isCapturingCard = ref(false)
	const cardErrorMessage = ref<string | null>(null)
	const cardNo = ref<string>("")

	const fingerDeviceId = ref<number | null>(null)
	const fingerPrintData = ref<string>("")
	const isCapturingFingerPrint = ref(false)
	const fingerPrintErrorMessage = ref<string | null>(null)

	const isLongTerm = ref<boolean>(true)
	const validBeginDate = ref<string>("")
	const validEndDate = ref<string>("")
	const personPassword = ref<string>("")

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

	const clearFaceUrl = async () => {
		personForm.faceUrl = ""
		pendingFaceFile.value = null
		revokeFacePreviewUrl()
	}

	const handleFaceFileChange = async (file: File) => {
		if (!file) return

		const mimeType = String(file.type || "").toLowerCase()
		if (mimeType !== "image/jpeg" && mimeType !== "image/jpg") {
			toast.error("大頭照僅支援 JPG（JPEG）格式（設備限制）")
			return
		}
		if (file.size > 200 * 1024) {
			toast.error("大頭照需小於等於 200KB（設備限制）")
			return
		}

		pendingFaceFile.value = file
		if (facePreviewObjectUrl.value) URL.revokeObjectURL(facePreviewObjectUrl.value)
		facePreviewObjectUrl.value = URL.createObjectURL(file)
	}

	const loadPersons = async () => {
		isLoadingPersons.value = true
		try {
			const params = {
				q: personFilter.q?.trim() || undefined,
				sortBy: "employeeNo" as const,
				sortOrder: employeeNoSort.value,
				limit: PAGE_SIZE,
				offset: personsOffset.value,
			}
			const res = await personnelApi.getPersons(params)
			persons.value = res.items
			personsTotal.value = res.total
		} catch (err) {
			handleApiError(err, "載入人員失敗")
			persons.value = []
			personsTotal.value = 0
		} finally {
			isLoadingPersons.value = false
		}
	}

	const handleSearch = () => {
		personsOffset.value = 0
		void loadPersons()
	}

	const goPrevPage = () => {
		if (personsOffset.value === 0) return
		personsOffset.value = Math.max(0, personsOffset.value - PAGE_SIZE)
		void loadPersons()
	}

	const goNextPage = () => {
		if (personsOffset.value + PAGE_SIZE >= personsTotal.value) return
		personsOffset.value = personsOffset.value + PAGE_SIZE
		void loadPersons()
	}

	const resetPersonDialogState = () => {
		pendingFaceFile.value = null
		captureDeviceId.value = null
		captureErrorMessage.value = null
		cardDeviceId.value = null
		cardErrorMessage.value = null
		cardNo.value = ""
		fingerDeviceId.value = null
		fingerPrintData.value = ""
		fingerPrintErrorMessage.value = null
		isLongTerm.value = true
		validBeginDate.value = ""
		validEndDate.value = ""
		personPassword.value = ""
		revokeFacePreviewUrl()
		errorMessage.value = null
	}

	const openPersonCreate = () => {
		editingPerson.value = null
		personForm.employeeNo = ""
		personForm.fullName = ""
		personForm.status = "active"
		personForm.faceUrl = ""
		resetPersonDialogState()
		void loadAccessControlDevices()
		showPersonDialog.value = true
	}

	const editPerson = (p: Person) => {
		editingPerson.value = p
		personForm.employeeNo = p.employee_no
		personForm.fullName = p.full_name ?? ""
		personForm.status = p.status === "active" ? "active" : "inactive"
		personForm.faceUrl = p.face_url ?? ""
		resetPersonDialogState()
		{
			const ac = getAccessControlConfigSummary(p)
			cardNo.value = ac.cardNo
			fingerPrintData.value = ac.fingerPrintData
			isLongTerm.value = ac.isLongTerm
			validBeginDate.value = ac.validBeginDate
			validEndDate.value = ac.validEndDate
			personPassword.value = ac.password
		}
		showPersonDialog.value = true
		void loadAccessControlDevices()
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
			const result: CaptureFaceResult = await accessControlApi.captureFace(deviceId, {
				captureInfrared: true,
				readerID: 1,
			})

			if (result.dataType !== "binary" || !result.base64) throw new Error("設備截圖回傳格式不正確")

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

	const handleCaptureCard = async () => {
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
			cardNo.value = extracted
		} catch (err) {
			cardErrorMessage.value = handleApiError(err, "讀卡失敗") || "讀卡失敗"
		} finally {
			isCapturingCard.value = false
		}
	}

	const handleCaptureFingerPrint = async () => {
		fingerPrintErrorMessage.value = null
		const deviceId = fingerDeviceId.value
		if (!deviceId) {
			fingerPrintErrorMessage.value = "請先選擇門禁設備"
			return
		}

		isCapturingFingerPrint.value = true
		try {
			const res = await accessControlApi.captureFingerPrint(deviceId, { fingerNo: 1 })
			const next = String(res?.base64 || "").trim()
			if (!next) {
				fingerPrintErrorMessage.value = "讀取指紋失敗：找不到指紋資料"
				return
			}
			fingerPrintData.value = next
		} catch (err) {
			fingerPrintErrorMessage.value = handleApiError(err, "讀取指紋失敗") || "讀取指紋失敗"
		} finally {
			isCapturingFingerPrint.value = false
		}
	}

	const toBeginTime = (dateStr: string) => {
		const s = String(dateStr || "").trim()
		if (!s) return ""
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00`
		return s
	}

	const toEndTime = (dateStr: string) => {
		const s = String(dateStr || "").trim()
		if (!s) return ""
		if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T23:59:59`
		return s
	}

	const todayDateString = () => new Date().toISOString().slice(0, 10)

	const saveAccessControlExtras = async (personId: number) => {
		const validity = isLongTerm.value
			? { longTerm: true, beginTime: toBeginTime(todayDateString()), endTime: toEndTime("2035-12-31") }
			: { longTerm: false, beginTime: toBeginTime(validBeginDate.value), endTime: toEndTime(validEndDate.value) }

		if (!validity.beginTime || !validity.endTime) throw new Error("請設定有效期限起始日與結束日")

		const res = await personnelApi.setPersonAccessControlConfig(personId, {
			validity,
			cardNo: cardNo.value.trim() ? cardNo.value.trim() : null,
			fingerData: fingerPrintData.value.trim() ? fingerPrintData.value.trim() : null,
			password: personPassword.value.trim() ? personPassword.value.trim() : null,
		})
		if (res?.person) updatePersonInList(res.person)
	}

	const submitPerson = async () => {
		if (!personForm.fullName.trim()) {
			errorMessage.value = "姓名為必填"
			return
		}

		isSubmitting.value = true
		errorMessage.value = null
		try {
			if (editingPerson.value) {
				const updated = await personnelApi.updatePerson(editingPerson.value.id, {
					fullName: personForm.fullName || null,
					status: personForm.status,
					faceUrl: personForm.faceUrl.trim() || null,
				})
				const personId = editingPerson.value.id
				try {
					await saveAccessControlExtras(personId)
				} catch (err) {
					errorMessage.value = handleApiError(err, "儲存門禁設定失敗") || "儲存門禁設定失敗"
					return
				}
				if (pendingFaceFile.value) {
					try {
						const uploadRes = await personnelApi.uploadFaceForPerson(personId, pendingFaceFile.value)
						pendingFaceFile.value = null
						revokeFacePreviewUrl()
						if (uploadRes?.faceUrl) personForm.faceUrl = uploadRes.faceUrl
						if (uploadRes?.person) updatePersonInList(uploadRes.person)
					} catch (err) {
						errorMessage.value = handleApiError(err, "上傳大頭照失敗") || "上傳大頭照失敗"
						return
					}
				}
				const idx = persons.value.findIndex((x) => x.id === editingPerson.value!.id)
				if (idx > -1) persons.value[idx] = updated
				toast.success("已更新人員")
			} else {
				const created = await personnelApi.createPerson({
					employeeNo: personForm.employeeNo.trim(),
					fullName: personForm.fullName.trim(),
					status: personForm.status,
				})
				try {
					await saveAccessControlExtras(created.id)
				} catch (err) {
					errorMessage.value = handleApiError(err, "儲存門禁設定失敗") || "儲存門禁設定失敗"
					return
				}
				if (pendingFaceFile.value) {
					const uploadRes = await personnelApi.uploadFaceForPerson(created.id, pendingFaceFile.value)
					persons.value.push(uploadRes.person)
					pendingFaceFile.value = null
					revokeFacePreviewUrl()
				} else {
					persons.value.push(created)
				}
				toast.success("已新增人員")
			}
			showPersonDialog.value = false
		} catch (err) {
			errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗"
		} finally {
			isSubmitting.value = false
		}
	}

	const confirmDeletePerson = async (p: Person) => {
		if (!confirm(`確定要刪除人員「${p.employee_no} ${p.full_name || ""}」嗎？`)) return
		try {
			await personnelApi.deletePerson(p.id)
			persons.value = persons.value.filter((x) => x.id !== p.id)
			toast.success("已刪除人員")
		} catch (err) {
			handleApiError(err, "刪除人員失敗")
		}
	}

	// ---------- 批次匯入 ----------
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
			if (result.created > 0) {
				toast.success(`已匯入 ${result.created} 筆`)
				void loadPersons()
			}
			if (result.errors?.length) toast.error(`部分失敗：${result.errors.length} 筆`)
		} catch (err) {
			importError.value = handleApiError(err, "匯入失敗") || "匯入失敗"
		} finally {
			isImporting.value = false
		}
	}

	watch(showPersonDialog, (v) => {
		if (v) return
		revokeFacePreviewUrl()
		editingPerson.value = null
		errorMessage.value = null
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
		personFilter,
		PAGE_SIZE,
		personsTotal,
		personsOffset,
		selectedEmployeeNoSort,
		employeeNoSortOptions,

		// list actions
		loadPersons,
		handleSearch,
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
		cardNo,
		fingerDeviceId,
		fingerPrintData,
		isLongTerm,
		validBeginDate,
		validEndDate,
		personPassword,
		isCapturingFingerPrint,
		fingerPrintErrorMessage,
		personFormFacePreview,
		isSubmitting,
		errorMessage,

		// dialog actions
		openPersonCreate,
		editPerson,
		submitPerson,
		confirmDeletePerson,
		handleFaceFileChange,
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

