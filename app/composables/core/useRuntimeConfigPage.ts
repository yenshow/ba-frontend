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

export const useRuntimeConfigPage = () => {
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

	const applyPayload = (data: RuntimeConfigResponse) => {
		schema.value = data.schema;
		Object.assign(form, mergeRuntimeFormValues(data.schema, data.values));
		Object.assign(form, decorateRuntimeFormExtras(data.values));
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

	const handleReload = async () => {
		await fetchRuntimeConfig();
		toast.success("已重新載入");
	};

	const handleSave = async () => {
		if (!canAdmin.value) {
			toast.warning("僅管理員可儲存營運設定");
			return;
		}
		if (!schema.value) return;

		const validationError = validateRuntimeConfigForSave(schema.value, form);
		if (validationError) {
			toast.warning(validationError);
			return;
		}

		const payload = buildRuntimePayloadForSave(schema.value, form);
		isSaving.value = true;
		try {
			const data = await request<RuntimeConfigSaveResponse>("/runtime-config", {
				method: "PUT",
				body: { values: payload },
			});
			toast[data.applied ? "success" : "info"](data.message);
			await fetchRuntimeConfig();
		} catch (e) {
			handleError(e, "儲存失敗");
		} finally {
			isSaving.value = false;
		}
	};

	onMounted(() => {
		void fetchRuntimeConfig();
	});

	return {
		schema,
		form,
		isLoading,
		isSaving,
		loadError,
		formDisabled,
		handleReload,
		handleSave,
	};
};
