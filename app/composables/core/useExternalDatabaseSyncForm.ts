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
	normalizeDailyPushTime,
} from "~/utils/externalIntegration"
import { useDailyHHmmField } from "~/composables/core/useDailyHHmmField"

export { DB_SYNC_DB_TYPE_OPTIONS }

type SyncMapping = {
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
	mappings: Record<string, SyncMapping>
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
}

type SyncConfigResponse = {
	config?: SyncConfig | null
	configs?: SyncConfig[]
	fields?: Array<ExportFieldCatalogItem>
	eventTypes?: ExportEventTypeInfo[]
}

const DEFAULT_PORT: Record<string, string> = { postgres: "5432", sqlserver: "1433", mysql: "3306" }

const DB_TYPE_LABEL: Record<string, string> = {
	postgres: "PostgreSQL",
	sqlserver: "SQL Server",
	mysql: "MySQL",
}

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
})

export const useExternalDatabaseSyncForm = () => {
	const { request } = useApiBase()
	const canAdmin = useAdminOnly()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const eventTypes = ref<ExportEventTypeInfo[]>([])
	const fields = ref<Array<ExportFieldCatalogItem>>([])
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

	const { hour: pushTimeHour, minute: pushTimeMinute } = useDailyHHmmField(
		() => dialog.form.pushTime,
		(value) => {
			dialog.form.pushTime = value
		},
		DB_SYNC_DEFAULT_PUSH_TIME,
	)

	const ensureFieldMapping = (key: string) => {
		if (!dialog.form.mappings[key]) {
			dialog.form.mappings[key] = { targetColumn: "", format: "" }
		}
	}

	const initAllFieldMappings = () => {
		for (const f of fields.value) ensureFieldMapping(f.key)
	}

	const buildMappingsPayload = (): Record<string, SyncMapping> => {
		const out: Record<string, SyncMapping> = {}
		for (const f of fields.value) {
			const m = dialog.form.mappings[f.key]
			if (!m) continue
			const targetColumn = m.targetColumn.trim()
			if (!targetColumn) continue
			out[f.key] = {
				targetColumn,
				...(m.format?.trim() ? { format: m.format.trim() } : {}),
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
		dialog.form.mappings = {}
		for (const [k, v] of Object.entries(cfg.mappings || {})) {
			ensureFieldMapping(k)
			dialog.form.mappings[k].targetColumn = String(v.targetColumn ?? "")
			dialog.form.mappings[k].format = v.format != null ? String(v.format) : ""
		}
		initAllFieldMappings()
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

	const handleSave = async () => {
		if (!canAdmin.value) return
		isSaving.value = true
		try {
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
					mappings: buildMappingsPayload(),
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

	const getDbTypeLabel = (dbType: string) => DB_TYPE_LABEL[dbType] || dbType

	onMounted(() => {
		void fetchConfigs()
	})

	return {
		configs,
		fields,
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
		handleDbTypeChanged,
		handleDialogEventTypeChanged,
		handleCreate,
		handleEdit,
		handleCloseDialog,
		handleTestConnection,
		handleSave,
		handleDelete,
	}
}
