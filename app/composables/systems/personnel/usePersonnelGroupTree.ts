import type { Ref } from "vue"
import type { PersonGroup } from "~/types/personnel"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

type PersonnelGroupTreeState = {
	groupTree: Ref<PersonGroup[]>
	isLoading: Ref<boolean>
	errorMessage: Ref<string | null>
	refresh: () => Promise<void>
}

/**
 * 人員群組樹 SSOT（供多個元件共用，避免重複抓取與狀態分散）
 */
export const usePersonnelGroupTree = (): PersonnelGroupTreeState => {
	const personnelApi = usePersonnelApi()
	const { handleError: handleApiError } = useErrorHandler()

	const groupTree = useState<PersonGroup[]>("personnel.groupTree", () => [])
	const isLoading = useState<boolean>("personnel.groupTree.loading", () => false)
	const errorMessage = useState<string | null>("personnel.groupTree.error", () => null)

	const refresh = async () => {
		if (isLoading.value) return
		isLoading.value = true
		errorMessage.value = null
		try {
			groupTree.value = await personnelApi.getPersonGroups({ tree: true })
		} catch (err) {
			errorMessage.value = handleApiError(err, "載入群組失敗") || "載入群組失敗"
			groupTree.value = []
		} finally {
			isLoading.value = false
		}
	}

	return {
		groupTree,
		isLoading,
		errorMessage,
		refresh,
	}
}

