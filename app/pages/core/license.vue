<template>
	<div class="page-shell">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="page-title">授權管理</h1>
				<p class="page-subtitle">管理授權啟用、離線匯入與配額使用狀態</p>
			</div>
			<div class="flex flex-wrap items-center justify-end gap-3">
				<div class="section-card section-card--compact text-sm 2xl:text-base">
					<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
						<span class="text-theme-muted">授權狀態</span>
						<span class="font-semibold text-theme-primary">{{
							showLicensePlaceholder ? "載入中..." : licenseStatusText
						}}</span>
						<span class="text-theme-muted">|</span>
						<span class="text-theme-muted">啟用方式</span>
						<span class="font-semibold text-theme-primary">{{
							showLicensePlaceholder ? "載入中..." : activationMethodText
						}}</span>
						<span class="text-theme-muted">|</span>
						<span class="font-semibold text-theme-primary">{{
							showLicensePlaceholder ? "載入中..." : license.serialNumber || "-"
						}}</span>
					</div>
				</div>
				<button
					v-if="canPlatformAdmin && !showLicensePlaceholder"
					type="button"
					class="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					:disabled="isResettingLicense"
					aria-label="重置本地授權"
					@click="handleRequestResetLicense"
				>
					{{ isResettingLicense ? "重置中..." : "重置授權" }}
				</button>
			</div>
		</header>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start 2xl:gap-8">
			<div
				ref="leftColumnRef"
				class="flex flex-col gap-6 transition-opacity duration-200 2xl:gap-8"
				:class="canAdmin ? '' : 'cursor-not-allowed opacity-50 saturate-[0.85]'"
				:aria-disabled="!canAdmin || undefined"
			>
				<section class="section-card">
					<h2 class="text-xl font-semibold text-theme-primary 2xl:text-2xl">線上啟用（LK）</h2>
					<p v-show="!canAdmin" class="mt-2 text-sm text-white/50 2xl:text-base">
						僅管理員可啟用或匯入授權
					</p>

					<fieldset :disabled="!canAdmin" class="mt-5 min-w-0 border-0 p-0 2xl:mt-6">
						<form class="flex flex-col gap-4 2xl:gap-5" @submit.prevent="handleActivateOnline">
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
							</div>
						</form>
					</fieldset>
				</section>

				<section class="section-card flex flex-col">
					<h2 class="text-xl font-semibold text-theme-primary 2xl:text-2xl">離線授權</h2>
					<p v-show="!canAdmin" class="mt-2 text-sm text-white/50 2xl:text-base">
						僅管理員可產生請求檔或匯入回應檔
					</p>

					<fieldset :disabled="!canAdmin" class="mt-5 min-w-0 border-0 p-0">
						<nav class="flex items-center gap-2" aria-label="離線授權步驟切換">
							<button
								type="button"
								class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors 2xl:text-base"
								:class="getPillButtonClass(offlineStep === 1)"
								:aria-current="offlineStep === 1 ? 'step' : undefined"
								@click="offlineStep = 1"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(offlineStep === 1)"
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
								:class="getPillButtonClass(offlineStep === 2)"
								:aria-current="offlineStep === 2 ? 'step' : undefined"
								@click="offlineStep = 2"
							>
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ring-1 2xl:h-7 2xl:w-7 2xl:text-sm"
									:class="getStepCircleClass(offlineStep === 2)"
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
								<label class="flex flex-1 flex-col gap-2.5 text-sm text-white/80 2xl:text-base">
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
									class="rounded-xl border border-white/20 bg-emerald-500/85 px-3 py-2 text-base text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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

						<div
							v-else
							class="mt-5 space-y-4 rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
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
									<span>上傳回應檔</span>
								</label>
								<button
									type="button"
									class="rounded-xl border border-white/20 bg-emerald-500/85 px-3 py-2 text-base text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
									:disabled="isSubmittingOffline || !offlineResponsePayload"
									aria-label="驗簽並匯入"
									@click="handleImportOffline"
								>
									{{ isSubmittingOffline ? "匯入中..." : "驗簽並匯入" }}
								</button>
							</div>
							<p v-if="offlineResponseFileName" class="text-xs text-emerald-100/80">
								已選擇：{{ offlineResponseFileName }}
							</p>
						</div>
					</fieldset>
				</section>
			</div>

			<section
				class="section-card flex min-h-0 flex-col"
				:style="rightPanelStyle"
				aria-label="授權總覽"
			>
				<div class="flex min-h-0 flex-1 flex-col">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<h2 class="text-xl font-semibold text-theme-primary 2xl:text-2xl">授權總覽</h2>
						<PageTabs
							v-model="overviewTab"
							:tabs="overviewTabs"
							:panels="false"
							aria-label="授權總覽分頁"
							id-prefix="license-tab"
						/>
					</div>

					<PageTabs
						v-model="overviewTab"
						:tabs="overviewTabs"
						:list="false"
						:panel-transition="false"
						panel-class="show-scrollbar mt-6 min-h-0 flex-1 overflow-y-auto pr-1"
						aria-label="授權總覽分頁"
						id-prefix="license-tab"
					>
						<template #quota>
							<ClientOnly>
								<AsyncPanel
									panel-size="dense"
									min-height-class="min-h-0"
									:loading="showLicensePlaceholder"
									:empty="!showLicensePlaceholder && quotaDetailRows.length === 0"
									empty-title="尚無配額資料"
								>
									<div class="overflow-hidden rounded-xl border border-white/15">
										<table class="w-full border-collapse">
											<thead class="sticky top-0 z-10 bg-white/5 backdrop-blur">
												<tr class="text-left text-sm text-white/70 2xl:text-base">
													<th class="px-4 py-3 font-medium">模組</th>
													<th class="px-4 py-3 font-medium">使用量</th>
													<th class="px-4 py-3 font-medium">上限</th>
													<th class="px-4 py-3 font-medium">狀態</th>
												</tr>
											</thead>
											<tbody>
												<tr
													v-for="row in quotaDetailRows"
													:key="row.key"
													class="border-t border-white/10 text-sm text-white/80 2xl:text-base"
													:class="row.licensed ? '' : 'opacity-50'"
												>
													<td class="px-4 py-3">
														<span class="font-medium text-white">{{ row.label }}</span>
													</td>
													<td class="px-4 py-3">{{ row.used }}</td>
													<td class="px-4 py-3">
														{{ row.maxText }}
													</td>
													<td class="px-4 py-3">
														<span
															class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 2xl:text-sm"
															:class="quotaStatusClass(row.statusKind)"
														>
															{{ row.statusText }}
														</span>
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</AsyncPanel>

								<template #fallback>
									<AsyncPanel loading panel-size="dense" />
								</template>
							</ClientOnly>
						</template>

						<template #keys>
							<ClientOnly>
								<AsyncPanel
									panel-size="dense"
									min-height-class="min-h-0"
									:loading="showLicensePlaceholder"
									:empty="!showLicensePlaceholder && licenseListRows.length === 0"
									empty-title="尚無授權記錄"
									empty-description="無主／副 LK 資料"
									empty-min-height-class="min-h-[360px] 2xl:min-h-[480px]"
									loading-min-height-class="min-h-[360px] 2xl:min-h-[480px]"
								>
									<div class="space-y-4">
										<div
											v-for="entry in licenseListRows"
											:key="entry.id"
											class="rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5"
										>
											<div class="flex flex-wrap items-center gap-2 gap-y-1">
												<span
													class="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/85 ring-1 ring-white/15 2xl:text-sm"
												>
													{{ entry.roleLabel }}
												</span>
												<code class="break-all text-sm text-cyan-100/95 2xl:text-base">{{
													entry.licenseKey
												}}</code>
											</div>
											<div class="mt-3 flex flex-wrap gap-2 2xl:gap-3">
												<span
													v-for="fk in entry.features"
													:key="`${entry.id}-${fk}`"
													class="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-100 ring-1 ring-emerald-400/30 2xl:px-4 2xl:py-1.5 2xl:text-base"
												>
													{{ featureLabels[fk] ?? fk }}
													<span class="ml-1 text-white/70"
														>({{ featureQuotaText(entry, fk) }})</span
													>
												</span>
											</div>
										</div>
									</div>
								</AsyncPanel>

								<template #fallback>
									<AsyncPanel loading panel-size="dense" />
								</template>
							</ClientOnly>
						</template>
					</PageTabs>
				</div>
			</section>
		</div>
	</div>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		:confirm-text="confirmDialogConfig.confirmText"
		:cancel-text="confirmDialogConfig.cancelText"
		@confirm="handleConfirmDialogConfirm"
		@cancel="handleConfirmDialogCancel"
	/>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { LICENSE_FEATURE_KEYS, type FeatureKey, type LicenseState } from "~/types/license"
import { useApiBase } from "~/composables/core/useApiBase"
import { useAdminOnly, usePlatformAdmin } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useToast } from "~/composables/core/useToast"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import PageTabs from "~/components/common/PageTabs.vue"
import { formatMaxDevicesText, normalizeMaxDevices, toNonNegativeInt } from "~/utils/licenseFormat"

definePageMeta({
	layout: "default",
})

const featureLabels: Record<string, string> = {
	people_counting: "門禁管理",
	elevator: "電梯管理",
	lighting: "照明系統",
	hvac: "空調系統",
	air_circulation: "空氣循環",
	drainage: "排水系統",
	power: "電力系統",
	fire: "消防系統",
	emergency_rescue: "緊急求救",
	environment: "環境品質",
	smoke_alarm: "煙霧警報",
	surveillance: "影像監控",
	vehicle_access: "車輛進出",
	multimedia: "多媒體資訊",
}

const canAdmin = useAdminOnly()
const canPlatformAdmin = usePlatformAdmin()

const { request } = useApiBase()
const { license, fetchLicense, isLoaded } = useLicense()
const toast = useToast()
const { handleError } = useErrorHandler()

const confirmDialog = useConfirmDialog()
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})
const confirmDialogConfig = computed(() => confirmDialog.config.value)

type ResetConfirmStep = "idle" | "content" | "execute"
const resetConfirmStep = ref<ResetConfirmStep>("idle")

const offlineStep = ref<1 | 2>(1)
const overviewTab = ref<"quota" | "keys">("quota")
const overviewTabs = [
	{ id: "quota" as const, label: "配額詳情" },
	{ id: "keys" as const, label: "授權清單" },
]

const getPillButtonClass = (isActive: boolean) => {
	return isActive
		? "border-white/25 bg-white/10 text-white"
		: "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
}

const getStepCircleClass = (isActive: boolean) => {
	return isActive
		? "bg-cyan-500/25 text-cyan-100 ring-cyan-400/40"
		: "bg-white/10 text-white/70 ring-white/20"
}

const leftColumnRef = ref<HTMLElement | null>(null)
const rightPanelMaxHeight = ref<number | null>(null)
const isLgUp = ref(false)

const rightPanelStyle = computed<Record<string, string>>(() => {
	if (!isLgUp.value) return {}
	if (!rightPanelMaxHeight.value) return {}
	// 固定高度以維持左右同高；右側內容超出時在卡片內捲動
	return { height: `${rightPanelMaxHeight.value}px` }
})

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

const activationMethodText = computed(() => {
	const raw = String(license.value.activationMethod ?? "").trim()
	if (!raw) return "-"
	if (raw === "online") return "線上"
	if (raw === "offline") return "離線"
	if (raw === "open_all") return "全功能開啟（測試）"
	return raw
})

type QuotaDetailStatusKind = "muted" | "rose" | "emerald"

type QuotaDetailRow = {
	key: FeatureKey
	label: string
	licensed: boolean
	used: number
	maxText: string
	statusText: string
	statusKind: QuotaDetailStatusKind
}

const quotaStatusClass = (kind: QuotaDetailStatusKind) => {
	if (kind === "muted") return "bg-white/10 text-white/60 ring-white/15"
	if (kind === "rose") return "bg-rose-500/15 text-rose-100 ring-rose-400/30"
	return "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30"
}

const quotaDetailRows = computed<QuotaDetailRow[]>(() => {
	const quotas = license.value.quotas ?? {}
	const usage = license.value.usage ?? {}
	const enabled = new Set(license.value.features ?? [])

	return LICENSE_FEATURE_KEYS.map((key) => {
		const label = featureLabels[key] ?? key
		const licensed = enabled.has(key)
		const maxInfo = normalizeMaxDevices(quotas[key]?.maxDevices)
		const usedRaw = usage[key]?.usedDevices ?? 0
		const safeUsed = toNonNegativeInt(usedRaw) ?? 0

		if (!licensed) {
			return {
				key,
				label,
				licensed: false,
				used: safeUsed,
				maxText: maxInfo.text,
				statusText: "未授權",
				statusKind: "muted" as const,
			}
		}

		const isExceeded = maxInfo.max != null ? safeUsed >= maxInfo.max : false
		const statusText = isExceeded ? "已滿" : "正常"
		const statusKind: QuotaDetailStatusKind = isExceeded ? "rose" : "emerald"

		return {
			key,
			label,
			licensed: true,
			used: safeUsed,
			maxText: maxInfo.text,
			statusText,
			statusKind,
		}
	})
})

const featureQuotaText = (entry: LicenseListRow, key: FeatureKey) => {
	return formatMaxDevicesText(entry.quotas?.[key]?.maxDevices)
}

type LicenseListRow = {
	id: string
	licenseKey: string
	roleLabel: string
	features: FeatureKey[]
	quotas?: Partial<Record<FeatureKey, { maxDevices: number }>>
	legacyMerged?: boolean
	legacyUnknown?: boolean
}

const licenseListRows = computed<LicenseListRow[]>(() => {
	if (showLicensePlaceholder.value) return []

	const method = String(license.value.activationMethod ?? "").trim()
	if (method === "open_all") {
		return [
			{
				id: "open-all",
				licenseKey: "",
				roleLabel: "全功能開啟（測試）",
				features: [...LICENSE_FEATURE_KEYS],
				quotas: {},
			},
		]
	}

	const ent = license.value.licenseEntitlements ?? []
	if (ent.length > 0) {
		const mainLk = license.value.licenseKey ?? ""
		return ent.map((e, i) => ({
			id: `${e.licenseKey}-${i}`,
			licenseKey: e.licenseKey,
			roleLabel: e.licenseKey === mainLk ? "主 License Key" : "副 License Key",
			features: [...e.features],
			quotas: e.quotas ?? {},
		}))
	}

	const rows: LicenseListRow[] = []
	const ext = license.value.extensionKeys ?? []
	const main = license.value.licenseKey?.trim() || ""
	const feats = license.value.features ?? []

	if (main) {
		rows.push({
			id: "legacy-main",
			licenseKey: main,
			roleLabel: "主 License Key",
			features: [...feats],
			quotas: {},
			legacyMerged: ext.length > 0,
		})
	}

	for (const k of ext) {
		const kk = k.trim()
		if (!kk || (main && kk === main)) continue
		rows.push({
			id: `legacy-ext-${kk}`,
			licenseKey: kk,
			roleLabel: "副 License Key",
			features: [],
			quotas: {},
			legacyUnknown: true,
		})
	}

	return rows
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
	if (!canAdmin.value) return
	if (!canSubmitLicenseKey.value || isSubmittingOnline.value) return
	isSubmittingOnline.value = true
	try {
		const lk = licenseKeyInput.value.trim()
		await request<LicenseState>("/license/activate", {
			method: "POST",
			body: { licenseKey: lk },
		})
		await refreshLicense()
		toast.success(TOAST.LICENSE_ONLINE_ACTIVATED)
	} catch (error) {
		handleError(error, "線上啟用失敗", { context: "save" })
	} finally {
		isSubmittingOnline.value = false
	}
}

const handleResetLicense = async () => {
	if (!canPlatformAdmin.value || isResettingLicense.value) return
	isResettingLicense.value = true
	try {
		await request<LicenseState>("/license/reset", { method: "POST" })
		await refreshLicense()
		offlineStep.value = 1
		clearOfflineResponseSelection()
		toast.success(TOAST.LICENSE_LOCAL_RESET)
	} catch (error) {
		handleError(error, "重置授權失敗")
	} finally {
		isResettingLicense.value = false
	}
}

const handleRequestResetLicense = () => {
	if (!canPlatformAdmin.value || showLicensePlaceholder.value || isResettingLicense.value) return
	resetConfirmStep.value = "content"
	confirmDialog.show({
		type: "warning",
		title: "確認重置內容",
		message: "即將重置本地授權狀態，以下資料會被清除：",
		details:
			"已啟用功能、配額與使用量、序號（SN）、主／副 License Key、離線啟用指紋、副 LK 清單與授權清單（licenseEntitlements）。",
		confirmText: "下一步",
		cancelText: "取消",
	})
}

const handleConfirmDialogConfirm = async () => {
	if (resetConfirmStep.value === "content") {
		resetConfirmStep.value = "execute"
		await nextTick()
		confirmDialog.show({
			type: "danger",
			title: "確認執行重置",
			message: "確定要執行「重置授權」嗎？",
			details: "此動作無法復原；請再次確認已完成備份或已了解影響範圍。",
			confirmText: "確定重置",
			cancelText: "返回",
		})
		return
	}

	if (resetConfirmStep.value === "execute") {
		if (!canPlatformAdmin.value) {
			resetConfirmStep.value = "idle"
			return
		}
		resetConfirmStep.value = "idle"
		await handleResetLicense()
	}
}

const handleConfirmDialogCancel = () => {
	resetConfirmStep.value = "idle"
}

const handleGenerateRequestFile = async () => {
	if (!canAdmin.value) return
	if (!canGenerateRequestFile.value || isGeneratingRequestFile.value) return
	isGeneratingRequestFile.value = true
	try {
		const licenseKey = requestFileLicenseKeyInput.value.trim()
		const data = await request<{ requestFileBase64: string }>("/license/offline-request-file", {
			method: "POST",
			body: { licenseKey },
		})
		const b64 = data?.requestFileBase64 ?? ""
		if (!b64) throw new Error("後端未回傳 requestFileBase64")
		const lk = licenseKey.replace(/-/g, "")
		const blob = new Blob([b64], { type: "text/plain;charset=utf-8" })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = `license-request-${lk}.txt`
		a.click()
		URL.revokeObjectURL(url)
		toast.success(TOAST.LICENSE_REQUEST_DOWNLOADED)
		clearOfflineResponseSelection()
		offlineStep.value = 2
	} catch (error) {
		handleError(error, "產生 request file 失敗", { context: "save" })
	} finally {
		isGeneratingRequestFile.value = false
	}
}

const handleImportOffline = async () => {
	if (!canAdmin.value) return
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
		toast.success(TOAST.LICENSE_OFFLINE_IMPORTED)
	} catch (error) {
		handleError(error, "離線授權匯入失敗", { context: "save" })
	} finally {
		isSubmittingOffline.value = false
	}
}

const handleOfflineFileLabelKeyDown = (e: KeyboardEvent) => {
	if (!canAdmin.value) return
	if (e.key !== "Enter" && e.key !== " ") return
	e.preventDefault()
	offlineResponseFileInputRef.value?.click()
}

const handleOfflineResponseFileChange = async (e: Event) => {
	if (!canAdmin.value) return
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
		toast.success(TOAST.LICENSE_FILE_LOADED)
	} catch {
		clearOfflineResponseSelection()
		toast.error(TOAST.LICENSE_INVALID_JSON)
	} finally {
		if (input) input.value = ""
	}
}

onMounted(() => {
	isMounted.value = true
	void refreshLicense()

	const mql = window.matchMedia("(min-width: 1024px)")
	const updateIsLg = () => {
		isLgUp.value = mql.matches
	}
	updateIsLg()
	mql.addEventListener("change", updateIsLg)

	const updateRightPanelMaxHeight = () => {
		const el = leftColumnRef.value
		if (!el) return
		rightPanelMaxHeight.value = Math.max(0, Math.floor(el.getBoundingClientRect().height))
	}

	updateRightPanelMaxHeight()

	if (leftColumnRef.value) {
		const ro = new ResizeObserver(() => updateRightPanelMaxHeight())
		ro.observe(leftColumnRef.value)
		window.addEventListener("resize", updateRightPanelMaxHeight, { passive: true })

		onUnmounted(() => {
			ro.disconnect()
			window.removeEventListener("resize", updateRightPanelMaxHeight)
			mql.removeEventListener("change", updateIsLg)
		})
	}
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
