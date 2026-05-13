<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">環境設定</h1>
				<p class="text-base text-white/80 2xl:text-xl">
					編輯伺服器上的
					<code class="rounded bg-black/20 px-1 text-white/90">.env</code>
					；<strong class="text-white">僅限角色 admin</strong>（操作員、檢視者無法進入或儲存）。儲存後<strong
						class="text-white"
						>不會</strong
					>自動套用，必須在伺服器上手動重啟
					<code class="rounded bg-black/20 px-1 text-white/90">ba-backend</code>
					進程，新變數才會載入。
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
			<div v-else class="space-y-4">
				<label class="block text-lg font-semibold text-white/90 2xl:text-2xl" for="env-editor">
					環境檔
				</label>
				<textarea
					id="env-editor"
					v-model="content"
					rows="12"
					spellcheck="false"
					autocomplete="off"
					class="min-h-[320px] w-full resize-y rounded-xl border border-white/20 bg-black/30 p-4 font-mono text-sm text-white placeholder:text-white/40 focus:border-teal-400/60 focus:outline-none focus:ring-1 focus:ring-teal-400/40 2xl:min-h-[400px] 2xl:p-5 2xl:text-base"
					:disabled="isLoading || isSaving || !isAdmin"
					aria-label="環境設定內容"
				/>
				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40 2xl:px-6 2xl:py-3 2xl:text-base"
						:disabled="isLoading || isSaving || !isAdmin"
						aria-label="儲存環境檔"
						@click="handleSave"
					>
						{{ isSaving ? "儲存中…" : "儲存" }}
					</button>
					<button
						type="button"
						class="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
						:disabled="isLoading || isSaving || !isAdmin"
						aria-label="重新載入"
						@click="handleReload"
					>
						重新載入
					</button>
				</div>
			</div>
		</section>

		<section
			class="rounded-2xl border border-teal-400/30 bg-teal-950/30 p-6 text-sm text-white/85 2xl:p-8 2xl:text-base"
			aria-labelledby="pm2-steps-heading"
		>
			<h2 id="pm2-steps-heading" class="text-lg font-semibold text-white 2xl:text-xl">
				儲存後：重啟後端（PM2）
			</h2>
			<ol class="mt-4 list-decimal space-y-2 pl-5 marker:text-teal-300">
				<li>找到資料夾中的 ecosystem.config.cjs 檔案 並進行修改</li>
				<li>
					執行重啟指令
					<code class="rounded bg-black/30 px-1">pm2 restart ba-backend</code>
				</li>
				<li>
					（建議）執行 <code class="rounded bg-black/30 px-1">pm2 status</code>，確認
					<code class="rounded bg-black/30 px-1">ba-backend</code> 為
					<code class="rounded bg-black/30 px-1">online</code>。
				</li>
				<li>
					執行
					<code class="rounded bg-black/30 px-1">pm2 save</code>
					將目前程序寫入持久化設定。
				</li>
			</ol>
			<p class="mt-4 border-t border-white/10 pt-4 text-white/65">
				若曾修改
				<code class="rounded bg-black/30 px-1">PORT</code>
				等連線相關變數，請一併確認前端 Nitro 的
				<code class="rounded bg-black/30 px-1">NUXT_API_PROXY_TARGET</code>
				是否仍指向正確後端位址，必要時重啟前端 PM2 進程或重新打包安裝檔。
			</p>
		</section>
	</div>
</template>

<script setup lang="ts">
import { useApiBase } from "~/composables/core/useApiBase";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

definePageMeta({
	layout: "default",
	middleware: ["admin"]
});

type EnvFileGetResponse = {
	content: string;
};

type EnvFilePutResponse = {
	message: string;
};

const { request } = useApiBase();
const { isAdmin } = useAuth();
const router = useRouter();
const toast = useToast();
const { handleError } = useErrorHandler();

const content = ref("");
const isLoading = ref(true);
const isSaving = ref(false);
const loadError = ref<string | null>(null);

watch(
	() => isAdmin.value,
	async val => {
		if (val) return;
		await router.replace("/");
	},
	{ immediate: true }
);

const fetchEnv = async () => {
	if (!isAdmin.value) {
		return;
	}
	isLoading.value = true;
	loadError.value = null;
	try {
		const data = await request<EnvFileGetResponse>("/deployment/env-file", { method: "GET" });
		content.value = data.content ?? "";
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
	if (!content.value.trim()) {
		toast.warning("內容不可為空白");
		return;
	}
	isSaving.value = true;
	try {
		const data = await request<EnvFilePutResponse>("/deployment/env-file", {
			method: "PUT",
			body: { content: content.value }
		});
		toast.success(data.message || "已儲存");
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
