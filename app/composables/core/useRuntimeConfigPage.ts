import { TOAST } from "~/config/toastCatalog"
import { useApiBase } from "~/composables/core/useApiBase";
import { useAdminOnly } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import {
	type RuntimeConfigSchema,
	buildRuntimePayloadForSave,
	decorateRuntimeFormExtras,
	mergeRuntimeFormValues,
	validateRuntimeConfigForSave,
} from "~/utils/runtimeConfigForm";

type RuntimeConfigResponse = {
	schema: RuntimeConfigSchema;
	values: Record<string, string>;
};

type RuntimeConfigSaveResponse = {
	message: string;
	applied: boolean;
};

export type UseRuntimeConfigPageOptions = {
	autoSave?: boolean;
	autoSaveDebounceMs?: number;
};

export const useRuntimeConfigPage = (options: UseRuntimeConfigPageOptions = {}) => {
	const { autoSave = false, autoSaveDebounceMs = 600 } = options;
	const { request } = useApiBase();
	const canAdmin = useAdminOnly();
	const toast = useToast();
	const { handleError } = useErrorHandler();

	const schema = ref<RuntimeConfigSchema | null>(null);
	const form = reactive<Record<string, string>>({});
	const isLoading = ref(true);
	const isSaving = ref(false);
	const loadError = ref<string | null>(null);

	const formDisabled = computed(() => isLoading.value || isSaving.value || !canAdmin.value);

	const isHydrating = ref(true);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedSnapshot = "";

	const snapshotForm = () => JSON.stringify(form);

	const applyPayload = (data: RuntimeConfigResponse) => {
		isHydrating.value = true;
		schema.value = data.schema;
		Object.assign(form, mergeRuntimeFormValues(data.schema, data.values));
		Object.assign(form, decorateRuntimeFormExtras(data.values));
		savedSnapshot = snapshotForm();
		nextTick(() => {
			isHydrating.value = false;
		});
	};

	const fetchRuntimeConfig = async () => {
		if (!canAdmin.value) return;
		isLoading.value = true;
		loadError.value = null;
		try {
			const data = await request<RuntimeConfigResponse>("/runtime-config", {
				method: "GET",
			});
			applyPayload(data);
		} catch (e) {
			loadError.value = handleError(e, "載入營運設定失敗") ?? "載入營運設定失敗";
		} finally {
			isLoading.value = false;
		}
	};

	const handleSave = async (saveOptions: { silent?: boolean; fromAutoSave?: boolean } = {}) => {
		if (!canAdmin.value) {
			if (!saveOptions.silent) toast.warning(TOAST.ADMIN_ONLY_RUNTIME_CONFIG);
			return false;
		}
		if (!schema.value) return false;

		const validationError = validateRuntimeConfigForSave(schema.value, form);
		if (validationError) {
			if (!saveOptions.silent || saveOptions.fromAutoSave) toast.warning(validationError);
			return false;
		}

		const payload = buildRuntimePayloadForSave(schema.value, form);
		isSaving.value = true;
		try {
			const data = await request<RuntimeConfigSaveResponse>("/runtime-config", {
				method: "PUT",
				body: { values: payload },
			});
			if (!saveOptions.silent) {
				toast[data.applied ? "success" : "info"](data.message);
			}
			await fetchRuntimeConfig();
			return true;
		} catch (e) {
			handleError(e, "儲存失敗");
			return false;
		} finally {
			isSaving.value = false;
		}
	};

	const scheduleAutoSave = () => {
		if (!autoSave || isHydrating.value || isLoading.value || !schema.value || !canAdmin.value) return;
		if (snapshotForm() === savedSnapshot) return;

		if (autoSaveTimer) clearTimeout(autoSaveTimer);
		autoSaveTimer = setTimeout(() => {
			autoSaveTimer = null;
			void handleSave({ silent: true, fromAutoSave: true });
		}, autoSaveDebounceMs);
	};

	if (autoSave) {
		watch(form, scheduleAutoSave, { deep: true });
	}

	onMounted(() => {
		void fetchRuntimeConfig();
	});

	onBeforeUnmount(() => {
		if (autoSaveTimer) clearTimeout(autoSaveTimer);
	});

	return {
		schema,
		form,
		isLoading,
		isSaving,
		loadError,
		formDisabled,
		handleSave,
	};
};
