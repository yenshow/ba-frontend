<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
				>
					<header class="flex items-center justify-between">
						<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">批次匯入</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<div class="space-y-4">
						<div
							class="rounded border border-white/20 bg-white/5 p-3 text-base text-white/80 2xl:text-lg space-y-2"
						>
							<p class="font-medium text-white/90">欄位說明</p>
							<ul class="list-inside list-disc space-y-1">
								<li>ID（必填）：<span class="text-white">工號</span></li>
								<li>姓名（必填）：<span class="text-white">姓名</span></li>
								<li>
									有效起始日（選填）：<span class="text-white">有效起始日</span>
									<span class="text-white/70 text-sm 2xl:text-base">（yyyy-mm-ddThh:mm）</span>
								</li>
								<li>
									有效結束日（選填）：<span class="text-white">有效結束日</span>
									<span class="text-white/70 text-sm 2xl:text-base">（yyyy-mm-ddThh:mm）</span>
								</li>
								<li>
									門禁密碼（選填）：<span class="text-white">門禁密碼</span>（僅數字 4~12 碼）
								</li>
								<li>卡號（選填）：<span class="text-white">卡號</span></li>
								<li>
									車牌（選填，可多筆）：<span class="text-white">車牌</span>
									<span class="text-white/70 text-sm 2xl:text-base">（以逗號、分號分隔）</span>
								</li>
							</ul>
							<button
								type="button"
								class="btn-secondary"
								:disabled="isDownloadingTemplate"
								@click="handleDownloadTemplate"
							>
								{{ isDownloadingTemplate ? "下載中..." : "下載範例檔" }}
							</button>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>Excel 檔（.xlsx）*</span>
							<div class="flex flex-wrap items-center gap-3">
								<input
									ref="excelInputRef"
									type="file"
									accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
									class="hidden"
									aria-label="選擇 Excel 檔"
									@change="handleFileChange($event, 'excel')"
								/>
								<button
									type="button"
									class="btn-secondary whitespace-nowrap text-sm 2xl:text-base"
									@click="pickFile('excel')"
								>
									選擇檔案
								</button>
								<p class="min-w-0 flex-1 truncate text-white/60">
									{{ excelFile?.name ?? "尚未選擇檔案" }}
								</p>
							</div>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>圖片 zip（選填，≤ 200KB，JPG/JPEG）</span>
							<div class="flex flex-wrap items-center gap-3">
								<input
									ref="zipInputRef"
									type="file"
									accept=".zip,application/zip"
									class="hidden"
									aria-label="選擇圖片 zip 檔"
									@change="handleFileChange($event, 'zip')"
								/>
								<button
									type="button"
									class="btn-secondary whitespace-nowrap text-sm 2xl:text-base"
									@click="pickFile('zip')"
								>
									選擇檔案
								</button>
								<p class="min-w-0 flex-1 truncate text-white/60">
									{{ zipFile?.name ?? "尚未選擇檔案" }}
								</p>
							</div>
						</div>
					</div>
					<p v-if="error" class="form-error-text">{{ error }}</p>
					<div
						v-if="result"
						class="rounded border border-white/20 bg-white/5 p-3 text-sm text-white/90"
					>
						<p>成功：{{ result.created }} 筆</p>
						<p v-if="result.errors?.length" class="mt-2 text-amber-300">
							錯誤：{{ result.errors.length }} 筆 —
							{{ result.errors.map(formatImportErrorLine).join("；") }}
						</p>
					</div>
					<footer class="mt-2 flex gap-3 2xl:gap-4">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isImporting || !excelFile"
							@click="handleSubmit"
						>
							{{ isImporting ? "匯入中..." : "匯入" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { ImportResult } from "~/types/personnel"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { formatImportErrorLine } from "~/utils/personnelUtils"

const props = defineProps<{
	modelValue: boolean
	error: string
	result: ImportResult | null
	isImporting: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	submit: [{ excel: File; imagesZip: File | null }]
}>()

const excelInputRef = ref<HTMLInputElement | null>(null)
const zipInputRef = ref<HTMLInputElement | null>(null)
const excelFile = ref<File | null>(null)
const zipFile = ref<File | null>(null)
const isDownloadingTemplate = ref(false)

const personnelApi = usePersonnelApi()

const handleDownloadTemplate = async () => {
	if (isDownloadingTemplate.value) return
	isDownloadingTemplate.value = true
	try {
		const blob = await personnelApi.downloadImportTemplate()
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = "personnel_import_template.xlsx"
		a.click()
		URL.revokeObjectURL(url)
	} finally {
		isDownloadingTemplate.value = false
	}
}

const resetFiles = () => {
	excelFile.value = null
	zipFile.value = null
	if (excelInputRef.value) excelInputRef.value.value = ""
	if (zipInputRef.value) zipInputRef.value.value = ""
}

const handleClose = () => emit("update:modelValue", false)

type ImportFileKind = "excel" | "zip"

const pickFile = (kind: ImportFileKind) => {
	const inputRef = kind === "excel" ? excelInputRef : zipInputRef
	inputRef.value?.click()
}

const handleFileChange = (e: Event, kind: ImportFileKind) => {
	const file = (e.target as HTMLInputElement).files?.[0] ?? null
	if (kind === "excel") excelFile.value = file
	else zipFile.value = file
}

const handleSubmit = () => {
	if (!excelFile.value) return
	emit("submit", { excel: excelFile.value, imagesZip: zipFile.value })
}

watch(
	() => props.modelValue,
	(v) => {
		if (!v) resetFiles()
	}
)
</script>
