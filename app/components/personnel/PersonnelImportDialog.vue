<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				@click.self="handleClose"
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
							class="rounded border border-white/20 bg-white/5 p-3 text-base text-white/80 2xl:text-lg"
						>
							<p class="font-medium text-white/90">欄位說明</p>
							<ul class="mt-2 list-inside list-disc space-y-1">
								<li>工號／員工編號：<span class="text-white">employeeNo</span></li>
								<li>姓名：<span class="text-white">fullName</span></li>
								<li>群組名稱：<span class="text-white">personGroupName</span></li>
								<li>
									地點名稱：
									<span class="text-white">locationNames</span>
									<span class="text-white/70 text-sm 2xl:text-base"
										>（僅接受「區域/地點」可用逗號分隔多筆）</span
									>
								</li>
								<li>圖片：<span class="text-white">imageFileName</span></li>
							</ul>
							<div class="mt-3 flex flex-wrap items-center gap-2">
								<button
									type="button"
									class="btn-secondary"
									:disabled="isDownloadingTemplate"
									@click="handleDownloadTemplate"
								>
									{{ isDownloadingTemplate ? "下載中..." : "下載範例檔" }}
								</button>
								<p class="text-sm text-white/60 2xl:text-base">
									範例檔內附 <span class="text-white">群組清單</span> 與
									<span class="text-white">地點清單</span> 工作表可查詢「區域/地點」格式
								</p>
							</div>
						</div>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>Excel 檔（.xlsx）*</span>
							<input
								ref="excelInputRef"
								type="file"
								accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								class="form-input-small"
								aria-label="選擇 Excel 檔"
								@change="handleExcelChange"
							/>
						</label>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>圖片 zip（選填）</span>
							<input
								ref="zipInputRef"
								type="file"
								accept=".zip,application/zip"
								class="form-input-small"
								aria-label="選擇圖片 zip 檔"
								@change="handleZipChange"
							/>
						</label>
					</div>
					<p v-if="error" class="text-sm text-rose-300">{{ error }}</p>
					<div
						v-if="result"
						class="rounded border border-white/20 bg-white/5 p-3 text-sm text-white/90"
					>
						<p>成功：{{ result.created }} 筆</p>
						<p v-if="result.errors?.length" class="mt-2 text-amber-300">
							錯誤：{{ result.errors.length }} 筆 —
							{{ result.errors.map((e) => `第${e.row}行 ${e.message}`).join("；") }}
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

const handleClose = () => {
	resetFiles()
	emit("update:modelValue", false)
}

const handleExcelChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	excelFile.value = input.files?.[0] ?? null
}

const handleZipChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	zipFile.value = input.files?.[0] ?? null
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
