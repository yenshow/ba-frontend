import { TOAST } from "~/config/toastCatalog"
import type { Person } from "~/types/personnel"
import type { PersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useAccessControlApi } from "~/composables/systems/accessControl/useAccessControlApi"
import { handleImageError } from "~/utils/imageUtils"
import { usePersonnelPersonsList } from "~/composables/systems/personnel/usePersonnelPersonsList"
import {
	PERSONNEL_API_ERROR_OPTS,
	type PersonnelHandleApiError,
} from "~/composables/systems/personnel/usePersonnelApi"
import { getPrevOffset } from "~/composables/systems/personnel/personnelList"
import { usePersonnelPersonForm } from "~/composables/systems/personnel/usePersonnelPersonForm"

type DeviceApi = ReturnType<typeof useDeviceApi>
type AccessControlApi = ReturnType<typeof useAccessControlApi>

export {
	PERSONNEL_FACE_MAX_BYTES,
	PERSONNEL_FACE_IMPORT_SOURCE_MAX_BYTES,
	PERSONNEL_FACE_OUTPUT_SIZE,
	PERSONNEL_FACE_CROP_DIALOG_PROPS,
} from "~/composables/systems/personnel/usePersonnelPersonForm"

export type {
	PersonDialogSnapshot,
	PersonnelPersonDialogSection,
} from "~/composables/systems/personnel/usePersonnelPersonForm"

/** 人員 Tab：列表 + 新增／編輯 Dialog 表單 */
export const usePersonnelPersonsTab = (params: {
	personnelApi: PersonnelApi
	deviceApi: DeviceApi
	accessControlApi: AccessControlApi
	toast: {
		success: (msg: string) => void
		error: (msg: string) => void
		warning: (msg: string) => void
	}
	handleApiError: PersonnelHandleApiError
}) => {
	const { personnelApi, toast, handleApiError } = params
	const personsList = usePersonnelPersonsList({ personnelApi, toast, handleApiError })
	const {
		PAGE_SIZE,
		persons,
		personsOffset,
		loadPersons,
		getFaceImageSrc,
		getPersonAccessControlDataSummary,
	} = personsList

	const personForm = usePersonnelPersonForm({
		...params,
		persons,
		personsOffset,
		loadPersons,
		getFaceImageSrc,
	})

	const deletePerson = async (p: Person) => {
		try {
			await personnelApi.deletePerson(p.id)
			await loadPersons()
			if (personsOffset.value > 0 && persons.value.length === 0) {
				personsOffset.value = getPrevOffset({ offset: personsOffset.value, limit: PAGE_SIZE })
				await loadPersons()
			}
			toast.success(TOAST.PERSONNEL_DELETED)
		} catch (err) {
			handleApiError(err, "刪除人員失敗", PERSONNEL_API_ERROR_OPTS)
		}
	}

	return {
		...personsList,
		...personForm,
		deletePerson,
		handleImageError,
	}
}
