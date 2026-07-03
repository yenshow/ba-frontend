import { useApiBase } from "~/composables/core/useApiBase"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import type { AccessControlFieldCatalogItem } from "~/utils/externalIntegration"
import { DB_SYNC_DB_TYPE_OPTIONS } from "~/utils/externalIntegration"

export { DB_SYNC_DB_TYPE_OPTIONS }

type SyncMapping = {
	targetColumn: string
	format?: string
}

type SyncConfig = {
	id: number
	eventType: "access_control"
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
	config: SyncConfig | null
	fields: Array<AccessControlFieldCatalogItem>
}

const DEFAULT_PORT: Record<string, string> = { postgres: "5432", sqlserver: "1433", mysql: "3306" }

const DB_TYPE_LABEL: Record<string, string> = {
	postgres: "PostgreSQL",
	sqlserver: "SQL Server",
	mysql: "MySQL",
}

export const useExternalDatabaseSyncForm = () => {
	const { request } = useApiBase()
	const canAdmin = useAdminOnly()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const fields = ref<Array<AccessControlFieldCatalogItem>>([])
	const savedConfig = ref<SyncConfig | null>(null)
	const isLoading = ref(true)
	const isSaving = ref(false)
	const isTesting = ref(false)
	const loadError = ref<string | null>(null)
	const dialogOpen = ref(false)

	const form = reactive<SyncForm>({
		pushTime: "18:00",
		dbType: "postgres",
		host: "",
		port: "5432",
		database: "",
		username: "",
		password: "",
		targetTable: "",
		mappings: {},
	})

	const formDisabled = computed(() => isLoading.value || !canAdmin.value)
	const dialogBusy = computed(() => !canAdmin.value)

	const summaryItems = computed(() => {
		const cfg = savedConfig.value
		if (!cfg) return []
		return [
			{ label: "推播時間", value: cfg.pushTime || "—" },
			{ label: "資料庫類型", value: DB_TYPE_LABEL[cfg.dbType] || cfg.dbType },
			{ label: "伺服器", value: `${cfg.host || "—"}:${cfg.port ?? "—"}` },
			{ label: "資料庫名稱", value: cfg.database || "—" },
		]
	})

	const actionLabel = computed(() => (savedConfig.value ? "編輯設定" : "新增設定"))

	const ensureFieldMapping = (key: string) => {
		if (!form.mappings[key]) {
			form.mappings[key] = { targetColumn: "", format: "" }
		}
	}

	const initAllFieldMappings = () => {
		for (const f of fields.value) {
			ensureFieldMapping(f.key)
		}
	}

	const buildMappingsPayload = (): Record<string, SyncMapping> => {
		const out: Record<string, SyncMapping> = {}
		for (const f of fields.value) {
			const m = form.mappings[f.key]
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
			!form.port ||
			form.port === DEFAULT_PORT.postgres ||
			form.port === DEFAULT_PORT.sqlserver ||
			form.port === DEFAULT_PORT.mysql
		) {
			form.port = DEFAULT_PORT[form.dbType] ?? form.port
		}
	}

	const resetFormFromConfig = () => {
		const cfg = savedConfig.value
		form.mappings = {}
		form.password = ""
		if (cfg) {
			form.pushTime = cfg.pushTime || "18:00"
			form.dbType = cfg.dbType || "postgres"
			form.host = cfg.host || ""
			form.port = String(cfg.port ?? DEFAULT_PORT[cfg.dbType] ?? "5432")
			form.database = cfg.database || ""
			form.username = cfg.username || ""
			form.targetTable = cfg.targetTable || ""
			for (const [k, v] of Object.entries(cfg.mappings || {})) {
				ensureFieldMapping(k)
				form.mappings[k].targetColumn = String(v.targetColumn ?? "")
				form.mappings[k].format = v.format != null ? String(v.format) : ""
			}
		} else {
			form.pushTime = "18:00"
			form.dbType = "postgres"
			form.host = ""
			form.port = "5432"
			form.database = ""
			form.username = ""
			form.targetTable = ""
		}
		initAllFieldMappings()
	}

	const fetchConfig = async () => {
		if (!canAdmin.value) {
			isLoading.value = false
			return
		}
		isLoading.value = true
		loadError.value = null
		try {
			const data = await request<SyncConfigResponse>(
				"/external-sync/configs?eventType=access_control",
				{ method: "GET" }
			)
			fields.value = data.fields || []
			savedConfig.value = data.config ?? null
		} catch (e) {
			loadError.value = handleError(e, "載入資料庫對接設定失敗") ?? "載入資料庫對接設定失敗"
		} finally {
			isLoading.value = false
		}
	}

	const handleOpenDialog = () => {
		if (!canAdmin.value) {
			toast.warning("僅管理員可設定")
			return
		}
		resetFormFromConfig()
		dialogOpen.value = true
	}

	const handleCloseDialog = () => {
		dialogOpen.value = false
	}

	const handleTestConnection = async () => {
		isTesting.value = true
		try {
			await request<{ ok: boolean }>("/external-sync/test-connection", {
				method: "POST",
				body: {
					dbType: form.dbType,
					host: form.host,
					port: Number(form.port),
					database: form.database,
					username: form.username,
					password: form.password,
				},
			})
			toast.success("連線成功")
		} catch (e) {
			handleError(e, "連線失敗")
		} finally {
			isTesting.value = false
		}
	}

	const handleSave = async () => {
		isSaving.value = true
		try {
			await request<{ id: number }>("/external-sync/configs", {
				method: "PUT",
				body: {
					eventType: "access_control",
					pushTime: form.pushTime,
					dbType: form.dbType,
					host: form.host,
					port: Number(form.port),
					database: form.database,
					username: form.username,
					password: form.password,
					targetTable: form.targetTable,
					mappings: buildMappingsPayload(),
				},
			})
			toast.success("已儲存資料庫對接設定")
			dialogOpen.value = false
			await fetchConfig()
		} catch (e) {
			handleError(e, "儲存失敗")
		} finally {
			isSaving.value = false
		}
	}

	onMounted(() => {
		void fetchConfig()
	})

	return {
		form,
		fields,
		savedConfig,
		isLoading,
		isSaving,
		isTesting,
		loadError,
		dialogOpen,
		formDisabled,
		dialogBusy,
		summaryItems,
		actionLabel,
		handleDbTypeChanged,
		handleOpenDialog,
		handleCloseDialog,
		handleTestConnection,
		handleSave,
	}
}
