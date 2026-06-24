import { useApiBase } from "~/composables/core/useApiBase";
import { useAdminOnly } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import {
	type RuntimeConfigCapabilities,
	type RuntimeConfigSchema,
	type RuntimeConfigSideEffects,
	buildRuntimePayloadForSave,
	decorateRuntimeFormExtras,
	formatRuntimeSaveFeedback,
	mergeRuntimeFormValues,
	validateRuntimeConfigForSave,
} from "~/utils/runtimeConfigForm";

type RuntimeConfigResponse = {
	schema: RuntimeConfigSchema;
	values: Record<string, string>;
	capabilities: RuntimeConfigCapabilities;
};

type RuntimeConfigSaveResponse = {
	message: string;
	applied: boolean;
	changedKeys: string[];
	sideEffects?: RuntimeConfigSideEffects;
	capabilities?: RuntimeConfigCapabilities;
};

export const useRuntimeConfigPage = () => {
	const { request } = useApiBase();
	const canAdmin = useAdminOnly();
	const toast = useToast();
	const { handleError } = useErrorHandler();

	const schema = ref<RuntimeConfigSchema | null>(null);
	const capabilities = ref<RuntimeConfigCapabilities>({ yscpDatabase: true });
	const form = reactive<Record<string, string>>({});
	const isLoading = ref(true);
	const isSaving = ref(false);
	const loadError = ref<string | null>(null);

	const formDisabled = computed(() => isLoading.value || isSaving.value || !canAdmin.value);

	const applyPayload = (data: RuntimeConfigResponse) => {
		schema.value = data.schema;
		capabilities.value = data.capabilities ?? { yscpDatabase: true };
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

		const validationError = validateRuntimeConfigForSave(
			schema.value,
			form,
			capabilities.value,
		);
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
			if (data.capabilities) {
				capabilities.value = data.capabilities;
			}
			const feedback = formatRuntimeSaveFeedback(data.applied, data.sideEffects);
			toast[feedback.toast](feedback.message);
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
