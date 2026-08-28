import type { ConfirmDialogConfig } from "~/composables/core/useConfirmDialog"
import { TOAST } from "~/config/toastCatalog"
import { useApiBase } from "~/composables/core/useApiBase"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import type { ExportEventTypeInfo, ExportFieldCatalogItem } from "~/utils/externalIntegration"
import {
	buildEventTypeOptions,
	DB_SYNC_DB_TYPE_OPTIONS,
	DB_SYNC_DEFAULT_PUSH_TIME,
	eventTypeLabel,
	getDefaultFormatForField,
	normalizeDailyPushTime,
	normalizeGrainBySchema,
	resolveExportMode,
} from "~/utils/externalIntegration"
import { useDailyHHmmField } from "~/composables/core/useDailyHHmmField"
import {
	buildCatalogFieldOrder,
	mergeFieldOrder,
	resolveOrderedFields,
} from "~/utils/exportFieldOrder"
import { useExportFieldDragOrder } from "~/composables/core/useExportFieldDragOrder"

export { DB_SYNC_DB_TYPE_OPTIONS }

type SyncMapping = {
	enabled: boolean
	targetColumn: string
	format?: string
}

export type SyncConfig = {
	id: number
	eventType: string
	pushTime: string
	dbType: "postgres" | "sqlserver" | "mysql"
	host: string
	port: number
	database: string
	username: string
	targetTable: string
	mappings: Record<string, { targetColumn: string; format?: string }>
	options?: { grain?: string; punchMode?: string }
}

type SyncForm = {
	eventType: string
	pushTime: string
	dbType: "postgres" | "sqlserver" | "mysql"
	host: string
	port: string
	database: string
	username: string
	password: string
	targetTable: string
	mappings: Record<string, SyncMapping>
	grain: string
}

const DEFAULT_PORT: Record<string, string> = { postgres: "5432", sqlserver: "1433", mysql: "3306" }

const createEmptyForm = (): SyncForm => ({
	eventType: "access_control",
	pushTime: DB_SYNC_DEFAULT_PUSH_TIME,
	dbType: "postgres",
	host: "",
	port: "5432",
	database: "",
	username: "",
	password: "",
	targetTable: "",
	mappings: {},
	grain: "hourly",
})

type SyncConfigResponse = {
	config?: SyncConfig | null
	configs?: SyncConfig[]
	fields?: Array<ExportFieldCatalogItem>
	eventTypes?: ExportEventTypeInfo[]
}

export const useExternalDatabaseSyncForm = () => {
	const { request } = useApiBase()
	const canAdmin = useAdminOnly()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const eventTypes = ref<ExportEventTypeInfo[]>([])
	const fields = ref<Array<ExportFieldCatalogItem>>([])
	const fieldOrderKeys = ref<string[]>([])
	const configs = ref<SyncConfig[]>([])
	const isLoading = ref(true)
	const isSaving = ref(false)
	const isTesting = ref(false)
	const isDeletingEventType = ref<string | null>(null)
	const loadError = ref<string | null>(null)

	const dialog = reactive<{
		open: boolean
		mode: "create" | "edit"
		form: SyncForm
	}>({
		open: false,
		mode: "create",
		form: createEmptyForm(),
	})

	const formDisabled = computed(() => isLoading.value || !canAdmin.value)
	const dialogBusy = computed(() => !canAdmin.value || isSaving.value)
	const actionLabel = "新增設定"

	const createEventTypeOptions = computed(() =>
		buildEventTypeOptions({
			availableTypes: eventTypes.value,
			excludeIds: configs.value.map((c) => c.eventType),
		}),
	)
	const canCreateMore = computed(() => createEventTypeOptions.value.length > 0)
	const orderedFields = computed(() => resolveOrderedFields(fields.value, fieldOrderKeys.value))
	const {
		draggingFieldKey,
		dragOverFieldKey,
		handleFieldDragStart,
		handleFieldDragEnd,
		handleFieldDragOver,
		handleFieldDragLeave,
		handleFieldDrop,
	} = useExportFieldDragOrder(fieldOrderKeys, { disabled: dialogBusy })

	const { hour: pushTimeHour, minute: pushTimeMinute } = useDailyHHmmField(
		() => dialog.form.pushTime,
		(value) => {
			dialog.form.pushTime = value
		},
		DB_SYNC_DEFAULT_PUSH_TIME,
	)

	const ensureFieldMapping = (field: ExportFieldCatalogItem) => {
		if (dialog.form.mappings[field.key]) return
		dialog.form.mappings[field.key] = {
			enabled: Boolean(field.required),
			targetColumn: "",
			format: field.requiresFormat ? getDefaultFormatForField(field) : "",
		}
	}

	const initAllFieldMappings = (enabledKeys?: Set<string>) => {
		for (const f of fields.value) {
			ensureFieldMapping(f)
			const m = dialog.form.mappings[f.key]
			m.enabled = Boolean(f.required) || Boolean(enabledKeys?.has(f.key))
			if (m.enabled && f.requiresFormat && !m.format.trim()) {
				m.format = getDefaultFormatForField(f)
			}
		}
	}

	const handleToggleField = (field: ExportFieldCatalogItem, enabled: boolean) => {
		if (field.required) return
		ensureFieldMapping(field)
		const m = dialog.form.mappings[field.key]
		m.enabled = enabled
		if (enabled && field.requiresFormat && !m.format.trim()) {
			m.format = getDefaultFormatForField(field)
		}
	}

	const buildMappingsPayload = (): Record<string, { targetColumn: string; format?: string }> => {
		const out: Record<string, { targetColumn: string; format?: string }> = {}
		for (const f of orderedFields.value) {
			const m = dialog.form.mappings[f.key]
			if (!m?.enabled) continue
			const targetColumn = m.targetColumn.trim()
			if (!targetColumn) continue
			out[f.key] = {
				targetColumn,
				...(f.requiresFormat && m.format?.trim() ? { format: m.format.trim() } : {}),
			}
		}
		return out
	}

	const handleDbTypeChanged = () => {
		if (
			!dialog.form.port ||
			dialog.form.port === DEFAULT_PORT.postgres ||
			dialog.form.port === DEFAULT_PORT.sqlserver ||
			dialog.form.port === DEFAULT_PORT.mysql
		) {
			dialog.form.port = DEFAULT_PORT[dialog.form.dbType] ?? dialog.form.port
		}
	}

	const loadFieldsForEventType = async (eventType: string) => {
		const data = await request<SyncConfigResponse>(
			`/external-sync/configs?eventType=${encodeURIComponent(eventType)}`,
			{ method: "GET" },
		)
		fields.value = data.fields || []
		if (data.eventTypes?.length) eventTypes.value = data.eventTypes
		fieldOrderKeys.value = buildCatalogFieldOrder(fields.value)
		dialog.form.mappings = {}
		initAllFieldMappings()
	}

	const applyConfigToDialog = (cfg: SyncConfig) => {
		dialog.form.eventType = cfg.eventType
		dialog.form.pushTime =
			normalizeDailyPushTime(cfg.pushTime) ?? DB_SYNC_DEFAULT_PUSH_TIME
		dialog.form.dbType = cfg.dbType || "postgres"
		dialog.form.host = cfg.host || ""
		dialog.form.port = String(cfg.port ?? DEFAULT_PORT[cfg.dbType] ?? "5432")
		dialog.form.database = cfg.database || ""
		dialog.form.username = cfg.username || ""
		dialog.form.password = ""
		dialog.form.targetTable = cfg.targetTable || ""
		dialog.form.grain = normalizeGrainBySchema(
			currentFilterSchema.value,
			cfg.options?.grain,
			cfg.options?.punchMode,
		)
		dialog.form.mappings = {}
		const enabledKeys = new Set(Object.keys(cfg.mappings || {}))
		for (const [k, v] of Object.entries(cfg.mappings || {})) {
			dialog.form.mappings[k] = {
				enabled: true,
				targetColumn: String(v.targetColumn ?? ""),
				format: v.format != null ? String(v.format) : "",
			}
		}
		initAllFieldMappings(enabledKeys)
		fieldOrderKeys.value = mergeFieldOrder(
			Object.keys(cfg.mappings || {}),
			buildCatalogFieldOrder(fields.value),
		)
	}

	const fetchConfigs = async () => {
		if (!canAdmin.value) {
			isLoading.value = false
			return
		}
		isLoading.value = true
		loadError.value = null
		try {
			const data = await request<SyncConfigResponse>("/external-sync/configs", { method: "GET" })
			configs.value = data.configs || []
			if (data.eventTypes?.length) eventTypes.value = data.eventTypes
		} catch (e) {
			loadError.value = handleError(e, "載入資料庫對接設定失敗") ?? "載入資料庫對接設定失敗"
		} finally {
			isLoading.value = false
		}
	}

	const handleCreate = async () => {
		if (!canAdmin.value) {
			toast.warning(TOAST.ADMIN_ONLY_EXTERNAL_DB)
			return
		}
		if (!canCreateMore.value) {
			toast.warning("所有事件類型皆已設定對接")
			return
		}
		dialog.mode = "create"
		dialog.form = createEmptyForm()
		dialog.form.eventType = createEventTypeOptions.value[0]?.value ?? "access_control"
		dialog.open = true
		await loadFieldsForEventType(dialog.form.eventType)
		dialog.form.grain = normalizeGrainBySchema(currentFilterSchema.value, undefined)
	}

	const handleEdit = async (cfg: SyncConfig) => {
		if (!canAdmin.value) {
			toast.warning(TOAST.ADMIN_ONLY_EXTERNAL_DB)
			return
		}
		dialog.mode = "edit"
		dialog.form = createEmptyForm()
		dialog.open = true
		await loadFieldsForEventType(cfg.eventType)
		applyConfigToDialog(cfg)
	}

	const handleDialogEventTypeChanged = async () => {
		if (dialog.mode !== "create") return
		await loadFieldsForEventType(dialog.form.eventType)
		dialog.form.grain = normalizeGrainBySchema(currentFilterSchema.value, undefined)
	}

	const handleCloseDialog = () => {
		dialog.open = false
	}

	const handleTestConnection = async () => {
		isTesting.value = true
		try {
			await request<{ ok: boolean }>("/external-sync/test-connection", {
				method: "POST",
				body: {
					dbType: dialog.form.dbType,
					host: dialog.form.host,
					port: Number(dialog.form.port),
					database: dialog.form.database,
					username: dialog.form.username,
					password: dialog.form.password,
				},
			})
			toast.success(TOAST.EXTERNAL_DB_CONNECTED)
		} catch (e) {
			handleError(e, "連線失敗")
		} finally {
			isTesting.value = false
		}
	}

	const validateDialogForSave = (): string | null => {
		if (!canAdmin.value) return null
		const mappings = buildMappingsPayload()
		for (const f of fields.value) {
			if (!f.required) continue
			if (!mappings[f.key]) {
				return `請勾選並填寫必填欄位「${f.label}」`
			}
		}
		if (Object.keys(mappings).length === 0) {
			return "請至少勾選一個輸出欄位"
		}
		return null
	}

	const openSaveConfirmDialog = (show: (config: ConfirmDialogConfig) => void) => {
		const validationError = validateDialogForSave()
		if (validationError) {
			toast.warning(validationError)
			return
		}
		const label = eventTypeLabel(dialog.form.eventType)
		const isCreate = dialog.mode === "create"
		show({
			title: isCreate ? "確認新增" : "確認儲存",
			message: isCreate
				? `確定要新增「${label}」的資料庫對接設定嗎？`
				: `確定要儲存「${label}」的資料庫對接設定嗎？`,
			type: "warning",
			confirmText: "儲存",
		})
	}

	const handleSave = async () => {
		isSaving.value = true
		try {
			const mappings = buildMappingsPayload()
			await request<{ id: number }>("/external-sync/configs", {
				method: "PUT",
				body: {
					eventType: dialog.form.eventType,
					pushTime: dialog.form.pushTime,
					dbType: dialog.form.dbType,
					host: dialog.form.host,
					port: Number(dialog.form.port),
					database: dialog.form.database,
					username: dialog.form.username,
					password: dialog.form.password,
					targetTable: dialog.form.targetTable,
					mappings,
					options: exportMode.value
						? {
								grain: normalizeGrainBySchema(
									currentFilterSchema.value,
									dialog.form.grain,
								),
							}
						: {},
				},
			})
			toast.success(TOAST.EXTERNAL_DB_SAVED)
			dialog.open = false
			await fetchConfigs()
		} catch (e) {
			handleError(e, "儲存失敗")
		} finally {
			isSaving.value = false
		}
	}

	const handleDelete = async (eventType: string) => {
		if (!canAdmin.value) return
		isDeletingEventType.value = eventType
		try {
			await request(`/external-sync/configs/${encodeURIComponent(eventType)}`, {
				method: "DELETE",
			})
			toast.success(TOAST.EXTERNAL_DB_DELETED)
			await fetchConfigs()
		} catch (e) {
			handleError(e, "刪除失敗")
		} finally {
			isDeletingEventType.value = null
		}
	}

	const getDbTypeLabel = (dbType: string) =>
		DB_SYNC_DB_TYPE_OPTIONS.find((o) => o.value === dbType)?.label ?? dbType
	const currentFilterSchema = computed(
		() => eventTypes.value.find((t) => t.id === dialog.form.eventType)?.filterSchema,
	)
	const exportMode = computed(() => resolveExportMode(currentFilterSchema.value))

	onMounted(() => {
		void fetchConfigs()
	})

	return {
		configs,
		orderedFields,
		dialog,
		isLoading,
		isSaving,
		isTesting,
		isDeletingEventType,
		loadError,
		formDisabled,
		dialogBusy,
		actionLabel,
		canCreateMore,
		createEventTypeOptions,
		pushTimeHour,
		pushTimeMinute,
		eventTypeLabel,
		getDbTypeLabel,
		exportMode,
		handleToggleField,
		draggingFieldKey,
		dragOverFieldKey,
		handleFieldDragStart,
		handleFieldDragEnd,
		handleFieldDragOver,
		handleFieldDragLeave,
		handleFieldDrop,
		handleDbTypeChanged,
		handleDialogEventTypeChanged,
		handleCreate,
		handleEdit,
		handleCloseDialog,
		handleTestConnection,
		openSaveConfirmDialog,
		handleSave,
		handleDelete,
	}
}
