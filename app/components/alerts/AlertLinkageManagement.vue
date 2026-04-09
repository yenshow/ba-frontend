<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="mb-4 flex flex-col gap-3 2xl:mb-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">警報連動（Alarm Out / DO）</h2>
				<p class="text-sm text-white/70 2xl:text-base">
					當 DI 警報觸發時，可即時輸出指定 DO 點，並支援延時自動復歸與手動強制關閉。
				</p>
			</div>

			<button
				type="button"
				class="w-full rounded-xl border border-white/20 bg-green-500/80 px-4 py-2 text-sm text-white transition-colors hover:bg-green-400 2xl:w-auto 2xl:px-6 2xl:py-3 2xl:text-base"
				@click="handleOpenCreate"
			>
				新增連動
			</button>
		</div>

		<div class="min-h-[420px]">
			<div v-if="isLoading" class="py-16 text-center text-white/70">連動規則載入中...</div>
			<div
				v-else-if="linkages.length === 0"
				class="flex min-h-[420px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-10 text-center text-white/80"
			>
				目前沒有連動規則
			</div>
			<Transition v-else name="fade" mode="out-in">
				<div :key="`linkages-${linkages.length}`">
					<table class="w-full text-center">
						<thead>
							<tr class="border-b border-white/20">
								<th :class="tableHeaderClass">#</th>
								<th :class="tableHeaderClass">觸發</th>
								<th :class="tableHeaderClass">DO 目標</th>
								<th :class="tableHeaderClass">延時復歸</th>
								<th :class="tableHeaderClass">狀態</th>
								<th :class="tableHeaderClass">操作</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="(item, idx) in linkages"
								:key="item.id"
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">{{ idx + 1 }}</td>
								<td :class="[tableCellClass, 'text-white/70']">
									<div class="flex flex-col gap-1">
										<div>
											<span class="text-white/80">{{ item.trigger_source }}</span>
											<span class="text-white/40"> / </span>
											<span class="text-white/80">{{ item.trigger_alert_type }}</span>
										</div>
										<div class="text-xs text-white/60 2xl:text-sm">
											<div>dimension_key：{{ item.trigger_dimension_key || "（不限）" }}</div>
											<div>severity ≥ {{ item.trigger_severity_min }}</div>
										</div>
									</div>
								</td>
								<td :class="[tableCellClass, 'text-white/70']">
									<div class="flex flex-col gap-1">
										<div>
											<span class="text-white/80">device_id</span>
											<span class="text-white/40">:</span>
											<span class="text-white/80">{{ item.do_device_id ?? "-" }}</span>
										</div>
										<div class="text-xs text-white/60 2xl:text-sm">
											DO 位址：{{ item.do_address ?? "-" }}，輸出值：{{ item.do_value ? "ON" : "OFF" }}
										</div>
									</div>
								</td>
								<td :class="tableCellClass">
									<span class="text-white/70">
										{{ item.auto_off_seconds ? `${item.auto_off_seconds}s` : "不自動復歸" }}
									</span>
								</td>
								<td :class="tableCellClass">
									<span
										:class="[
											item.enabled ? 'bg-green-500/25 text-green-100' : 'bg-white/10 text-white/70',
											'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
										]"
									>
										{{ item.enabled ? "啟用" : "停用" }}
									</span>
								</td>
								<td :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
										<button
											type="button"
											class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
											@click="handleOpenEdit(item)"
										>
											編輯
										</button>
										<button
											type="button"
											class="rounded bg-yellow-500/80 px-3 py-1 text-white hover:bg-yellow-400 2xl:px-4 2xl:py-2"
											@click="handleManualOff(item)"
										>
											手動關閉 DO
										</button>
										<button
											type="button"
											class="rounded bg-slate-500/80 px-3 py-1 text-white hover:bg-slate-400 2xl:px-4 2xl:py-2"
											@click="handleReleaseManualOff(item)"
										>
											恢復自動
										</button>
										<button
											type="button"
											class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
											@click="handleDelete(item)"
										>
											刪除
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Transition>
		</div>
	</section>

	<!-- Dialog（沿用 alerts 規則 Dialog 的統一樣式） -->
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="showDialog"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-label="警報連動設定"
				@click.self="handleCloseDialog"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-2xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ editing ? "編輯連動規則" : "新增連動規則" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉連動對話框"
							@click="handleCloseDialog"
						>
							&times;
						</button>
					</header>

					<form
						class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
						@submit.prevent="handleSubmit"
					>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>觸發來源（source）*</span>
								<FilterDropdown
									v-model="form.trigger_source"
									:options="sourceOptions"
									placeholder="請選擇來源系統"
									text-size="text-sm 2xl:text-base"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>觸發類型（alert_type）*</span>
								<FilterDropdown
									v-model="form.trigger_alert_type"
									:options="alertTypeOptions"
									placeholder="請選擇類型"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>dimension_key（選填）</span>
								<input
									v-model="form.trigger_dimension_key"
									type="text"
									class="form-input"
									placeholder="留空表示不限"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>嚴重度門檻（severity ≥）</span>
								<FilterDropdown
									v-model="form.trigger_severity_min"
									:options="severityOptions"
									placeholder="warning"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<p class="mb-3 text-sm font-medium text-white/90 2xl:text-base">DO 輸出設定</p>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base md:col-span-2">
									<span>DO 設備（device_id）*</span>
									<FilterDropdown
										v-model="doDeviceIdString"
										:options="deviceOptions"
										placeholder="請選擇設備"
										text-size="text-sm 2xl:text-base"
									/>
								</label>

								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>DO 位址（address）*</span>
									<input
										v-model.number="form.do_address"
										type="number"
										min="0"
										class="form-input"
										placeholder="例如：0"
									/>
								</label>

								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>延時自動復歸（秒，選填）</span>
									<input
										v-model.number="form.auto_off_seconds"
										type="number"
										min="1"
										class="form-input"
										placeholder="留空表示不自動復歸"
									/>
								</label>

								<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base md:col-span-2">
									<span class="sr-only">連動啟用狀態</span>
									<label class="relative inline-flex cursor-pointer items-center">
										<input v-model="form.enabled" type="checkbox" class="peer sr-only" />
										<div
											class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
										></div>
										<span class="ml-3 text-sm 2xl:text-base">{{
											form.enabled ? "連動已啟用" : "連動已停用"
										}}</span>
									</label>
								</label>

								<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base md:col-span-2">
									<span class="sr-only">DO 輸出值</span>
									<label class="relative inline-flex cursor-pointer items-center">
										<input v-model="form.do_value" type="checkbox" class="peer sr-only" />
										<div
											class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
										></div>
										<span class="ml-3 text-sm 2xl:text-base">{{
											form.do_value ? "觸發時輸出 ON（true）" : "觸發時輸出 OFF（false）"
										}}</span>
									</label>
								</label>
							</div>
						</div>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>名稱（選填）</span>
							<input
								v-model="form.name"
								type="text"
								class="form-input"
								placeholder="例如：DI 觸發蜂鳴器"
							/>
						</label>
					</form>

					<footer class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8">
						<button type="button" class="btn-secondary" @click="handleCloseDialog">取消</button>
						<div class="flex-1"></div>
						<button type="button" class="btn-primary" :disabled="isSubmitting" @click="handleSubmit">
							{{ isSubmitting ? "儲存中..." : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	AlertLinkage,
	AlertSeverity,
	AlertSource,
	AlertType,
	CreateAlertLinkagePayload,
	UpdateAlertLinkagePayload,
} from "~/types/alert"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

const alertApi = useAlertApi()
const deviceApi = useDeviceApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()

const isLoading = ref(false)
const isSubmitting = ref(false)
const linkages = ref<AlertLinkage[]>([])

const devices = ref<Device[]>([])
const isDevicesLoading = ref(false)

const showDialog = ref(false)
const editing = ref<AlertLinkage | null>(null)

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const sourceOptions: { value: "" | AlertSource; label: string }[] = [
	{ value: "", label: "請選擇" },
	{ value: "device", label: "設備系統" },
	{ value: "environment", label: "環境系統" },
	{ value: "lighting", label: "照明系統" },
	{ value: "drainage", label: "衛生排水系統" },
	{ value: "power", label: "電力系統" },
	{ value: "people_counting", label: "人流系統" },
	{ value: "hvac", label: "空調系統" },
	{ value: "fire", label: "消防系統" },
	{ value: "emergency_rescue", label: "緊急求救系統" },
	{ value: "security", label: "安防系統" },
]

const alertTypeOptions: { value: "" | AlertType; label: string }[] = [
	{ value: "", label: "請選擇" },
	{ value: "di", label: "di" },
	{ value: "do", label: "do" },
	{ value: "offline", label: "offline" },
	{ value: "error", label: "error" },
	{ value: "threshold", label: "threshold" },
]

const severityOptions: { value: AlertSeverity; label: string }[] = [
	{ value: "warning", label: "warning" },
	{ value: "error", label: "error" },
	{ value: "critical", label: "critical" },
]

type LinkageForm = {
	name: string
	enabled: boolean
	trigger_source: "" | AlertSource
	trigger_alert_type: "" | AlertType
	trigger_dimension_key: string
	trigger_severity_min: AlertSeverity
	do_device_id: number | null
	do_address: number | null
	do_value: boolean
	auto_off_seconds: number | null
}

const buildEmptyForm = (): LinkageForm => ({
	name: "",
	enabled: true,
	trigger_source: "",
	trigger_alert_type: "di",
	trigger_dimension_key: "",
	trigger_severity_min: "warning",
	do_device_id: null,
	do_address: null,
	do_value: true,
	auto_off_seconds: null,
})

const form = ref<LinkageForm>(buildEmptyForm())

const doDeviceIdString = ref("")

watch(doDeviceIdString, (v) => {
	if (!v) {
		form.value.do_device_id = null
		return
	}
	const id = Number(v)
	form.value.do_device_id = Number.isFinite(id) ? id : null
})

watch(
	() => form.value.do_device_id,
	(id) => {
		if (!id) {
			doDeviceIdString.value = ""
			return
		}
		doDeviceIdString.value = String(id)
	}
)

const deviceOptions = computed(() => {
	const base = [{ value: "", label: isDevicesLoading.value ? "設備載入中..." : "請選擇設備" }]
	const items = devices.value.map((d) => ({
		value: String(d.id),
		label: `#${d.id} ${d.name || "(未命名)"}`
	}))
	return [...base, ...items]
})

const loadDevices = async () => {
	isDevicesLoading.value = true
	try {
		const res = await deviceApi.getDevices({ limit: 200, offset: 0, orderBy: "id", order: "desc" })
		devices.value = Array.isArray(res.devices) ? res.devices : []
	} catch (err) {
		devices.value = []
	} finally {
		isDevicesLoading.value = false
	}
}

const loadLinkages = async () => {
	isLoading.value = true
	try {
		const res = await alertApi.getAlertLinkages()
		linkages.value = (res.linkages || []).slice().sort((a, b) => b.id - a.id)
	} catch (err) {
		handleApiError(err, "載入連動規則失敗")
	} finally {
		isLoading.value = false
	}
}

const handleOpenCreate = async () => {
	editing.value = null
	form.value = buildEmptyForm()
	doDeviceIdString.value = ""
	showDialog.value = true
	if (devices.value.length === 0) await loadDevices()
}

const handleOpenEdit = async (item: AlertLinkage) => {
	editing.value = item
	form.value = {
		name: item.name || "",
		enabled: Boolean(item.enabled),
		trigger_source: item.trigger_source || "",
		trigger_alert_type: item.trigger_alert_type || "",
		trigger_dimension_key: item.trigger_dimension_key || "",
		trigger_severity_min: item.trigger_severity_min || "warning",
		do_device_id: item.do_device_id ?? null,
		do_address: item.do_address ?? null,
		do_value: Boolean(item.do_value),
		auto_off_seconds: item.auto_off_seconds ?? null,
	}
	doDeviceIdString.value = item.do_device_id != null ? String(item.do_device_id) : ""
	showDialog.value = true
	if (devices.value.length === 0) await loadDevices()
}

const handleCloseDialog = () => {
	showDialog.value = false
	editing.value = null
	isSubmitting.value = false
}

const buildPayload = (): CreateAlertLinkagePayload => {
	const payload: CreateAlertLinkagePayload = {
		name: form.value.name || null,
		enabled: form.value.enabled,
		trigger_source: form.value.trigger_source as AlertSource,
		trigger_alert_type: form.value.trigger_alert_type as AlertType,
		trigger_dimension_key: form.value.trigger_dimension_key ? form.value.trigger_dimension_key : null,
		trigger_severity_min: form.value.trigger_severity_min,
		do_device_id: Number(form.value.do_device_id),
		do_address: Number(form.value.do_address),
		do_value: Boolean(form.value.do_value),
		auto_off_seconds: form.value.auto_off_seconds ?? null,
	}
	return payload
}

const validateForm = () => {
	if (!form.value.trigger_source) return "請選擇觸發來源（source）"
	if (!form.value.trigger_alert_type) return "請選擇觸發類型（alert_type）"
	if (!form.value.do_device_id) return "請選擇 DO 設備"
	if (form.value.do_address === null || form.value.do_address === undefined) return "請輸入 DO 位址"
	if (Number(form.value.do_address) < 0) return "DO 位址不可小於 0"
	if (form.value.auto_off_seconds != null && Number(form.value.auto_off_seconds) <= 0) {
		return "延時自動復歸需為正整數或留空"
	}
	return null
}

const handleSubmit = async () => {
	const errMsg = validateForm()
	if (errMsg) {
		toast.warning(errMsg)
		return
	}

	isSubmitting.value = true
	try {
		if (!editing.value) {
			await alertApi.createAlertLinkage(buildPayload())
			toast.warning("連動規則已建立")
		} else {
			const patch: UpdateAlertLinkagePayload = buildPayload()
			await alertApi.updateAlertLinkage(editing.value.id, patch)
			toast.warning("連動規則已更新")
		}
		await loadLinkages()
		handleCloseDialog()
	} catch (err) {
		handleApiError(err, "儲存連動規則失敗")
	} finally {
		isSubmitting.value = false
	}
}

const handleDelete = async (item: AlertLinkage) => {
	try {
		await alertApi.deleteAlertLinkage(item.id)
		toast.warning("已刪除連動規則")
		await loadLinkages()
	} catch (err) {
		handleApiError(err, "刪除連動規則失敗")
	}
}

const handleManualOff = async (item: AlertLinkage) => {
	if (!item.do_device_id || item.do_address == null) {
		toast.warning("此規則未設定 DO 目標")
		return
	}
	try {
		await alertApi.manualOffDoOutput({
			linkage_id: item.id,
			do_device_id: item.do_device_id,
			do_address: item.do_address,
			reason: "平台手動強制關閉",
		})
		toast.warning("已手動關閉 DO，並啟用 manual off")
	} catch (err) {
		handleApiError(err, "手動關閉 DO 失敗")
	}
}

const handleReleaseManualOff = async (item: AlertLinkage) => {
	if (!item.do_device_id || item.do_address == null) {
		toast.warning("此規則未設定 DO 目標")
		return
	}
	try {
		const res = await alertApi.releaseManualOffOverride({
			do_device_id: item.do_device_id,
			do_address: item.do_address,
		})
		if (res.success) toast.warning("已解除 manual off，恢復自動連動")
		else toast.warning("目前沒有 manual off 覆寫")
	} catch (err) {
		handleApiError(err, "解除 manual off 失敗")
	}
}

onMounted(async () => {
	await loadLinkages()
})
</script>

