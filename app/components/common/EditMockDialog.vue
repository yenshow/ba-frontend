<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@click.self="handleClose"
				@keydown.esc="handleClose"
			>
				<div
					class="dialog-panel-bg flex w-full max-w-md flex-col gap-4 rounded-3xl p-6 2xl:max-w-xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<h3 :id="titleId" class="text-xl font-semibold tracking-[2px] text-white 2xl:text-2xl">
								{{ title }}
							</h3>
							<p v-if="description" class="mt-2 text-sm text-white/60 2xl:text-base">
								{{ description }}
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="space-y-4">
						<div v-if="inputMode === 'text'">
							<label class="block text-base font-medium text-white/80 2xl:text-lg" :for="inputId"
								>內容</label
							>
							<input
								:id="inputId"
								ref="textInputRef"
								v-model="draftValue"
								type="text"
								:placeholder="placeholder"
								class="form-input-small mt-2 w-full"
							/>
							<p v-if="hint" class="mt-2 text-sm text-white/50 2xl:text-base">
								{{ hint }}
							</p>
						</div>

						<div v-else-if="inputMode === 'image'">
							<label class="block text-base font-medium text-white/80 2xl:text-lg" :for="inputId"
								>圖片（URL 或上傳）</label
							>
							<div class="mt-2 flex items-center gap-3">
								<input
									:id="inputId"
									ref="textInputRef"
									v-model="draftValue"
									type="text"
									:placeholder="placeholder"
									class="form-input-small min-w-0 flex-1"
								/>
								<input
									ref="fileInputRef"
									type="file"
									accept="image/*"
									class="hidden"
									@change="handleFileChange"
								/>
								<button
									type="button"
									class="btn-secondary flex-shrink-0 whitespace-nowrap text-sm 2xl:text-base"
									aria-label="上傳圖片"
									@click="handlePickFile"
								>
									上傳圖片
								</button>
							</div>

							<div
								v-if="draftValue?.trim()"
								class="mt-4 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3"
							>
								<div class="text-sm text-white/60 2xl:text-base">預覽</div>
								<img
									:src="previewResolvedUrl"
									:alt="previewAlt"
									class="mt-2 max-h-40 w-full rounded-lg object-contain"
								/>
							</div>
						</div>

						<div v-else>
							<label class="block text-base font-medium text-white/80 2xl:text-lg" :for="inputId">
								影片（連結或上傳）
							</label>
							<div class="mt-2 flex items-center gap-3">
								<input
									:id="inputId"
									ref="textInputRef"
									v-model="draftValue"
									type="text"
									:placeholder="placeholder"
									class="form-input-small min-w-0 flex-1"
								/>
								<input
									ref="fileInputRef"
									type="file"
									accept="video/*"
									class="hidden"
									@change="handleFileChange"
								/>
								<button
									type="button"
									class="btn-secondary flex-shrink-0 whitespace-nowrap text-sm 2xl:text-base"
									aria-label="上傳影片"
									@click="handlePickFile"
								>
									上傳影片
								</button>
							</div>

							<div
								v-if="draftValue?.trim()"
								class="mt-4 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3"
							>
								<div class="text-sm text-white/60 2xl:text-base">預覽</div>
								<video
									v-if="isVideoPreviewUrl"
									:src="previewResolvedUrl"
									class="mt-2 max-h-40 w-full rounded-lg object-contain"
									controls
									muted
									playsinline
								/>
								<p v-else class="mt-2 text-sm text-white/70 2xl:text-base">
									{{ isYouTubeLink ? "已設定 YouTube 連結" : "已設定影片連結" }}
								</p>
							</div>
						</div>
					</div>

					<footer class="flex items-center gap-3 border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" aria-label="重設為預設值" @click="handleReset">
							重設
						</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-secondary" aria-label="取消" @click="handleClose">
							取消
						</button>
						<button type="button" class="btn-primary" aria-label="儲存" @click="handleSave">儲存</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { useUploadBaseUrl } from "~/composables/core/useUploadBaseUrl";
import { resolveUploadUrl } from "~/utils/apiUtils";

type InputMode = "text" | "image" | "video";

type Props = {
	modelValue: boolean;
	title: string;
	description?: string;
	value: string;
	inputMode?: InputMode;
	placeholder?: string;
	previewAlt?: string;
	hint?: string;
};

const props = withDefaults(defineProps<Props>(), {
	description: "",
	inputMode: "text",
	placeholder: "",
	previewAlt: "預覽圖片",
	hint: ""
});

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void;
	(e: "save", value: string): void;
	(e: "reset"): void;
	(e: "upload", file: File): void;
}>();

const titleId = computed(() => `edit-mock-dialog-title-${Math.random().toString(36).slice(2)}`);
const inputId = computed(() => `edit-mock-dialog-input-${Math.random().toString(36).slice(2)}`);

const draftValue = ref<string>(props.value ?? "");
const textInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const apiBase = useUploadBaseUrl();
const previewResolvedUrl = computed(() =>
	resolveUploadUrl(draftValue.value ?? "", apiBase)
);

const isYouTubeLink = computed(() => {
	const src = draftValue.value?.trim() ?? "";
	return src.includes("youtube.com") || src.includes("youtu.be");
});

/** 影片模式：僅對非 YouTube 連結顯示 <video> 預覽 */
const isVideoPreviewUrl = computed(() => {
	const src = draftValue.value?.trim() ?? "";
	return src.length > 0 && !isYouTubeLink.value;
});

watch(
	() => props.modelValue,
	isOpen => {
		if (!isOpen) {
			return;
		}

		draftValue.value = props.value ?? "";
		nextTick(() => {
			textInputRef.value?.focus?.();
		});
	}
);

watch(
	() => props.value,
	nextValue => {
		if (!props.modelValue) {
			draftValue.value = nextValue ?? "";
		}
	}
);

const handleClose = () => {
	emit("update:modelValue", false);
};

const handleSave = () => {
	emit("save", draftValue.value ?? "");
	emit("update:modelValue", false);
};

const handleReset = () => {
	emit("reset");
	emit("update:modelValue", false);
};

const handlePickFile = () => {
	fileInputRef.value?.click?.();
};

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement | null;
	const file = target?.files?.[0];
	if (!file) {
		return;
	}

	// 圖片或影片模式：觸發上傳事件（由父元件處理）
	if (props.inputMode === "image" || props.inputMode === "video") {
		emit("upload", file);
		if (target) {
			target.value = "";
		}
		return;
	}

	// 文字模式：讀取為 Base64（保留舊行為以向後兼容）
	const readAsDataUrl = () =>
		new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result ?? ""));
			reader.onerror = () => reject(new Error("FileReader failed"));
			reader.readAsDataURL(file);
		});

	try {
		const dataUrl = await readAsDataUrl();
		if (!dataUrl?.trim?.()) {
			return;
		}
		draftValue.value = dataUrl;
	} catch {
		// 忽略讀取失敗
	} finally {
		if (target) {
			target.value = "";
		}
	}
};
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}

.btn-primary,
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 1rem;
	cursor: pointer;
	transition: all 0.2s ease;
	border: none;
}

.btn-primary {
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}

.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}

.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-secondary {
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}

.btn-secondary:hover:not(:disabled) {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}

.btn-secondary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>
