import { TOAST } from "~/config/toastCatalog"
import type { ImportResult, Person } from "~/types/personnel"
import type { PersonnelApi, PersonnelHandleApiError } from "~/composables/systems/personnel/usePersonnelApi"
import { PERSONNEL_API_ERROR_OPTS } from "~/composables/systems/personnel/usePersonnelApi"
import { usePersonsList } from "~/composables/systems/personnel/usePersonsList"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { getAccessControlConfigSummary } from "~/utils/personnelUtils"
import { personHasLicensePlates } from "~/utils/licensePlateFormUtils"
import { personHasLadderCard } from "~/utils/ladderFloorFormUtils"

/** 人員列表、篩選、分頁與批次匯入 */
export const usePersonnelPersonsList = (params: {
	personnelApi: PersonnelApi
	toast: {
		success: (msg: string) => void
		warning: (msg: string) => void
	}
	handleApiError: PersonnelHandleApiError
}) => {
	const { personnelApi, toast, handleApiError } = params
	const personsList = usePersonsList({ personnelApi, handleApiError, pageSize: 10 })
	const { resolveDirectUrl } = useImageCenter()

	const getFaceImageSrc = (url: string | null | undefined): string | null => {
		if (!url) return null
		if (url.startsWith("data:")) return url
		const normalized = url.startsWith("/") ? url : `/${url}`
		return resolveDirectUrl(normalized)
	}

	const getPersonAccessControlDataSummary = (p: Person) => {
		const ac = getAccessControlConfigSummary(p)
		const hasFace = Boolean(getFaceImageSrc(p.face_url))
		const hasPassword = Boolean(ac.password?.trim())
		const hasCard = Boolean(ac.cards?.length || ac.cardNo?.trim())
		const hasFingerprint = Boolean(ac.fingerPrintItems?.length || ac.fingerPrintData?.trim())
		const hasLicensePlate = personHasLicensePlates(p)
		const hasLadderCard = personHasLadderCard(p)
		return { hasFace, hasPassword, hasCard, hasFingerprint, hasLicensePlate, hasLadderCard }
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
				toast.warning(TOAST.PERSONNEL_IMPORT_WITH_ERRORS(result.errors.length))
			}
			if (result.created > 0) {
				toast.success(TOAST.PERSONNEL_IMPORTED(result.created))
				void personsList.loadPersons()
			} else if (!result.errors?.length) {
				toast.warning(TOAST.PERSONNEL_IMPORT_NONE)
			}
		} catch (err) {
			importError.value = handleApiError(err, "匯入失敗", PERSONNEL_API_ERROR_OPTS) || "匯入失敗"
		} finally {
			isImporting.value = false
		}
	}

	watch(showImportDialog, (v) => {
		if (!v) return
		importError.value = ""
		importResult.value = null
	})

	return {
		...personsList,
		getFaceImageSrc,
		getPersonAccessControlDataSummary,
		showImportDialog,
		importError,
		importResult,
		isImporting,
		submitImport,
	}
}
