<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ state.editingPerson ? "編輯人員" : "新增人員" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<form class="grid grid-cols-2 gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
						<div
							v-if="!hasAccessControlDevices"
							class="col-span-2 rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white/70 2xl:text-sm"
							role="status"
						>
							尚無可用的門禁設備（請先到設備管理建立 type_code=access_control 的設備）
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>大頭照</p>
							<div class="rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex items-center gap-4">
									<div
										class="flex h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 2xl:h-28 2xl:w-28"
									>
										<img
											v-if="resolvedFaceUrl"
											:src="resolvedFaceUrl"
											alt="大頭照預覽"
											class="h-full w-full object-cover"
										/>
										<div
											v-else
											class="flex h-full w-full items-center justify-center text-2xl text-white/40"
											aria-hidden="true"
										>
											?
										</div>
									</div>

									<div class="flex flex-col gap-3">
										<input
											ref="faceFileInputRef"
											type="file"
											accept="image/*"
											class="hidden"
											aria-label="選擇大頭照"
											@change="handleFaceFileChange"
										/>
										<button
											type="button"
											class="w-full rounded-lg bg-white/20 px-3 py-2 text-sm text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 md:w-auto"
											@click="triggerFaceFileSelect"
										>
											上傳圖片
										</button>
										<button
											v-if="resolvedFaceUrl"
											type="button"
											class="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 md:w-auto"
											@click="handleClearFace"
										>
											清除
										</button>
									</div>
								</div>

								<div class="mt-6 flex items-center gap-3">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localCaptureDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:opacity-50"
										:disabled="isCapturingFace || !hasSelectedCaptureDevice || !hasAccessControlDevices"
										aria-label="從設備截圖"
										@click="handleCaptureFace"
									>
										{{ isCapturingFace ? "截圖中..." : "截圖" }}
									</button>
								</div>

								<p
									v-if="captureErrorText"
									class="mt-2 text-xs text-rose-300 2xl:text-sm"
									role="alert"
									aria-live="polite"
								>
									{{ captureErrorText }}
								</p>
							</div>
						</div>

						<div class="space-y-3">
							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>姓名 *</span>
								<input v-model="state.form.fullName" type="text" required class="form-input-small" />
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>工號 *</span>
								<input
									v-model="state.form.employeeNo"
									type="text"
									required
									class="form-input-small"
									:readonly="!!state.editingPerson"
								/>
							</label>

							<label
								v-if="state.editingPerson"
								class="col-span-2 flex flex-col gap-2 text-base text-white/80"
							>
								<span>群組</span>
								<FilterDropdown
									v-model="localPersonGroupId"
									:options="childGroupOptions"
									placeholder="未分組"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div class="col-span-2 flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>有效期限</p>
							<div class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										v-model="localIsLongTerm"
										type="checkbox"
										class="peer sr-only"
										aria-label="永久授權：開啟或關閉"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
									></div>
									<span class="ml-3 text-sm 2xl:text-base">{{
										localIsLongTerm ? "永久授權" : "指定有效期限"
									}}</span>
								</label>

								<div v-if="!localIsLongTerm" class="grid grid-cols-2 gap-3">
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
										<span>起始日 *</span>
										<input
											v-model="localValidBeginDate"
											type="datetime-local"
											step="60"
											required
											class="form-input-small"
											aria-label="有效期限起始時間（年/月/日/時/分）"
										/>
									</label>
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
										<span>結束日 *</span>
										<input
											v-model="localValidEndDate"
											type="datetime-local"
											step="60"
											required
											class="form-input-small"
											aria-label="有效期限結束時間（年/月/日/時/分）"
										/>
									</label>
								</div>
							</div>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>卡片設定</p>
							<div class="rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localCardDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 disabled:opacity-50 md:w-auto"
										:disabled="isCapturingCard || !hasSelectedCardDevice || !hasAccessControlDevices"
										aria-label="從設備讀取卡號"
										@click="handleCaptureCard"
									>
										{{ isCapturingCard ? "讀卡中..." : "讀卡" }}
									</button>
								</div>

								<div class="mt-3 flex flex-wrap items-center gap-2">
									<input
										v-model="localCardNo"
										type="text"
										inputmode="numeric"
										class="form-input w-full max-w-[320px] border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:py-2 2xl:text-base"
										placeholder="卡號（可手動輸入）"
										aria-label="卡號"
									/>
								</div>

								<p
									v-if="cardErrorText"
									class="mt-2 text-xs text-rose-300 2xl:text-sm"
									role="alert"
									aria-live="polite"
								>
									{{ cardErrorText }}
								</p>
							</div>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>指紋設定</p>
							<div class="rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex items-center gap-2">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localFingerDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 disabled:opacity-50"
										:disabled="isCapturingFingerPrint || !hasSelectedFingerDevice || !hasAccessControlDevices"
										aria-label="讀取指紋模板"
										@click="handleCaptureFingerPrint"
									>
										{{ isCapturingFingerPrint ? "讀取中..." : "讀取" }}
									</button>
								</div>
								<div class="mt-3 flex flex-wrap items-center gap-2">
									<input
										v-model="localFingerPrintData"
										type="text"
										class="form-input w-full max-w-[320px] border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:py-2 2xl:text-base"
										placeholder="指紋模板值"
										aria-label="指紋模板值"
									/>
								</div>

								<p
									v-if="fingerPrintErrorText"
									class="mt-2 text-xs text-rose-300 2xl:text-sm"
									role="alert"
									aria-live="polite"
								>
									{{ fingerPrintErrorText }}
								</p>
							</div>
						</div>

						<label class="flex flex-col gap-2 text-base text-white/80">
							<span>密碼設定</span>
							<input
								:value="localPassword"
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								class="form-input-small"
								placeholder="僅數字（4~12 碼）"
								aria-label="門禁密碼"
								@input="handlePasswordInput"
							/>
						</label>

						<div class="col-span-2 flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base">
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									v-model="state.form.status"
									type="checkbox"
									value="active"
									true-value="active"
									false-value="inactive"
									class="peer sr-only"
									aria-label="狀態：已啟用或已停用"
								/>
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									state.form.status === "active" ? "已啟用" : "已停用"
								}}</span>
							</label>
						</div>

						<p v-if="state.ui.errorMessage" class="col-span-2 text-sm text-rose-300">
							{{ state.ui.errorMessage }}
						</p>

						<footer class="col-span-2 mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : state.editingPerson ? "更新" : "建立" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { PersonnelPersonDialogState, PersonGroup } from "~/types/personnel";
import FilterDropdown from "~/components/common/FilterDropdown.vue";
import { buildPersonnelChildGroupOptions } from "~/utils/personnelGroups";

const props = defineProps<{
	modelValue: boolean;
	state: PersonnelPersonDialogState;
	groupTree: PersonGroup[];
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	submit: [];
	"face-file-change": [file: File];
	"clear-face": [];
	"capture-face": [];
	"capture-card": [];
	"capture-fingerprint": [];
}>();

const faceFileInputRef = ref<HTMLInputElement | null>(null);

const childGroupOptions = computed(() => buildPersonnelChildGroupOptions(props.groupTree || []));

const localPersonGroupId = computed<string>({
	get: () => props.state.form.personGroupId || "",
	set: v => {
		props.state.form.personGroupId = v;
	}
});

const resolvedFaceUrl = computed(() => {
	const url = props.state.ui.facePreviewUrl.value || props.state.form.faceUrl || null;
	if (!url) return null;
	const trimmed = String(url).trim();
	return trimmed ? trimmed : null;
});

const hasAccessControlDevices = computed(
	() =>
		Array.isArray(props.state.accessControl.accessControlDevices.value) &&
		props.state.accessControl.accessControlDevices.value.length > 0
);

const isCapturingFace = computed(() => Boolean(props.state.capture.isCapturingFace.value));
const isCapturingCard = computed(() => Boolean(props.state.capture.isCapturingCard.value));
const isCapturingFingerPrint = computed(() =>
	Boolean(props.state.capture.isCapturingFingerPrint.value)
);
const isSubmitting = computed(() => Boolean(props.state.ui.isSubmitting.value));

const captureErrorText = computed(
	() => (props.state.capture.captureErrorMessage.value || "").trim() || null
);
const cardErrorText = computed(
	() => (props.state.capture.cardErrorMessage.value || "").trim() || null
);

const accessControlDeviceOptions = computed(() => {
	return (props.state.accessControl.accessControlDevices.value || []).map(d => ({
		value: String(d.id),
		label: d.name
	}));
});

const localCaptureDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.captureDeviceId.value == null
			? ""
			: String(props.state.capture.captureDeviceId.value),
	set: v => (props.state.capture.captureDeviceId.value = v ? Number(v) : null)
});

const hasSelectedCaptureDevice = computed(() => props.state.capture.captureDeviceId.value != null);

const localCardDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.cardDeviceId.value == null
			? ""
			: String(props.state.capture.cardDeviceId.value),
	set: v => (props.state.capture.cardDeviceId.value = v ? Number(v) : null)
});

const hasSelectedCardDevice = computed(() => props.state.capture.cardDeviceId.value != null);

const localCardNo = computed<string>({
	get: () => props.state.accessControl.cardNo.value || "",
	set: v => (props.state.accessControl.cardNo.value = v)
});

const localFingerDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.fingerDeviceId.value == null
			? ""
			: String(props.state.capture.fingerDeviceId.value),
	set: v => (props.state.capture.fingerDeviceId.value = v ? Number(v) : null)
});

const hasSelectedFingerDevice = computed(() => props.state.capture.fingerDeviceId.value != null);

const localFingerPrintData = computed<string>({
	get: () => props.state.accessControl.fingerPrintData.value || "",
	set: v => (props.state.accessControl.fingerPrintData.value = v)
});

const localPassword = computed<string>({
	get: () => props.state.accessControl.password.value || "",
	set: v => (props.state.accessControl.password.value = v)
});

const handlePasswordInput = (e: Event) => {
	const input = e.target as HTMLInputElement | null;
	if (!input) return;
	const next = String(input.value || "").replace(/\D+/g, "");
	if (next !== input.value) input.value = next;
	localPassword.value = next;
};

const localIsLongTerm = computed<boolean>({
	get: () => Boolean(props.state.accessControl.isLongTerm.value),
	set: v => (props.state.accessControl.isLongTerm.value = Boolean(v))
});

const localValidBeginDate = computed<string>({
	get: () => props.state.accessControl.validBeginDate.value || "",
	set: v => (props.state.accessControl.validBeginDate.value = v)
});

const localValidEndDate = computed<string>({
	get: () => props.state.accessControl.validEndDate.value || "",
	set: v => (props.state.accessControl.validEndDate.value = v)
});

const fingerPrintErrorText = computed(
	() => (props.state.capture.fingerPrintErrorMessage.value || "").trim() || null
);

const handleClose = () => emit("update:modelValue", false);
const handleSubmit = () => emit("submit");
const triggerFaceFileSelect = () => faceFileInputRef.value?.click();
const handleCaptureFace = () => emit("capture-face");
const handleCaptureCard = () => emit("capture-card");
const handleCaptureFingerPrint = () => emit("capture-fingerprint");

const handleFaceFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (file) emit("face-file-change", file);
	input.value = "";
};

const handleClearFace = () => emit("clear-face");

watch(
	() => props.modelValue,
	v => {
		if (!v && faceFileInputRef.value) faceFileInputRef.value.value = "";
	}
);
</script>
