<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[3000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
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
							<p v-if="hint" class="mt-2 whitespace-pre-line text-sm text-white/50 2xl:text-base">
								{{ hint }}
							</p>
						</div>

						<div v-else-if="inputMode === 'range'">
							<label class="block text-base font-medium text-white/80 2xl:text-lg" :for="inputId">
								{{ rangeLabel }}
							</label>

							<div class="mt-3 flex items-center gap-3">
								<input
									v-model.number="rangeUiValue"
									type="range"
									:id="inputId"
									ref="rangeInputRef"
									:min="rangeMin"
									:max="rangeMax"
									:step="rangeStep"
									class="w-full"
									:aria-label="`${rangeLabel}（拖曳調整）`"
									@input="handleSyncDraftFromRange"
								/>
								<div
									class="min-w-[72px] rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-sm font-semibold text-white/85 2xl:text-base"
									aria-label="目前數值"
								>
									{{ rangeClampedValue }}{{ rangeUnit }}
								</div>
							</div>

							<div
								v-if="rangePreviewSrc?.trim()"
								class="mt-4 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3"
							>
								<div class="text-sm text-white/60 2xl:text-base">預覽</div>
								<div class="mt-3 flex items-center justify-center">
									<img
										:src="rangePreviewSrc"
										:alt="previewAlt"
										class="w-full max-w-[360px] object-contain"
										:style="{ height: `${rangeClampedValue}px` }"
									/>
								</div>
							</div>

							<p v-if="hint" class="mt-2 whitespace-pre-line text-sm text-white/50 2xl:text-base">
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

							<div
								v-else-if="cropFile"
								class="mt-4 overflow-hidden rounded-xl border border-white/20 bg-white/10 p-3"
							>
								<div class="text-sm text-white/60 2xl:text-base">
									裁切
									<span v-if="cropAspectLabel" class="text-white/45">（{{ cropAspectLabel }}）</span>
								</div>
								<div class="mt-2 flex items-center justify-center">
									<div class="relative w-full max-w-[520px]">
										<canvas
											ref="cropCanvasRef"
											class="w-full select-none rounded-lg bg-black/20"
											:width="cropCanvas.width"
											:height="cropCanvas.height"
											aria-label="裁切區域"
											tabindex="0"
											@pointerdown="crop.handlePointerDown"
											@pointermove="crop.handlePointerMove"
											@pointerup="crop.handlePointerUp"
											@pointercancel="crop.handlePointerUp"
											@wheel.prevent="crop.handleWheel"
											@keydown.up.prevent="crop.handleNudge(0, -6)"
											@keydown.down.prevent="crop.handleNudge(0, 6)"
											@keydown.left.prevent="crop.handleNudge(-6, 0)"
											@keydown.right.prevent="crop.handleNudge(6, 0)"
										/>
										<div class="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/55" aria-hidden="true"></div>
									</div>
								</div>

								<div class="mt-3 flex flex-wrap justify-center items-center gap-3">
									<label class="flex items-center gap-3">
										<span class="shrink-0 text-sm text-white/70 2xl:text-base">縮放</span>
										<input
											v-model.number="crop.zoomUi.value"
											type="range"
											min="10"
											max="300"
											step="1"
											class="w-full md:w-[260px]"
											:disabled="!crop.isReady.value || isCropping"
											aria-label="縮放"
											@input="crop.applyZoomUi(crop.zoomUi.value)"
										/>
									</label>
									<button
										type="button"
										class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
										:disabled="!crop.isReady.value || isCropping"
										@click="crop.handleReset"
									>
										重設
									</button>
									<button
										type="button"
										class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
										:disabled="isCropping"
										@click="handleClearCrop"
									>
										取消裁切
									</button>
								</div>
							</div>

							<p v-if="hint" class="mt-2 whitespace-pre-line text-sm text-white/50 2xl:text-base">
								{{ hint }}
							</p>
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
									accept="video/mp4,video/webm,video/ogg"
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

							<p v-if="hint" class="mt-2 whitespace-pre-line text-sm text-white/50 2xl:text-base">
								{{ hint }}
							</p>
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
import { useImageCrop } from "~/composables/common/useImageCrop";
import { formatCropAspectLabel, getCropCanvasSize } from "~/utils/imageCropUtils";

type InputMode = "text" | "range" | "image" | "video";

type Props = {
	modelValue: boolean;
	title: string;
	description?: string;
	value: string;
	inputMode?: InputMode;
	placeholder?: string;
	previewAlt?: string;
	hint?: string;
	rangeLabel?: string;
	rangeMin?: number;
	rangeMax?: number;
	rangeStep?: number;
	rangeUnit?: string;
	rangePreviewSrc?: string;
	cropAspectRatio?: number;
};

const props = withDefaults(defineProps<Props>(), {
	description: "",
	inputMode: "text",
	placeholder: "",
	previewAlt: "預覽圖片",
	hint: "",
	rangeLabel: "內容",
	rangeMin: 0,
	rangeMax: 100,
	rangeStep: 1,
	rangeUnit: "",
	rangePreviewSrc: ""
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
const rangeInputRef = ref<HTMLInputElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rangeLabel = computed(() => props.rangeLabel ?? "內容");
const rangeMin = computed(() => Number(props.rangeMin ?? 0));
const rangeMax = computed(() => Number(props.rangeMax ?? 100));
const rangeStep = computed(() => Number(props.rangeStep ?? 1));
const rangeUnit = computed(() => String(props.rangeUnit ?? ""));
const rangePreviewSrc = computed(() => String(props.rangePreviewSrc ?? ""));

const rangeParsedDraft = computed(() => {
	const parsed = Number.parseInt(String(draftValue.value ?? "").trim(), 10);
	if (!Number.isFinite(parsed)) return rangeMin.value;
	return parsed;
});

const rangeClampedValue = computed(() =>
	clampNumber(rangeParsedDraft.value, rangeMin.value, rangeMax.value)
);

const rangeUiValue = ref<number>(rangeClampedValue.value);

const handleSyncDraftFromRange = () => {
	const clamped = clampNumber(rangeUiValue.value, rangeMin.value, rangeMax.value);
	draftValue.value = String(clamped);
};

const apiBase = useUploadBaseUrl();
const previewResolvedUrl = computed(() =>
	resolveUploadUrl(draftValue.value ?? "", apiBase)
);

const cropFile = ref<File | null>(null);
const cropCanvasRef = ref<HTMLCanvasElement | null>(null);
const isCropping = ref(false);

const cropCanvas = computed(() => getCropCanvasSize(props.cropAspectRatio));
const cropAspectLabel = computed(() => formatCropAspectLabel(props.cropAspectRatio));

const cropOutputMime = computed<"image/jpeg" | "image/png">(() => {
	const t = String(cropFile.value?.type || "").toLowerCase();
	if (t === "image/png") return "image/png";
	return "image/jpeg";
});

const crop = useImageCrop({
	canvasRef: cropCanvasRef,
	getCanvasSize: () => cropCanvas.value,
	outputMaxLongEdge: 1280,
	mask: "rect",
});

const handleClearCrop = () => {
	cropFile.value = null;
	crop.revokeImageUrl();
};

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
		if (props.inputMode === "range") {
			rangeUiValue.value = rangeClampedValue.value;
		}
		nextTick(() => {
			if (props.inputMode === "range") {
				rangeInputRef.value?.focus?.();
				return;
			}
			textInputRef.value?.focus?.();
		});
	}
);

watch(
	() => props.value,
	nextValue => {
		if (!props.modelValue) {
			draftValue.value = nextValue ?? "";
			if (props.inputMode === "range") {
				rangeUiValue.value = rangeClampedValue.value;
			}
		}
	}
);

const handleClose = () => {
	emit("update:modelValue", false);
};

const handleSave = () => {
	if (props.inputMode === "image" && cropFile.value) {
		void handleUploadCroppedImage();
		return;
	}

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

const clearFileInput = (input: HTMLInputElement | null) => {
	if (!input) return;
	input.value = "";
};

const handleUploadCroppedImage = async () => {
	if (!cropFile.value) return;
	if (isCropping.value) return;

	isCropping.value = true;
	try {
		const blob = await crop.createCroppedBlob(cropOutputMime.value);
		const mime = cropOutputMime.value;
		const ext = mime === "image/png" ? "png" : "jpg";
		const nextFile = new File([blob], cropFile.value.name.replace(/\.(png|webp|jpeg|jpg)$/i, `.${ext}`), {
			type: mime,
		});
		emit("upload", nextFile);
		emit("update:modelValue", false);
	} finally {
		isCropping.value = false;
	}
};

const handleFileChange = async (event: Event) => {
	const target = event.target as HTMLInputElement | null;
	const file = target?.files?.[0];
	if (!file) {
		return;
	}

	// 圖片模式：先裁切（若有指定比例），再交由父層上傳
	if (props.inputMode === "image") {
		clearFileInput(target);
		draftValue.value = "";
		cropFile.value = file;
		await nextTick();
		crop.syncCanvasDimensions();
		await crop.loadFile(file);
		return;
	}

	// 影片模式：直接交由父元件處理上傳
	if (props.inputMode === "video") {
		emit("upload", file);
		clearFileInput(target);
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
		clearFileInput(target);
	}
};
</script>

<style scoped>
</style>
