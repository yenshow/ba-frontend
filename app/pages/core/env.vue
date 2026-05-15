<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">環境設定</h1>
				<p class="text-base text-white/80 2xl:text-xl">
					以下欄位對應伺服器上的
					<code class="rounded bg-black/20 px-1 text-white/90">.env</code>
					；儲存後<strong class="text-white">不會</strong>自動套用，請開啟「安裝與維護」精靈並執行
					<strong class="text-white">「4) PM2 啟動」</strong>，新變數才會載入。
				</p>
			</div>
		</header>

		<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
			<div
				v-if="loadError"
				class="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
			>
				{{ loadError }}
			</div>
			<div v-else class="space-y-6">
				<div
					v-if="unknownKeys.length"
					class="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
					role="status"
				>
					<p class="font-medium">偵測到未在表單內管理的變數</p>
					<p class="mt-1 text-amber-100/90">
						儲存後將自 .env 移除：
						<code class="rounded bg-black/20 px-1">{{ unknownKeys.join(", ") }}</code>
					</p>
				</div>

				<div
					v-if="validationMessage"
					class="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
					role="alert"
				>
					{{ validationMessage }}
				</div>

				<div
					v-for="(row, rowIdx) in ENV_FORM_SECTION_ROWS"
					:key="`env-row-${rowIdx}`"
					class="grid gap-4 lg:items-stretch"
					:class="row.length > 1 ? 'lg:grid-cols-2' : ''"
				>
					<div
						v-for="section in row"
						:key="section.title"
						class="flex h-full min-h-0 min-w-0 flex-col space-y-4 rounded-xl border border-white/15 bg-black/20 p-4 2xl:p-6"
					>
						<h2 class="text-lg font-semibold text-white 2xl:text-xl">{{ section.title }}</h2>
						<div class="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
							<div
								v-for="field in section.fields"
								:key="field.key"
								class="flex min-w-0 flex-col gap-1"
								:class="{ 'sm:col-span-2': field.kind === 'textarea' }"
							>
								<label
									class="text-sm font-medium text-white/85 2xl:text-base"
									:for="`env-field-${field.key}`"
								>
									{{ field.key }}
								</label>
								<select
									v-if="field.kind === 'select'"
									:id="`env-field-${field.key}`"
									v-model="form[field.key]"
									class="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"
									:disabled="formDisabled"
									:aria-label="field.key"
								>
									<option v-for="opt in field.options" :key="opt.value" :value="opt.value">
										{{ opt.label }}
									</option>
								</select>
								<textarea
									v-else-if="field.kind === 'textarea'"
									:id="`env-field-${field.key}`"
									v-model="form[field.key]"
									rows="3"
									spellcheck="false"
									autocomplete="off"
									class="min-h-[88px] w-full resize-y rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"
									:disabled="formDisabled"
									:placeholder="field.placeholder"
									:aria-label="field.key"
								/>
								<EnvDeploymentPasswordInput
									v-else-if="field.kind === 'password'"
									:model-value="form[field.key] ?? ''"
									:input-id="`env-field-${field.key}`"
									:ariaLabel="field.key"
									:placeholder="field.placeholder"
									:disabled="formDisabled"
									@update:model-value="v => (form[field.key] = v)"
								/>
								<input
									v-else
									:id="`env-field-${field.key}`"
									v-model="form[field.key]"
									:inputmode="field.kind === 'number' ? 'numeric' : undefined"
									:pattern="field.kind === 'number' ? '[0-9]*' : undefined"
									spellcheck="false"
									autocomplete="off"
									class="rounded-lg border border-white/20 bg-black/30 px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:text-base"
									:disabled="formDisabled"
									:placeholder="field.placeholder"
									:aria-label="field.key"
								/>
							</div>
						</div>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
						:disabled="formDisabled"
						aria-label="儲存環境設定"
						@click="handleSave"
					>
						{{ isSaving ? "儲存中…" : "儲存" }}
					</button>
					<button
						type="button"
						class="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
						:disabled="formDisabled"
						aria-label="重新載入"
						@click="handleReload"
					>
						重新載入
					</button>
				</div>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { useApiBase } from "~/composables/core/useApiBase";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import EnvDeploymentPasswordInput from "~/components/common/EnvDeploymentPasswordInput.vue";
import {
	ENV_FORM_SECTION_ROWS,
	createEmptyEnvFormValues,
	normalizeEnvFormValuesFromParsed,
	parseEnvFileContent,
	serializeEnvFormValues,
	validateEnvFormValues
} from "~/utils/deploymentEnvForm";

definePageMeta({
	layout: "auxiliary",
	middleware: ["admin"]
});

const { request } = useApiBase();
const { isAdmin } = useAuth();
const router = useRouter();
const toast = useToast();
const { handleError } = useErrorHandler();

const form = reactive(createEmptyEnvFormValues());
const preservedLicense = ref<Record<string, string>>({});
const unknownKeys = ref<string[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const loadError = ref<string | null>(null);
const validationMessage = ref<string | null>(null);

const formDisabled = computed(() => isLoading.value || isSaving.value || !isAdmin.value);

watch(
	() => isAdmin.value,
	async val => {
		if (val) return;
		await router.replace("/");
	},
	{ immediate: true }
);

const applyParsedToForm = (content: string) => {
	const parsed = parseEnvFileContent(content);
	unknownKeys.value = parsed.unknownKeys;
	preservedLicense.value = { ...parsed.preservedLicense };
	Object.assign(form, normalizeEnvFormValuesFromParsed(parsed.values));
};

const fetchEnv = async () => {
	if (!isAdmin.value) return;
	isLoading.value = true;
	loadError.value = null;
	validationMessage.value = null;
	try {
		const data = await request<{ content: string }>("/deployment/env-file", { method: "GET" });
		applyParsedToForm(data.content ?? "");
	} catch (e) {
		loadError.value = handleError(e, "載入環境檔失敗") ?? "載入環境檔失敗";
	} finally {
		isLoading.value = false;
	}
};

const handleReload = async () => {
	await fetchEnv();
	toast.success("已重新載入");
};

const handleSave = async () => {
	if (!isAdmin.value) {
		toast.warning("僅管理員（admin）可儲存環境檔");
		return;
	}
	validationMessage.value = validateEnvFormValues(form);
	if (validationMessage.value) return;
	const content = serializeEnvFormValues(form, preservedLicense.value);
	if (!content.trim()) {
		toast.warning("內容不可為空白");
		return;
	}
	isSaving.value = true;
	try {
		const data = await request<{ message: string }>("/deployment/env-file", {
			method: "PUT",
			body: { content }
		});
		toast.success(data.message || "已儲存");
		unknownKeys.value = [];
	} catch (e) {
		handleError(e, "儲存失敗");
	} finally {
		isSaving.value = false;
	}
};

onMounted(() => {
	void fetchEnv();
});
</script>
