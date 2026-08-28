import type { ConfirmDialogConfig } from "~/composables/core/useConfirmDialog"
import { TOAST } from "~/config/toastCatalog"
import { useApiBase } from "~/composables/core/useApiBase"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree"
import type {
	ExportEventTypeInfo,
	ExportFieldCatalogItem,
	ExportFilterSchema,
} from "~/utils/externalIntegration"
import {
	buildEventTypeOptions,
	buildFilterPayloadFromForm,
	getDefaultFormatForField,
	getFilterFieldLabel,
	isGroupFilterRequired,
	normalizeDailyPushTime,
	normalizeGrainBySchema,
	normalizeScheduleDay,
	normalizeScheduleFreq,
	RECORD_EXPORT_DEFAULT_EXPORT_TIME,
	columnDelimiterFromInput,
	columnDelimiterToInput,
	resolveColumnDelimiterForSave,
	resolveDefaultColumnDelimiter,
	resolveExportMode,
	SCHEDULE_FREQ_OPTIONS,
	toDropdownOptions,
	eventTypeLabel,
	type ScheduleFreq,
} from "~/utils/externalIntegration"
import { formatExportSchedulePreview } from "~/utils/exportSchedulePreview"
import { useDailyHHmmField } from "~/composables/core/useDailyHHmmField"
import {
	buildCatalogFieldOrder,
	mergeFieldOrder,
	resolveOrderedFields,
} from "~/utils/exportFieldOrder"
import { useExportFieldDragOrder } from "~/composables/core/useExportFieldDragOrder"

type RuleField = {
	fieldKey: string
	headerLabel?: string
	format?: string
}

type RuleRecord = {
	id: number
	eventType?: string
	name: string
	filenamePrefix?: string
	dateFormat?: string
	timeFormat?: string
	outputFormat: "csv" | "txt"
	columnDelimiter: string
	storageType: "local" | "sftp"
	localDir?: string
	exportTime: string
	scheduleFreq?: ScheduleFreq | string
	scheduleDay?: number | null
	groupIds?: number[]
	filter?: Record<string, unknown>
	sftp?: { host?: string; port?: number; username?: string; remoteDir?: string }
	fields?: RuleField[]
}

type RuleResponse = {
	rules: RuleRecord[]
	fields: Array<ExportFieldCatalogItem>
	filterSchema?: ExportFilterSchema | null
	eventTypes?: ExportEventTypeInfo[]
}

type FieldConfig = {
	enabled: boolean
	headerLabel: string
	format: string
}

type RuleDialogForm = {
	id: number | null
	eventType: string
	name: string
	filenamePrefix: string
	dateFormat: string
	timeFormat: string
	outputFormat: "csv" | "txt"
	columnDelimiter: string
	storageType: "local" | "sftp"
	localDir: string
	sftp: { host: string; port: string; username: string; password: string; remoteDir: string }
	exportTime: string
	scheduleFreq: ScheduleFreq
	scheduleDay: string
	groupIds: number[]
	deviceIdsText: string
	locationIdsText: string
	eventKindsText: string
	sourcesText: string
	statusesText: string
	grain: string
	fieldConfigs: Record<string, FieldConfig>
}

const createEmptyForm = (): RuleDialogForm => ({
	id: null,
	eventType: "access_control",
	name: "",
	filenamePrefix: "Export_Record",
	dateFormat: "yyyy-MM-dd",
	timeFormat: "HHmmss",
	outputFormat: "csv",
	columnDelimiter: resolveDefaultColumnDelimiter("csv"),
	storageType: "local",
	localDir: "",
	sftp: { host: "", port: "22", username: "", password: "", remoteDir: "" },
	exportTime: RECORD_EXPORT_DEFAULT_EXPORT_TIME,
	scheduleFreq: "daily",
	scheduleDay: "5",
	groupIds: [],
	deviceIdsText: "",
	locationIdsText: "",
	eventKindsText: "",
	sourcesText: "",
	statusesText: "",
	grain: "hourly",
	fieldConfigs: {},
})

export const useRecordExportRulesForm = () => {
	const { request } = useApiBase()
	const canAdmin = useAdminOnly()
	const toast = useToast()
	const { handleError } = useErrorHandler()

	const {
		groupTree,
		isLoading: groupTreeLoading,
		refresh: refreshGroupTree,
	} = usePersonnelGroupTree()

	const rules = ref<RuleRecord[]>([])
	const fields = ref<Array<ExportFieldCatalogItem>>([])
	const fieldOrderKeys = ref<string[]>([])
	const eventTypes = ref<ExportEventTypeInfo[]>([])
	const filterSchema = ref<ExportFilterSchema | null>(null)
	const isLoading = ref(true)
	const isSaving = ref(false)
	const loadError = ref<string | null>(null)
	const isDeletingId = ref<number | null>(null)

	const dialog = reactive<{ open: boolean; mode: "create" | "edit"; form: RuleDialogForm }>({
		open: false,
		mode: "create",
		form: createEmptyForm(),
	})

	const dialogBusy = computed(() => !canAdmin.value || isSaving.value)
	const formDisabled = computed(() => isLoading.value || !canAdmin.value)
	const actionLabel = "新增規則"
	const eventTypeOptions = computed(() =>
		buildEventTypeOptions({ availableTypes: eventTypes.value }),
	)
	const filterKind = computed(() => filterSchema.value?.kind ?? null)
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

	const { hour: exportTimeHour, minute: exportTimeMinute } = useDailyHHmmField(
		() => dialog.form.exportTime,
		(value) => {
			dialog.form.exportTime = value
		},
		RECORD_EXPORT_DEFAULT_EXPORT_TIME,
	)

	const filterLabel = (key: string, fallback: string) =>
		getFilterFieldLabel(filterSchema.value, key, fallback)
	const groupFilterRequired = computed(() => isGroupFilterRequired(filterSchema.value))
	const exportMode = computed(() => resolveExportMode(filterSchema.value))
	const scheduleFreqOptions = toDropdownOptions(SCHEDULE_FREQ_OPTIONS)
	const showWeekday = computed(() => dialog.form.scheduleFreq === "weekly")
	const showMonthDay = computed(() => dialog.form.scheduleFreq === "monthly")

	const ruleSchedulePreview = (rule: { scheduleFreq?: unknown }) =>
		formatExportSchedulePreview(rule)

	const dialogSchedulePreview = computed(() =>
		ruleSchedulePreview({ scheduleFreq: dialog.form.scheduleFreq }),
	)

	const handleScheduleFreqChanged = () => {
		const freq = normalizeScheduleFreq(dialog.form.scheduleFreq)
		dialog.form.scheduleFreq = freq
		if (freq !== "daily" && !normalizeScheduleDay(freq, dialog.form.scheduleDay)) {
			dialog.form.scheduleDay = "5"
		}
	}

	const ensureRuleField = (field: ExportFieldCatalogItem) => {
		if (dialog.form.fieldConfigs[field.key]) return
		dialog.form.fieldConfigs[field.key] = {
			enabled: Boolean(field.required),
			headerLabel: field.required ? field.label : "",
			format: field.requiresFormat ? getDefaultFormatForField(field) : "",
		}
	}

	const initAllFieldConfigs = (enabledKeys?: Set<string>) => {
		for (const f of fields.value) {
			ensureRuleField(f)
			const cfg = dialog.form.fieldConfigs[f.key]
			cfg.enabled = Boolean(f.required) || Boolean(enabledKeys?.has(f.key))
			if (cfg.enabled && !cfg.headerLabel.trim()) cfg.headerLabel = f.label
			if (cfg.enabled && f.requiresFormat && !cfg.format.trim()) {
				cfg.format = getDefaultFormatForField(f)
			}
		}
	}

	const handleToggleField = (field: ExportFieldCatalogItem, enabled: boolean) => {
		if (field.required) return
		ensureRuleField(field)
		const cfg = dialog.form.fieldConfigs[field.key]
		cfg.enabled = enabled
		if (enabled) {
			if (!cfg.headerLabel.trim()) cfg.headerLabel = field.label
			if (field.requiresFormat && !cfg.format.trim()) {
				cfg.format = getDefaultFormatForField(field)
			}
		}
	}

	const handleOutputFormatChanged = () => {
		dialog.form.columnDelimiter = resolveDefaultColumnDelimiter(dialog.form.outputFormat)
	}

	const columnDelimiterInput = computed({
		get: () => columnDelimiterToInput(dialog.form.columnDelimiter),
		set: (value: string) => {
			dialog.form.columnDelimiter = columnDelimiterFromInput(value)
		},
	})

	const resetDialogForm = () => {
		dialog.form = createEmptyForm()
	}

	const loadFieldsForEventType = async (eventType: string) => {
		const data = await request<RuleResponse>(
			`/record-export/rules?eventType=${encodeURIComponent(eventType)}`,
			{ method: "GET" },
		)
		fields.value = data.fields || []
		filterSchema.value = data.filterSchema ?? null
		if (data.eventTypes?.length) eventTypes.value = data.eventTypes
		fieldOrderKeys.value = buildCatalogFieldOrder(fields.value)
		initAllFieldConfigs()
	}

	const clearDialogFilters = () => {
		dialog.form.groupIds = []
		dialog.form.deviceIdsText = ""
		dialog.form.locationIdsText = ""
		dialog.form.eventKindsText = ""
		dialog.form.sourcesText = ""
		dialog.form.statusesText = ""
	}

	const fetchRules = async () => {
		if (!canAdmin.value) {
			isLoading.value = false
			return
		}
		isLoading.value = true
		loadError.value = null
		try {
			const data = await request<RuleResponse>("/record-export/rules", { method: "GET" })
			rules.value = data.rules || []
			if (data.eventTypes?.length) eventTypes.value = data.eventTypes
		} catch (e) {
			loadError.value = handleError(e, "載入記錄轉存規則失敗") ?? "載入記錄轉存規則失敗"
		} finally {
			isLoading.value = false
		}
	}

	const applyRuleToDialog = (full: RuleRecord) => {
		dialog.form.id = full.id
		dialog.form.eventType = full.eventType || "access_control"
		dialog.form.name = full.name || ""
		dialog.form.filenamePrefix = full.filenamePrefix || "Export_Record"
		dialog.form.dateFormat = full.dateFormat || "yyyy-MM-dd"
		dialog.form.timeFormat = full.timeFormat || "HHmmss"
		dialog.form.outputFormat = full.outputFormat || "csv"
		dialog.form.columnDelimiter =
			full.columnDelimiter ??
			resolveDefaultColumnDelimiter(full.outputFormat || "csv")
		dialog.form.storageType = full.storageType || "local"
		dialog.form.localDir = full.localDir || ""
		dialog.form.exportTime =
			normalizeDailyPushTime(full.exportTime) ?? RECORD_EXPORT_DEFAULT_EXPORT_TIME
		dialog.form.scheduleFreq = normalizeScheduleFreq(full.scheduleFreq)
		const day = normalizeScheduleDay(dialog.form.scheduleFreq, full.scheduleDay)
		dialog.form.scheduleDay = String(day ?? 5)
		const filter = full.filter || {}
		dialog.form.groupIds = Array.isArray(full.groupIds)
			? full.groupIds
			: Array.isArray(filter.groupIds)
				? (filter.groupIds as number[])
				: []
		dialog.form.deviceIdsText = Array.isArray(filter.deviceIds)
			? (filter.deviceIds as number[]).join(",")
			: ""
		dialog.form.locationIdsText = Array.isArray(filter.locationIds)
			? (filter.locationIds as number[]).join(",")
			: ""
		dialog.form.eventKindsText = Array.isArray(filter.eventKinds)
			? (filter.eventKinds as string[]).join(",")
			: ""
		dialog.form.sourcesText = Array.isArray(filter.sources)
			? (filter.sources as string[]).join(",")
			: ""
		dialog.form.statusesText = Array.isArray(filter.statuses)
			? (filter.statuses as string[]).join(",")
			: ""
		dialog.form.grain = normalizeGrainBySchema(
			filterSchema.value,
			filter.grain,
			filter.punchMode,
		)
		dialog.form.sftp = {
			host: full.sftp?.host || "",
			port: String(full.sftp?.port ?? "22"),
			username: full.sftp?.username || "",
			password: "",
			remoteDir: full.sftp?.remoteDir || "",
		}
		dialog.form.fieldConfigs = {}
		const enabledKeys = new Set((full.fields || []).map((f) => f.fieldKey))
		for (const f of full.fields || []) {
			dialog.form.fieldConfigs[f.fieldKey] = {
				enabled: true,
				headerLabel: f.headerLabel || "",
				format: f.format || "",
			}
		}
		initAllFieldConfigs(enabledKeys)
		fieldOrderKeys.value = mergeFieldOrder(
			(full.fields || []).map((f) => f.fieldKey),
			buildCatalogFieldOrder(fields.value),
		)
	}

	const handleCreate = async () => {
		dialog.mode = "create"
		resetDialogForm()
		dialog.open = true
		await loadFieldsForEventType(dialog.form.eventType)
		dialog.form.grain = normalizeGrainBySchema(filterSchema.value, undefined)
		await refreshGroupTree()
	}

	const handleEdit = async (rule: RuleRecord) => {
		dialog.mode = "edit"
		resetDialogForm()
		dialog.open = true
		await loadFieldsForEventType(rule.eventType || "access_control")
		await refreshGroupTree()
		applyRuleToDialog(rule)
	}

	const handleEventTypeChanged = async () => {
		dialog.form.fieldConfigs = {}
		clearDialogFilters()
		await loadFieldsForEventType(dialog.form.eventType)
		dialog.form.grain = normalizeGrainBySchema(filterSchema.value, undefined)
	}

	const handleCloseDialog = () => {
		dialog.open = false
	}

	const buildFieldsPayload = () => {
		const out: RuleField[] = []
		for (const f of orderedFields.value) {
			const cfg = dialog.form.fieldConfigs[f.key]
			if (!cfg?.enabled) continue
			const headerLabel = cfg.headerLabel.trim() || f.label
			const item: RuleField = { fieldKey: f.key, headerLabel }
			if (f.requiresFormat) {
				const format = cfg.format.trim() || getDefaultFormatForField(f)
				if (!format) continue
				item.format = format
			}
			out.push(item)
		}
		return out
	}

	const validateDialogForSave = (): string | null => {
		if (!canAdmin.value) return TOAST.ADMIN_ONLY_RECORD_EXPORT
		if (buildFieldsPayload().length === 0) return TOAST.RECORD_EXPORT_HEADER_REQUIRED
		if (isGroupFilterRequired(filterSchema.value) && dialog.form.groupIds.length === 0) {
			return TOAST.RECORD_EXPORT_GROUP_REQUIRED
		}
		return null
	}

	const openSaveConfirmDialog = (show: (config: ConfirmDialogConfig) => void) => {
		const validationError = validateDialogForSave()
		if (validationError) {
			toast.warning(validationError)
			return
		}
		const name = dialog.form.name.trim() || eventTypeLabel(dialog.form.eventType)
		const isCreate = dialog.mode === "create"
		show({
			title: isCreate ? "確認新增" : "確認儲存",
			message: isCreate
				? `確定要新增規則「${name}」嗎？`
				: `確定要儲存規則「${name}」的變更嗎？`,
			type: "warning",
			confirmText: "儲存",
		})
	}

	const handleSaveDialog = async () => {
		try {
			isSaving.value = true
			const filter = buildFilterPayloadFromForm(filterSchema.value, dialog.form)
			const scheduleFreq = normalizeScheduleFreq(dialog.form.scheduleFreq)
			const body = {
				eventType: dialog.form.eventType,
				name: dialog.form.name,
				filenamePrefix: dialog.form.filenamePrefix,
				dateFormat: dialog.form.dateFormat,
				timeFormat: dialog.form.timeFormat,
				outputFormat: dialog.form.outputFormat,
				columnDelimiter: resolveColumnDelimiterForSave(
					dialog.form.outputFormat,
					dialog.form.columnDelimiter,
				),
				storageType: dialog.form.storageType,
				localDir: dialog.form.storageType === "local" ? dialog.form.localDir : "",
				sftp:
					dialog.form.storageType === "sftp"
						? {
								host: dialog.form.sftp.host,
								port: Number(dialog.form.sftp.port),
								username: dialog.form.sftp.username,
								password: dialog.form.sftp.password,
								remoteDir: dialog.form.sftp.remoteDir,
							}
						: null,
				exportTime: dialog.form.exportTime,
				scheduleFreq,
				scheduleDay: normalizeScheduleDay(scheduleFreq, dialog.form.scheduleDay),
				filter,
				fields: buildFieldsPayload(),
			}

			if (dialog.mode === "create") {
				await request("/record-export/rules", { method: "POST", body })
				toast.success(TOAST.RECORD_EXPORT_CREATED)
			} else {
				await request(`/record-export/rules/${dialog.form.id}`, { method: "PUT", body })
				toast.success(TOAST.RECORD_EXPORT_UPDATED)
			}
			dialog.open = false
			await fetchRules()
		} catch (e) {
			handleError(e, "儲存失敗")
		} finally {
			isSaving.value = false
		}
	}

	const handleDelete = async (id: number) => {
		if (!canAdmin.value) return
		isDeletingId.value = id
		try {
			await request(`/record-export/rules/${id}`, { method: "DELETE" })
			toast.success(TOAST.RECORD_EXPORT_DELETED)
			await fetchRules()
		} catch (e) {
			handleError(e, "刪除失敗")
		} finally {
			isDeletingId.value = null
		}
	}

	onMounted(() => {
		void fetchRules()
	})

	return {
		rules,
		orderedFields,
		isLoading,
		isSaving,
		loadError,
		isDeletingId,
		dialog,
		dialogBusy,
		formDisabled,
		actionLabel,
		groupTree,
		groupTreeLoading,
		eventTypeOptions,
		exportTimeHour,
		exportTimeMinute,
		filterKind,
		filterLabel,
		groupFilterRequired,
		exportMode,
		scheduleFreqOptions,
		showWeekday,
		showMonthDay,
		ruleSchedulePreview,
		dialogSchedulePreview,
		handleScheduleFreqChanged,
		eventTypeLabel,
		handleToggleField,
		draggingFieldKey,
		dragOverFieldKey,
		handleFieldDragStart,
		handleFieldDragEnd,
		handleFieldDragOver,
		handleFieldDragLeave,
		handleFieldDrop,
		handleOutputFormatChanged,
		columnDelimiterInput,
		handleCreate,
		handleEdit,
		handleEventTypeChanged,
		handleCloseDialog,
		openSaveConfirmDialog,
		handleSaveDialog,
		handleDelete,
	}
}
