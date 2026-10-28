import type { Ref } from "vue"
import { TOAST } from "~/config/toastCatalog"
import type { PersonnelApi, PersonnelHandleApiError } from "~/composables/systems/personnel/usePersonnelApi"
import { PERSONNEL_API_ERROR_OPTS } from "~/composables/systems/personnel/usePersonnelApi"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { FORM_UNSAVED_CLOSE_CONFIRM } from "~/utils/formDialog"
import { resolveFormApiError } from "~/utils/apiError"
import {
	PERSONNEL_MAX_PROFILE_FIELDS,
	PERSONNEL_PROFILE_PRESET_CATALOG,
	PERSONNEL_PROFILE_PRESET_KEYS,
	clonePersonnelProfileSchema,
	emptyPersonnelProfileSchema,
	nextPersonnelCustomFieldKey,
	normalizePersonnelProfileSchema,
	type PersonnelProfileField,
	type PersonnelProfilePresetKey,
	type PersonnelProfileSchema,
	type PersonnelToggleableListColumn,
} from "~/utils/personnelProfileFields"

const uniqueCustomLabel = (fields: PersonnelProfileField[]): string => {
	const used = new Set(fields.map((f) => f.label.trim()))
	if (!used.has("自訂欄位")) return "自訂欄位"
	let i = 2
	while (used.has(`自訂欄位${i}`)) i += 1
	return `自訂欄位${i}`
}

const schemaSnapshot = (schema: PersonnelProfileSchema): string =>
	JSON.stringify({
		fields: schema.fields.map((f) => ({ key: f.key, preset: f.preset, label: f.label.trim() })),
		listColumns: schema.listColumns,
	})

export const usePersonnelProfileFieldsDialog = (params: {
	personnelApi: PersonnelApi
	toast: { success: (msg: string) => void; error: (msg: string) => void }
	handleApiError: PersonnelHandleApiError
	schema: Ref<PersonnelProfileSchema>
	onSaved?: () => void
}) => {
	const showDialog = ref(false)
	const isSaving = ref(false)
	const errorMessage = ref<string | null>(null)
	const draft = ref<PersonnelProfileSchema>(emptyPersonnelProfileSchema())
	const snapshot = ref("")
	const closeConfirm = useConfirmDialog()

	const hasUnsavedChanges = computed(() => schemaSnapshot(draft.value) !== snapshot.value)
	const changedFieldsList = computed(() => (hasUnsavedChanges.value ? ["欄位設定"] : []))
	const enabledCount = computed(() => draft.value.fields.length)
	const atFieldLimit = computed(() => enabledCount.value >= PERSONNEL_MAX_PROFILE_FIELDS)

	const openDialog = () => {
		draft.value = clonePersonnelProfileSchema(
			normalizePersonnelProfileSchema(params.schema.value),
		)
		snapshot.value = schemaSnapshot(draft.value)
		errorMessage.value = null
		showDialog.value = true
	}

	const closeDialog = () => {
		showDialog.value = false
	}

	const requestClose = () => {
		if (hasUnsavedChanges.value) {
			closeConfirm.show(FORM_UNSAVED_CLOSE_CONFIRM)
			return
		}
		closeDialog()
	}

	const isPresetEnabled = (preset: PersonnelProfilePresetKey) =>
		draft.value.fields.some((field) => field.key === preset)

	const togglePreset = (preset: PersonnelProfilePresetKey, enabled: boolean) => {
		if (enabled) {
			if (isPresetEnabled(preset) || atFieldLimit.value) return
			draft.value.fields = [
				...draft.value.fields,
				{
					key: preset,
					preset,
					label: PERSONNEL_PROFILE_PRESET_CATALOG[preset].label,
				},
			]
			if (!draft.value.listColumns.custom.includes(preset)) {
				draft.value.listColumns.custom = [...draft.value.listColumns.custom, preset]
			}
			return
		}
		draft.value.fields = draft.value.fields.filter((field) => field.key !== preset)
		draft.value.listColumns.custom = draft.value.listColumns.custom.filter((key) => key !== preset)
	}

	const updateFieldLabel = (key: string, label: string) => {
		draft.value.fields = draft.value.fields.map((field) =>
			field.key === key ? { ...field, label } : field,
		)
	}

	const addCustomField = () => {
		if (atFieldLimit.value) return
		const key = nextPersonnelCustomFieldKey(draft.value.fields)
		const label = uniqueCustomLabel(draft.value.fields)
		draft.value.fields = [...draft.value.fields, { key, preset: "custom", label }]
		draft.value.listColumns.custom = [...draft.value.listColumns.custom, key]
	}

	const removeCustomField = (key: string) => {
		draft.value.fields = draft.value.fields.filter((field) => field.key !== key)
		draft.value.listColumns.custom = draft.value.listColumns.custom.filter((k) => k !== key)
	}

	const setListColumn = (column: PersonnelToggleableListColumn, visible: boolean) => {
		draft.value.listColumns = { ...draft.value.listColumns, [column]: visible }
	}

	const setCustomListVisible = (key: string, visible: boolean) => {
		const current = draft.value.listColumns.custom
		if (visible) {
			if (current.includes(key)) return
			draft.value.listColumns.custom = [...current, key]
			return
		}
		draft.value.listColumns.custom = current.filter((k) => k !== key)
	}

	const customFields = computed(() => draft.value.fields.filter((field) => field.preset === "custom"))

	const save = async () => {
		isSaving.value = true
		errorMessage.value = null
		try {
			const saved = await params.personnelApi.saveProfileSchema(draft.value)
			params.schema.value = normalizePersonnelProfileSchema(saved)
			snapshot.value = schemaSnapshot(params.schema.value)
			params.toast.success(TOAST.PERSONNEL_PROFILE_SCHEMA_SAVED)
			showDialog.value = false
			params.onSaved?.()
		} catch (err) {
			errorMessage.value = resolveFormApiError(err, "儲存人員欄位失敗")
			params.handleApiError(err, "儲存人員欄位失敗", PERSONNEL_API_ERROR_OPTS)
		} finally {
			isSaving.value = false
		}
	}

	return {
		showDialog,
		draft,
		isSaving,
		errorMessage,
		hasUnsavedChanges,
		changedFieldsList,
		enabledCount,
		atFieldLimit,
		presetKeys: PERSONNEL_PROFILE_PRESET_KEYS,
		customFields,
		openDialog,
		requestClose,
		confirmClose: closeDialog,
		showCloseConfirmDialog: closeConfirm.showDialog,
		closeConfirmConfig: closeConfirm.config,
		isPresetEnabled,
		togglePreset,
		updateFieldLabel,
		addCustomField,
		removeCustomField,
		setListColumn,
		setCustomListVisible,
		save,
	}
}
