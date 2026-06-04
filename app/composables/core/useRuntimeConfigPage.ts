import { useApiBase } from "~/composables/core/useApiBase"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import {
	type RuntimeConfigSchema,
	getRuntimeSectionRows,
	mergeRuntimeFormValues,
} from "~/utils/runtimeConfigForm"

type RuntimeConfigResponse = {
	schema: RuntimeConfigSchema
	values: Record<string, string>
}

export const useRuntimeConfigPage = () => {
	const { request } = useApiBase()
	const canAdmin = useAdminOnly()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const schema = ref<RuntimeConfigSchema | null>(null)
	const form = reactive<Record<string, string>>({})
	const isLoading = ref(true)
	const isSaving = ref(false)
	const loadError = ref<string | null>(null)

	const formDisabled = computed(() => isLoading.value || isSaving.value || !canAdmin.value)
	const sectionRows = computed(() =>
		schema.value ? getRuntimeSectionRows(schema.value) : [],
	)

	const applyPayload = (data: RuntimeConfigResponse) => {
		schema.value = data.schema
		Object.assign(form, mergeRuntimeFormValues(data.schema, data.values))
	}

	const fetchRuntimeConfig = async () => {
		if (!canAdmin.value) return
		isLoading.value = true
		loadError.value = null
		try {
			const data = await request<RuntimeConfigResponse>("/runtime-config", {
				method: "GET",
			})
			applyPayload(data)
		} catch (e) {
			loadError.value = handleError(e, "載入營運設定失敗") ?? "載入營運設定失敗"
		} finally {
			isLoading.value = false
		}
	}

	const handleReload = async () => {
		await fetchRuntimeConfig()
		toast.success("已重新載入")
	}

	const handleSave = async () => {
		if (!canAdmin.value) {
			toast.warning("僅管理員可儲存營運設定")
			return
		}
		if (!schema.value) return
		isSaving.value = true
		try {
			const data = await request<{ message: string }>("/runtime-config", {
				method: "PUT",
				body: {
					values: schema.value
						? mergeRuntimeFormValues(schema.value, form)
						: { ...form },
				},
			})
			toast.success(data.message || "已套用營運設定")
			await fetchRuntimeConfig()
		} catch (e) {
			handleError(e, "儲存失敗")
		} finally {
			isSaving.value = false
		}
	}

	onMounted(() => {
		void fetchRuntimeConfig()
	})

	return {
		schema,
		form,
		isLoading,
		isSaving,
		loadError,
		formDisabled,
		sectionRows,
		handleReload,
		handleSave,
	}
}
