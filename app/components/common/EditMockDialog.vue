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
				<div class="dialog-panel-bg flex w-full max-w-md flex-col gap-4 rounded-3xl p-6 2xl:max-w-xl 2xl:gap-6 2xl:p-8">
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
						<label class="block text-base font-medium text-white/80 2xl:text-lg" :for="inputId">內容</label>
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

					<div v-else>
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
								class="form-input-small flex-1 min-w-0"
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
								class="btn-secondary text-sm 2xl:text-base whitespace-nowrap flex-shrink-0"
								aria-label="上傳圖片"
								@click="handlePickFile"
							>
								上傳圖片
							</button>
						</div>

						<div v-if="draftValue?.trim()" class="mt-4 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3">
							<div class="text-sm text-white/60 2xl:text-base">預覽</div>
							<img
								:src="previewImageSrc"
								:alt="previewAlt"
								class="mt-2 max-h-40 w-full rounded-lg object-contain"
							/>
						</div>
					</div>
				</div>

					<footer class="flex items-center gap-3 border-t border-white/20 pt-4">
						<button
							type="button"
							class="btn-secondary"
							aria-label="重設為預設值"
							@click="handleReset"
						>
							重設
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-secondary"
							aria-label="取消"
							@click="handleClose"
						>
							取消
						</button>
						<button
							type="button"
							class="btn-primary"
							aria-label="儲存"
							@click="handleSave"
						>
							儲存
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
type InputMode = "text" | "image";

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

// 處理圖片預覽 URL：如果是後端上傳的檔案，加上 API base URL
const config = useRuntimeConfig();
const apiBase = config.public.apiBase || "http://localhost:4000";
const previewImageSrc = computed(() => {
	const src = draftValue.value;
	if (!src) return "";
	
	// 如果是後端上傳的檔案 URL（以 /uploads/ 開頭），加上 API base
	if (src.startsWith("/uploads/")) {
		return `${apiBase}${src}`;
	}
	
	// 其他情況（相對路徑、完整 URL 或 Base64）直接返回
	return src;
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

	// 如果是圖片模式，觸發上傳事件（由父元件處理）
	if (props.inputMode === "image") {
		emit("upload", file);
		// 清空 input，允許重複選擇同一檔案
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

