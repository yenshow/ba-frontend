import { useApiBase } from "~/composables/core/useApiBase";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import {
	type RuntimeConfigSchema,
	getRuntimeSectionRows,
	mergeRuntimeFormValues,
} from "~/utils/runtimeConfigForm";

type RuntimeConfigResponse = {
	schema: RuntimeConfigSchema;
	values: Record<string, string>;
};

export const useRuntimeConfigPage = () => {
	const { request } = useApiBase();
	const { isAdmin } = useAuth();
	const router = useRouter();
	const toast = useToast();
	const { handleError } = useErrorHandler();

	const schema = ref<RuntimeConfigSchema | null>(null);
	const form = reactive<Record<string, string>>({});
	const isLoading = ref(true);
	const isSaving = ref(false);
	const loadError = ref<string | null>(null);

	const formDisabled = computed(() => isLoading.value || isSaving.value || !isAdmin.value);
	const sectionRows = computed(() =>
		schema.value ? getRuntimeSectionRows(schema.value) : [],
	);

	watch(
		() => isAdmin.value,
		async (val) => {
			if (val) return;
			await router.replace("/");
		},
		{ immediate: true },
	);

	const applyPayload = (data: RuntimeConfigResponse) => {
		schema.value = data.schema;
		Object.assign(form, mergeRuntimeFormValues(data.schema, data.values));
	};

	const fetchRuntimeConfig = async () => {
		if (!isAdmin.value) return;
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
		if (!isAdmin.value) {
			toast.warning("僅管理員（admin）可儲存營運設定");
			return;
		}
		if (!schema.value) return;
		isSaving.value = true;
		try {
			const data = await request<{ message: string }>("/runtime-config", {
				method: "PUT",
				body: {
					values: schema.value
						? mergeRuntimeFormValues(schema.value, form)
						: { ...form },
				},
			});
			toast.success(data.message || "已套用營運設定");
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
		sectionRows,
		handleReload,
		handleSave,
	};
};
