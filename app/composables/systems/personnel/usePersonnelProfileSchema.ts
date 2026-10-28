import {
	PERSONNEL_API_ERROR_OPTS,
	type PersonnelApi,
	type PersonnelHandleApiError,
} from "~/composables/systems/personnel/usePersonnelApi"
import {
	emptyPersonnelProfileSchema,
	normalizePersonnelProfileSchema,
	visiblePersonnelCustomFields,
	type PersonnelProfileSchema,
} from "~/utils/personnelProfileFields"

/** 人員自訂欄位／列表顯示 SSOT */
export const usePersonnelProfileSchema = (params: {
	personnelApi: PersonnelApi
	handleApiError?: PersonnelHandleApiError
}) => {
	const schema = useState<PersonnelProfileSchema>(
		"personnel.profileSchema",
		() => emptyPersonnelProfileSchema(),
	)

	let refreshPromise: Promise<void> | null = null

	const refresh = async () => {
		if (refreshPromise) return refreshPromise
		refreshPromise = (async () => {
			try {
				schema.value = normalizePersonnelProfileSchema(
					await params.personnelApi.getProfileSchema(),
				)
			} catch (err) {
				params.handleApiError?.(err, "載入人員欄位設定失敗", PERSONNEL_API_ERROR_OPTS)
			} finally {
				refreshPromise = null
			}
		})()
		return refreshPromise
	}

	const fields = computed(() => schema.value.fields)
	const listColumns = computed(() => schema.value.listColumns)
	const visibleCustomFields = computed(() => visiblePersonnelCustomFields(schema.value))

	return {
		schema,
		fields,
		listColumns,
		visibleCustomFields,
		refresh,
	}
}
