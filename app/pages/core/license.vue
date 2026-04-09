<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">授權管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理授權啟用、離線匯入與配額使用狀態</p>
			</div>
			<div
				class="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 2xl:px-6 2xl:py-4 2xl:text-base"
			>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
					<span class="font-semibold text-white">{{
						showLicensePlaceholder ? "載入中..." : license.serialNumber || "-"
					}}</span>
					<span class="text-white/40">|</span>
					<span class="text-white/60">授權狀態</span>
					<span class="font-semibold text-white">{{
						showLicensePlaceholder ? "載入中..." : licenseStatusText
					}}</span>
					<span class="text-white/40">|</span>
					<span class="text-white/60">啟用方式</span>
					<span class="font-semibold text-white">{{
						showLicensePlaceholder ? "載入中..." : license.activationMethod || "-"
					}}</span>
				</div>
			</div>
		</header>

		<section class="rounded-2xl border border-white/20 bg-white/10 p-6 2xl:p-8">
			<h2 class="text-lg font-semibold text-white 2xl:text-xl">目前已啟用功能</h2>
			<div class="mt-4 flex flex-wrap gap-2 2xl:gap-3">
				<span v-if="showLicensePlaceholder" class="text-sm text-white/60 2xl:text-base"
					>載入中...</span
				>
				<template v-else>
					<span
						v-for="key in license.features"
						:key="key"
						class="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-100 ring-1 ring-emerald-400/30 2xl:px-4 2xl:py-1.5 2xl:text-base"
					>
						{{ featureLabels[key] ?? key }}
					</span>
					<span v-if="license.features.length === 0" class="text-sm text-white/60 2xl:text-base"
						>尚無授權</span
					>
				</template>
			</div>
		</section>

		<ClientOnly>
			<section class="rounded-2xl border border-white/20 bg-white/10 p-6 2xl:p-8">
				<h2 class="text-lg font-semibold text-white 2xl:text-xl">配額使用狀態</h2>
				<p class="mt-2 text-sm text-white/60 2xl:text-base">
					僅顯示已設定配額的模組；未限制者以 ∞ 顯示。
				</p>

				<div class="mt-4 overflow-hidden rounded-xl border border-white/15">
					<table class="w-full border-collapse">
						<thead>
							<tr class="bg-white/5 text-left text-sm text-white/70 2xl:text-base">
								<th class="px-4 py-3 font-medium">模組</th>
								<th class="px-4 py-3 font-medium">使用量</th>
								<th class="px-4 py-3 font-medium">上限</th>
								<th class="px-4 py-3 font-medium">狀態</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in quotaRows"
								:key="row.key"
								class="border-t border-white/10 text-sm text-white/80 2xl:text-base"
							>
								<td class="px-4 py-3">
									<span class="font-medium text-white">{{ row.label }}</span>
								</td>
								<td class="px-4 py-3 tabular-nums">
									{{ row.used }}
								</td>
								<td class="px-4 py-3 tabular-nums">
									{{ row.maxText }}
								</td>
								<td class="px-4 py-3">
									<span
										class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 2xl:text-sm"
										:class="
											row.isExceeded
												? 'bg-rose-500/15 text-rose-100 ring-rose-400/30'
												: row.isNear
													? 'bg-amber-500/15 text-amber-100 ring-amber-400/30'
													: 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30'
										"
									>
										{{ row.statusText }}
									</span>
								</td>
							</tr>
							<tr v-if="quotaRows.length === 0" class="border-t border-white/10">
								<td class="px-4 py-4 text-sm text-white/60 2xl:text-base" colspan="4">
									尚未設定任何配額
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</section>
			<template #fallback>
				<section class="rounded-2xl border border-white/20 bg-white/10 p-6 2xl:p-8">
					<h2 class="text-lg font-semibold text-white 2xl:text-xl">配額使用狀態</h2>
					<p class="mt-2 text-sm text-white/60 2xl:text-base">載入中...</p>
				</section>
			</template>
		</ClientOnly>

		<section class="grid grid-cols-1 gap-6 2xl:grid-cols-2 2xl:gap-8">
			<div class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">線上啟用（LK）</h2>

				<form
					class="mt-5 flex flex-col gap-4 2xl:mt-6 2xl:gap-5"
					@submit.prevent="handleActivateOnline"
				>
					<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
						<span>License Key（LK）</span>
						<input
							v-model="licenseKeyInput"
							type="text"
							inputmode="text"
							autocomplete="off"
							placeholder="XXXX-XXXX-XXXX-XXXX"
							class="w-full rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-white outline-none transition-colors focus:border-cyan-300/70 focus:bg-white/15"
							aria-label="License Key 輸入"
						/>
						<span class="text-sm text-white/50">
							<span v-if="showLicensePlaceholder">載入中...</span>
							<span v-else-if="isActivated"
								>已啟用主授權；若要追加功能模組，請輸入副 License Key 並再次啟用。</span
							>
							<span v-else>所有流程以 LK 為主；啟用成功後可回顯 SN 供稽核用。</span>
						</span>
					</label>

					<div class="flex flex-wrap items-center gap-3">
						<button
							type="submit"
							class="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="showLicensePlaceholder || isSubmittingOnline || !canSubmitLicenseKey"
							aria-label="立即啟用授權"
						>
							{{ isSubmittingOnline ? "啟用中..." : "立即啟用" }}
						</button>
						<button
							type="button"
							class="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="showLicensePlaceholder || isResettingLicense"
							aria-label="重置本地授權"
							@click="handleResetLicense"
						>
							{{ isResettingLicense ? "重置中..." : "重置授權（測試）" }}
						</button>
					</div>
				</form>
			</div>

			<div class="flex flex-col rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">離線授權</h2>

				<nav class="mt-5 flex items-center gap-2" aria-label="離線授權步驟切換">
					<button
						type="button"
						class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
						:class="
							offlineStep === 1
								? 'border-cyan-300/40 bg-cyan-400/10 text-white'
								: 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
						"
						:aria-current="offlineStep === 1 ? 'step' : undefined"
						@click="offlineStep = 1"
					>
						<span
							class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
							:class="
								offlineStep === 1
									? 'bg-cyan-500/25 text-cyan-100 ring-cyan-400/40'
									: 'bg-white/10 text-white/70 ring-white/20'
							"
							aria-hidden="true"
						>
							1
						</span>
						<span>產生請求檔</span>
					</button>

					<div class="h-px flex-1 bg-white/10" aria-hidden="true" />

					<button
						type="button"
						class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
						:class="
							offlineStep === 2
								? 'border-cyan-300/40 bg-cyan-400/10 text-white'
								: 'border-white/15 bg-white/5 text-white/75 hover:bg-white/10'
						"
						:aria-current="offlineStep === 2 ? 'step' : undefined"
						@click="offlineStep = 2"
					>
						<span
							class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
							:class="
								offlineStep === 2
									? 'bg-cyan-500/25 text-cyan-100 ring-cyan-400/40'
									: 'bg-white/10 text-white/70 ring-white/20'
							"
							aria-hidden="true"
						>
							2
						</span>
						<span>匯入回應檔</span>
					</button>
				</nav>

				<div
					v-if="offlineStep === 1"
					class="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5"
				>
					<div class="space-y-1">
						<h3 class="text-sm font-medium text-white 2xl:text-base">步驟 1：產生請求檔</h3>
					</div>

					<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
						<label class="flex flex-1 flex-col gap-1.5 text-sm text-white/80 2xl:text-base">
							<span>License Key（LK）</span>
							<input
								v-model="requestFileLicenseKeyInput"
								type="text"
								inputmode="text"
								autocomplete="off"
								placeholder="XXXX-XXXX-XXXX-XXXX"
								class="w-full rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-white outline-none transition-colors focus:border-cyan-300/70 focus:bg-white/15"
								aria-label="離線用 License Key"
							/>
						</label>
						<button
							type="button"
							class="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="
								showLicensePlaceholder || isGeneratingRequestFile || !canGenerateRequestFile
							"
							aria-label="產生並下載 request file"
							@click="handleGenerateRequestFile"
						>
							{{ isGeneratingRequestFile ? "產生中..." : "產生並下載 .txt" }}
						</button>
					</div>
				</div>

				<div v-else class="mt-5 space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5">
					<div class="space-y-2.5">
						<h3 class="text-sm font-medium text-white 2xl:text-base">步驟 2：匯入回應檔</h3>
						<p class="text-sm text-white/60 2xl:text-base">
							請至
							<a
								href="https://www.yenshow.com/license/activate"
								target="_blank"
								rel="noopener noreferrer"
								class="font-medium text-cyan-300 underline decoration-cyan-400/60 underline-offset-2 transition-colors hover:text-cyan-200"
								aria-label="遠岫離線授權頁面（新分頁開啟）"
							>
								離線授權頁面
							</a>
							上傳請求檔並下載回應檔後，在此點「上傳 JSON」選擇檔案，再按「驗簽並匯入」。
						</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<label
							class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-base text-white/80 transition-colors hover:bg-white/15"
							tabindex="0"
							aria-label="上傳離線回應檔 JSON"
							@keydown="handleOfflineFileLabelKeyDown"
						>
							<input
								ref="offlineResponseFileInputRef"
								type="file"
								accept="application/json,.json"
								class="hidden"
								@change="handleOfflineResponseFileChange"
							/>
							<span>上傳 JSON</span>
						</label>
						<button
							type="button"
							class="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
							:disabled="isSubmittingOffline || !offlineResponsePayload"
							aria-label="驗簽並匯入"
							@click="handleImportOffline"
						>
							{{ isSubmittingOffline ? "匯入中..." : "驗簽並匯入" }}
						</button>
					</div>
					<p v-if="offlineResponseFileName" class="text-xs text-emerald-200/80">
						已選擇：{{ offlineResponseFileName }}
					</p>
				</div>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import type { LicenseState } from "~/types/license"
import { useApiBase } from "~/composables/core/useApiBase"
import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

definePageMeta({
	layout: "default",
})

const featureLabels: Record<string, string> = {
	people_counting: "人流統計",
	lighting: "燈控",
	drainage: "排水",
	fire: "消防",
	emergency_rescue: "緊急救援",
	environment: "環境品質",
	surveillance: "影像監控",
	vehicle_access: "車輛進出",
}

const { isAdmin } = useAuth()
const router = useRouter()

watch(
	() => isAdmin.value,
	async (val) => {
		if (val) return
		await router.replace("/")
	},
	{ immediate: true }
)

const { request } = useApiBase()
const { license, fetchLicense, isLoaded } = useLicense()
const toast = useToast()
const { handleError } = useErrorHandler()

const offlineStep = ref<1 | 2>(1)

const licenseKeyInput = ref("")
const requestFileLicenseKeyInput = ref("")
const offlineResponsePayload = ref<Record<string, unknown> | null>(null)
const offlineResponseFileName = ref("")
const offlineResponseFileInputRef = ref<HTMLInputElement | null>(null)

const isSubmittingOnline = ref(false)
const isGeneratingRequestFile = ref(false)
const isSubmittingOffline = ref(false)
const isResettingLicense = ref(false)

const isMounted = ref(false)
const showLicensePlaceholder = computed(() => !isMounted.value || !isLoaded.value)

const canSubmitLicenseKey = computed(() => !!licenseKeyInput.value.trim())
const canGenerateRequestFile = computed(() => !!requestFileLicenseKeyInput.value.trim())

const isActivated = computed(() => (license.value.features?.length ?? 0) > 0)
const licenseStatusText = computed(() => (isActivated.value ? "已啟用" : "未啟用"))

type QuotaRow = {
	key: string
	label: string
	used: number
	max: number | null
	maxText: string
	isExceeded: boolean
	isNear: boolean
	statusText: string
}

const quotaRows = computed<QuotaRow[]>(() => {
	const quotas = license.value.quotas ?? {}
	const usage = license.value.usage ?? {}

	const keys = Object.keys(quotas).filter((k) => k !== "vehicle_access")
	const rows = keys.map((key) => {
		const max = quotas[key as keyof typeof quotas]?.maxDevices
		const used = usage[key as keyof typeof usage]?.usedDevices ?? 0
		const hasMax = typeof max === "number" && Number.isFinite(max)
		const safeMax = hasMax ? Math.max(0, Math.floor(max)) : null
		const safeUsed = Number.isFinite(used) ? Math.max(0, Math.floor(used)) : 0
		const isExceeded = safeMax != null ? safeUsed >= safeMax : false
		const isNear = safeMax != null ? safeUsed / Math.max(1, safeMax) >= 0.8 : false

		return {
			key,
			label: featureLabels[key] ?? key,
			used: safeUsed,
			max: safeMax,
			maxText: safeMax == null ? "∞" : String(safeMax),
			isExceeded,
			isNear,
			statusText: safeMax == null ? "不限" : isExceeded ? "已滿" : isNear ? "接近上限" : "正常",
		}
	})

	return rows.sort((a, b) => a.key.localeCompare(b.key))
})

const refreshLicense = async () => {
	await fetchLicense({ force: true })
}

const clearOfflineResponseSelection = () => {
	offlineResponsePayload.value = null
	offlineResponseFileName.value = ""
	if (offlineResponseFileInputRef.value) offlineResponseFileInputRef.value.value = ""
}

const handleActivateOnline = async () => {
	if (!canSubmitLicenseKey.value) return
	if (isSubmittingOnline.value) return
	isSubmittingOnline.value = true
	try {
		const lk = licenseKeyInput.value.trim()
		await request<LicenseState>("/license/activate", {
			method: "POST",
			body: { licenseKey: lk },
		})
		await refreshLicense()
		toast.success("線上啟用成功")
	} catch (error) {
		handleError(error, "線上啟用失敗")
	} finally {
		isSubmittingOnline.value = false
	}
}

const handleResetLicense = async () => {
	if (isResettingLicense.value) return
	isResettingLicense.value = true
	try {
		await request<LicenseState>("/license/reset", { method: "POST" })
		await refreshLicense()
		offlineStep.value = 1
		clearOfflineResponseSelection()
		toast.success("已重置本地授權狀態")
	} catch (error) {
		handleError(error, "重置授權失敗")
	} finally {
		isResettingLicense.value = false
	}
}

const handleGenerateRequestFile = async () => {
	if (!canGenerateRequestFile.value || isGeneratingRequestFile.value) return
	isGeneratingRequestFile.value = true
	try {
		const data = await request<{ requestFileBase64: string }>("/license/offline-request-file", {
			method: "POST",
			body: { licenseKey: requestFileLicenseKeyInput.value.trim() },
		})
		const b64 = data?.requestFileBase64 ?? ""
		if (!b64) throw new Error("後端未回傳 requestFileBase64")
		const lk = requestFileLicenseKeyInput.value.trim().replace(/-/g, "")
		const blob = new Blob([b64], { type: "text/plain;charset=utf-8" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `license-request-${lk}.txt`
		a.click()
		URL.revokeObjectURL(url)
		toast.success("已下載 request file（Base64）")
		clearOfflineResponseSelection()
		offlineStep.value = 2
	} catch (error) {
		handleError(error, "產生 request file 失敗")
	} finally {
		isGeneratingRequestFile.value = false
	}
}

const handleImportOffline = async () => {
	const payload = offlineResponsePayload.value
	if (!payload || isSubmittingOffline.value) return
	isSubmittingOffline.value = true
	try {
		await request<LicenseState>("/license/offline-import", {
			method: "POST",
			body: payload,
		})
		await refreshLicense()
		clearOfflineResponseSelection()
		toast.success("離線授權匯入成功")
	} catch (error) {
		handleError(error, "離線授權匯入失敗")
	} finally {
		isSubmittingOffline.value = false
	}
}

const handleOfflineFileLabelKeyDown = (e: KeyboardEvent) => {
	if (e.key !== "Enter" && e.key !== " ") return
	e.preventDefault()
	offlineResponseFileInputRef.value?.click()
}

const handleOfflineResponseFileChange = async (e: Event) => {
	const input = e.target as HTMLInputElement | null
	const file = input?.files?.[0]
	if (!file) return

	try {
		const text = await file.text()
		const parsed: unknown = JSON.parse(text)
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("格式錯誤")
		}
		offlineResponsePayload.value = parsed as Record<string, unknown>
		offlineResponseFileName.value = file.name
		toast.success("已載入離線授權檔")
	} catch {
		clearOfflineResponseSelection()
		toast.error("檔案內容不是有效的授權 JSON")
	} finally {
		if (input) input.value = ""
	}
}

onMounted(() => {
	isMounted.value = true
	void refreshLicense()
})

watch(
	() => isActivated.value,
	(val) => {
		if (!val) return
		licenseKeyInput.value = ""
		requestFileLicenseKeyInput.value = ""
	}
)
</script>
