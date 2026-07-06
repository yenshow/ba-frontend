import { TOAST } from "~/config/toastCatalog"
import { useApiBase } from "~/composables/core/useApiBase";
import { useAdminOnly } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelGroupTree } from "~/composables/systems/personnel/usePersonnelGroupTree";
import type { AccessControlFieldCatalogItem } from "~/utils/externalIntegration";
import {
	DATE_FORMAT_OPTIONS,
	OUTPUT_FORMAT_OPTIONS,
	STORAGE_TYPE_OPTIONS,
	TIME_FORMAT_OPTIONS,
} from "~/utils/externalIntegration";

type RuleField = {
	fieldKey: string;
	headerLabel?: string;
	format?: string;
};

type RuleRecord = {
	id: number;
	name: string;
	description?: string;
	filenamePrefix?: string;
	dateFormat?: string;
	timeFormat?: string;
	outputFormat: "csv" | "txt";
	storageType: "local" | "sftp";
	localDir?: string;
	exportTime: string;
	groupIds?: number[];
	sftp?: { host?: string; port?: number; username?: string; remoteDir?: string };
	fields?: RuleField[];
};

type RuleResponse = {
	rules: RuleRecord[];
	fields: Array<AccessControlFieldCatalogItem>;
};

type RuleDialogForm = {
	id: number | null;
	name: string;
	description: string;
	filenamePrefix: string;
	dateFormat: string;
	timeFormat: string;
	outputFormat: "csv" | "txt";
	storageType: "local" | "sftp";
	localDir: string;
	sftp: { host: string; port: string; username: string; password: string; remoteDir: string };
	exportTime: string;
	groupIds: number[];
	fieldConfigs: Record<string, { headerLabel: string; format: string }>;
};

const createEmptyForm = (): RuleDialogForm => ({
	id: null,
	name: "",
	description: "",
	filenamePrefix: "AcsRecord_Record",
	dateFormat: "yyyy-MM-dd",
	timeFormat: "HHmmss",
	outputFormat: "csv",
	storageType: "local",
	localDir: "",
	sftp: { host: "", port: "22", username: "", password: "", remoteDir: "" },
	exportTime: "00:00",
	groupIds: [],
	fieldConfigs: {},
});

type FormDropdownOption = { value: string; label: string };

export const useRecordExportRulesForm = () => {
	const { request } = useApiBase();
	const canAdmin = useAdminOnly();
	const toast = useToast();
	const { handleError } = useErrorHandler();

	const {
		groupTree,
		isLoading: groupTreeLoading,
		refresh: refreshGroupTree,
	} = usePersonnelGroupTree();

	const rules = ref<RuleRecord[]>([]);
	const fields = ref<Array<AccessControlFieldCatalogItem>>([]);
	const isLoading = ref(true);
	const isSaving = ref(false);
	const loadError = ref<string | null>(null);
	const isDeletingId = ref<number | null>(null);

	const dialog = reactive<{ open: boolean; mode: "create" | "edit"; form: RuleDialogForm }>({
		open: false,
		mode: "create",
		form: createEmptyForm(),
	});

	const dialogBusy = computed(() => !canAdmin.value || isSaving.value);
	const formDisabled = computed(() => isLoading.value || !canAdmin.value);
	const actionLabel = "新增規則";

	const ensureRuleField = (key: string) => {
		if (!dialog.form.fieldConfigs[key]) {
			dialog.form.fieldConfigs[key] = { headerLabel: "", format: "" };
		}
	};

	const initAllFieldConfigs = () => {
		for (const f of fields.value) {
			ensureRuleField(f.key);
		}
	};

	const resetDialogForm = () => {
		dialog.form = createEmptyForm();
	};

	const fetchRules = async () => {
		if (!canAdmin.value) return;
		isLoading.value = true;
		loadError.value = null;
		try {
			const data = await request<RuleResponse>("/record-export/rules?eventType=access_control", {
				method: "GET",
			});
			fields.value = data.fields || [];
			rules.value = data.rules || [];
		} catch (e) {
			loadError.value = handleError(e, "載入記錄轉存規則失敗") ?? "載入記錄轉存規則失敗";
		} finally {
			isLoading.value = false;
		}
	};

	const applyRuleToDialog = (full: RuleRecord) => {
		dialog.form.id = full.id;
		dialog.form.name = full.name || "";
		dialog.form.description = full.description || "";
		dialog.form.filenamePrefix = full.filenamePrefix || "AcsRecord_Record";
		dialog.form.dateFormat = full.dateFormat || "yyyy-MM-dd";
		dialog.form.timeFormat = full.timeFormat || "HHmmss";
		dialog.form.outputFormat = full.outputFormat || "csv";
		dialog.form.storageType = full.storageType || "local";
		dialog.form.localDir = full.localDir || "";
		dialog.form.exportTime = full.exportTime || "00:00";
		dialog.form.groupIds = Array.isArray(full.groupIds) ? full.groupIds : [];
		dialog.form.sftp = {
			host: full.sftp?.host || "",
			port: String(full.sftp?.port ?? "22"),
			username: full.sftp?.username || "",
			password: "",
			remoteDir: full.sftp?.remoteDir || "",
		};
		dialog.form.fieldConfigs = {};
		for (const f of full.fields || []) {
			ensureRuleField(f.fieldKey);
			dialog.form.fieldConfigs[f.fieldKey].headerLabel = f.headerLabel || "";
			dialog.form.fieldConfigs[f.fieldKey].format = f.format || "";
		}
		initAllFieldConfigs();
	};

	const handleCreate = async () => {
		dialog.mode = "create";
		resetDialogForm();
		initAllFieldConfigs();
		dialog.open = true;
		await refreshGroupTree();
	};

	const handleEdit = async (rule: RuleRecord) => {
		dialog.mode = "edit";
		resetDialogForm();
		dialog.open = true;
		await refreshGroupTree();
		applyRuleToDialog(rule);
	};

	const handleCloseDialog = () => {
		dialog.open = false;
	};

	const buildFieldsPayload = () => {
		const out: RuleField[] = [];
		for (const f of fields.value) {
			const cfg = dialog.form.fieldConfigs[f.key];
			if (!cfg) continue;
			const headerLabel = cfg.headerLabel.trim();
			if (!headerLabel) continue;
			const item: RuleField = { fieldKey: f.key, headerLabel };
			if (f.requiresFormat) {
				const format = cfg.format.trim();
				if (!format) continue;
				item.format = format;
			}
			out.push(item);
		}
		return out;
	};

	const handleSaveDialog = async () => {
		if (!canAdmin.value) {
			toast.warning(TOAST.ADMIN_ONLY_RECORD_EXPORT);
			return;
		}
		const fieldsPayload = buildFieldsPayload();
		if (fieldsPayload.length === 0) {
			toast.warning(TOAST.RECORD_EXPORT_HEADER_REQUIRED);
			return;
		}
		if (dialog.form.groupIds.length === 0) {
			toast.warning(TOAST.RECORD_EXPORT_GROUP_REQUIRED);
			return;
		}

		try {
			isSaving.value = true;
			const body = {
				name: dialog.form.name,
				description: dialog.form.description,
				filenamePrefix: dialog.form.filenamePrefix,
				dateFormat: dialog.form.dateFormat,
				timeFormat: dialog.form.timeFormat,
				outputFormat: dialog.form.outputFormat,
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
				groupIds: dialog.form.groupIds,
				fields: fieldsPayload,
			};

			if (dialog.mode === "create") {
				await request("/record-export/rules", { method: "POST", body });
				toast.success(TOAST.RECORD_EXPORT_CREATED);
			} else {
				await request(`/record-export/rules/${dialog.form.id}`, { method: "PUT", body });
				toast.success(TOAST.RECORD_EXPORT_UPDATED);
			}
			dialog.open = false;
			await fetchRules();
		} catch (e) {
			handleError(e, "儲存失敗");
		} finally {
			isSaving.value = false;
		}
	};

	const handleDelete = async (id: number) => {
		if (!canAdmin.value) return;
		isDeletingId.value = id;
		try {
			await request(`/record-export/rules/${id}`, { method: "DELETE" });
			toast.success(TOAST.RECORD_EXPORT_DELETED);
			await fetchRules();
		} catch (e) {
			handleError(e, "刪除失敗");
		} finally {
			isDeletingId.value = null;
		}
	};

	const dateFormatOptions: FormDropdownOption[] = DATE_FORMAT_OPTIONS.map(({ label, value }) => ({
		label,
		value,
	}));
	const timeFormatOptions: FormDropdownOption[] = TIME_FORMAT_OPTIONS.map(({ label, value }) => ({
		label,
		value,
	}));
	const outputFormatOptions: FormDropdownOption[] = OUTPUT_FORMAT_OPTIONS.map(({ label, value }) => ({
		label,
		value,
	}));
	const storageTypeOptions: FormDropdownOption[] = STORAGE_TYPE_OPTIONS.map(({ label, value }) => ({
		label,
		value,
	}));

	onMounted(() => {
		void fetchRules();
	});

	return {
		rules,
		fields,
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
		dateFormatOptions,
		timeFormatOptions,
		outputFormatOptions,
		storageTypeOptions,
		handleCreate,
		handleEdit,
		handleCloseDialog,
		handleSaveDialog,
		handleDelete,
	};
};
