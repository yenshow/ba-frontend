<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-2xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ editingRule ? "編輯警報規則" : "新增警報規則" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉規則對話框"
							@click="emit('update:modelValue', false)"
						>
							&times;
						</button>
					</header>

					<form
						class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
						@submit.prevent="handleSubmit"
					>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>系統 *</span>
							<FilterDropdown
								v-model="form.source"
								:options="sourceSelectOptions"
								placeholder="請選擇來源系統"
								text-size="text-sm 2xl:text-base"
							/>
						</label>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>類型 *</span>
								<FilterDropdown
									v-model="form.alert_type"
									:options="alertTypeOptions"
									placeholder="請選擇警報類型"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>狀態 *</span>
								<FilterDropdown
									v-model="form.severity"
									:options="severityOptions"
									placeholder="請選擇狀態（異常／警報）"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>目標區域 (zone)</span>
								<FilterDropdown
									:model-value="selectedZoneId"
									:options="zoneOptions"
									placeholder="全域（不限定區域）"
									text-size="text-sm 2xl:text-base"
									@update:model-value="
										(v) => {
											handleSelectZone(v)
										}
									"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>目標地點 (location)</span>
								<FilterDropdown
									:model-value="selectedLocationId"
									:options="locationOptions"
									:disabled="!selectedZoneId"
									placeholder="先選擇區域"
									text-size="text-sm 2xl:text-base"
									@update:model-value="(v) => handleSelectLocation(v)"
								/>
							</label>
						</div>

						<div
							v-if="form.alert_type === 'threshold'"
							class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>參數 (parameter) *</span>
									<FilterDropdown
										v-model="thresholdConfig.parameter"
										:options="parameterOptions"
										placeholder="請選擇參數"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>運算子 (operator) *</span>
									<FilterDropdown
										v-model="thresholdConfig.operator"
										:options="thresholdOperatorOptions"
										placeholder="請選擇運算子"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>門檻值 (value) *</span>
									<input
										v-model.number="thresholdConfig.value"
										type="number"
										step="any"
										required
										class="form-input"
										placeholder="數值"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>單位 (unit)</span>
									<input
										v-model="thresholdConfig.unit"
										type="text"
										class="form-input"
										placeholder="例如：ug/m³"
									/>
								</label>
							</div>
						</div>

						<div v-else class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<template v-if="form.alert_type === 'offline'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>最小錯誤次數 (min_errors) *</span>
									<input
										v-model.number="errorCountConfig.min_errors"
										type="number"
										min="1"
										required
										class="form-input"
										placeholder="例如：5"
									/>
								</label>
							</template>
							<template v-else-if="form.alert_type === 'di' || form.alert_type === 'do'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>位址 *</span>
									<input
										v-model.number="ioAddress"
										type="number"
										min="0"
										max="65535"
										required
										class="form-input"
										placeholder="位址"
										@blur="handleIoAddressBlur"
									/>
								</label>
							</template>
							<template v-else>
								<p class="text-sm text-white/60">請先選擇警報類型</p>
							</template>
						</div>

						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<p class="mb-2 text-sm font-medium text-white/90 2xl:text-base">訊息模板</p>
							<label
								class="mt-3 flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
							>
								<textarea
									v-model="form.message_suffix"
									rows="3"
									class="form-input min-h-[5.5rem] resize-y"
									placeholder="例如：請值班人員立即到場確認"
								/>
							</label>
						</div>

						<!-- Integrations: accordion -->
						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<button
								type="button"
								class="flex w-full items-center justify-between text-left text-sm font-medium text-white/90 2xl:text-base"
								@click="expandedSections.linkage = !expandedSections.linkage"
							>
								<span>警報連動</span>
								<span class="text-white/60">{{ expandedSections.linkage ? "收合" : "展開" }}</span>
							</button>

							<div v-if="expandedSections.linkage" class="mt-4 space-y-4">
								<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p class="mb-3 text-sm font-medium text-white/90">DO 輸出設定</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="doLinkage.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用 DO 連動</span>
									</label>

									<div v-if="doLinkage.enabled" class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>設備 *</span>
											<FilterDropdown
												v-model="doDeviceIdModel"
												:options="controllerDeviceOptions"
												placeholder="請選擇控制器設備"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>觸發時輸出 *</span>
											<FilterDropdown
												v-model="doOutputValueModel"
												:options="doOutputValueOptions"
												placeholder="請選擇"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>位址 *</span>
											<input
												v-model.number="doLinkage.do_address"
												type="number"
												min="0"
												class="form-input"
												placeholder="例如：0"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>延時復歸（秒）</span>
											<input
												v-model.number="doLinkage.auto_off_seconds"
												type="number"
												min="1"
												class="form-input"
												placeholder="留空 - 不自動復歸"
											/>
										</label>
									</div>
								</div>

								<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p class="mb-3 text-sm font-medium text-white/90">攝影機連動</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="cameraLinkage.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用攝影機彈窗</span>
									</label>
									<div v-if="cameraLinkage.enabled" class="mt-3">
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>攝影機 *</span>
											<FilterDropdown
												v-model="cameraDeviceIdModel"
												:options="cameraDeviceOptions"
												placeholder="請選擇攝影機"
												text-size="text-sm 2xl:text-base"
											/>
										</label>
									</div>
								</div>
							</div>
						</div>

						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<button
								type="button"
								class="flex w-full items-center justify-between text-left text-sm font-medium text-white/90 2xl:text-base"
								@click="expandedSections.notify = !expandedSections.notify"
							>
								<span>警報通知（Webhook）</span>
								<span class="text-white/60">{{ expandedSections.notify ? "收合" : "展開" }}</span>
							</button>

							<div v-if="expandedSections.notify" class="mt-4 space-y-3">
								<p class="text-sm leading-relaxed text-white/60">
									本次先保留設定，後續再擴充實際投遞。
								</p>
								<label class="flex items-center gap-3 text-sm text-white/80">
									<input v-model="webhook.enabled" type="checkbox" class="h-4 w-4" />
									<span>啟用 Webhook</span>
								</label>
								<div v-if="webhook.enabled" class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
										<span>Webhook URL *</span>
										<input
											v-model="webhook.url"
											type="text"
											class="form-input"
											placeholder="https://..."
										/>
									</label>
									<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
										<span>Secret</span>
										<input
											v-model="webhook.secret"
											type="text"
											class="form-input"
											placeholder="用於簽章或驗證"
										/>
									</label>
								</div>
							</div>
						</div>

						<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base">
							<span class="sr-only">規則啟用狀態</span>
							<label class="relative inline-flex cursor-pointer items-center">
								<input v-model="form.enabled" type="checkbox" class="peer sr-only" />
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									form.enabled ? "警報已啟用" : "警報已停用"
								}}</span>
							</label>
						</label>

						<p v-if="errorMessage" class="text-sm text-rose-300 2xl:text-base">
							{{ errorMessage }}
						</p>
					</form>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="emit('update:modelValue', false)">
							取消
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isSubmitting"
							@click="handleSubmit"
						>
							{{ isSubmitting ? "處理中..." : editingRule ? "儲存變更" : "建立警報" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	AlertRule,
	AlertSeverity,
	AlertSource,
	AlertTargetType,
	AlertType,
	AlertRuleIntegrations,
} from "~/types/alert"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { UnifiedZone } from "~/types/location"
import { useZonesCache } from "~/composables/location/cache/useZonesCache"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { alertSourceToSystemType, isAllowedThresholdOperator } from "~/utils/alertUtils"

interface OptionItem {
	value: string
	label: string
}

interface RuleFormValue {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	target_type: AlertTargetType | null
	target_id: number | null
	message_suffix: string
	enabled: boolean
}

interface Props {
	modelValue: boolean
	editingRule: AlertRule | null
	isSubmitting?: boolean
	errorMessage?: string | null
	sourceOptions: OptionItem[]
}

interface SubmitPayload {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	target_type?: AlertTargetType | null
	target_id?: number | null
	condition_type: "threshold" | "error_count" | "bit_state"
	condition_config: Record<string, unknown>
	message_suffix?: string | null
	enabled: boolean
}

interface IntegrationsDraft {
	doLinkage: null | {
		enabled: boolean
		do_device_id: number | null
		do_address: number | null
		do_output_value: "on" | "off"
		auto_off_seconds: number | null
	}
	cameraLinkage: null | {
		enabled: boolean
		camera_device_id: number | null
	}
	webhookSubscriptions: Array<{
		enabled: boolean
		url: string
		secret?: string | null
	}>
}

const props = withDefaults(defineProps<Props>(), {
	isSubmitting: false,
	errorMessage: null,
})

/** 與列表篩選共用選項時排除「全部」，僅保留實際來源（對齊必填欄位） */
const sourceSelectOptions = computed(() => props.sourceOptions.filter((o) => o.value !== ""))

const alertTypeOptions: OptionItem[] = [
	{ value: "offline", label: "設備狀態警報" },
	{ value: "di", label: "DI 警報" },
	{ value: "do", label: "DO 警報" },
	{ value: "threshold", label: "環境參數警報" },
]

const severityOptions: OptionItem[] = [
	{ value: "warning", label: "異常" },
	{ value: "critical", label: "警報" },
]

const thresholdOperatorOptions: OptionItem[] = [
	{ value: ">", label: "超過（>）" },
	{ value: ">=", label: "超過含等於（>=）" },
	{ value: "<", label: "低於（<）" },
	{ value: "<=", label: "低於含等於（<=）" },
]

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
	(e: "submit", payload: { rule: SubmitPayload; integrations: IntegrationsDraft }): void
}>()

const form = reactive<RuleFormValue>({
	source: "environment",
	alert_type: "threshold",
	severity: "warning",
	target_type: null,
	target_id: null,
	message_suffix: "",
	enabled: true,
})

const thresholdConfig = reactive({
	parameter: "",
	operator: ">",
	value: 0,
	unit: "",
})

const errorCountConfig = reactive({
	min_errors: 5,
})

const ioAddress = ref<number>(0)

const { normalizeModbusAddressInput } = useModbusValidation()

const alertApi = useAlertApi()
const deviceApi = useDeviceApi()

const expandedSections = reactive({ linkage: false, notify: false })

const doLinkage = reactive({
	enabled: false,
	do_device_id: null as number | null,
	do_address: null as number | null,
	do_output_value: "on" as "on" | "off",
	auto_off_seconds: null as number | null,
})

const cameraLinkage = reactive({
	enabled: false,
	camera_device_id: null as number | null,
})

const webhook = reactive({
	enabled: false,
	url: "",
	secret: "",
})

const devices = ref<Device[]>([])
const isDevicesLoading = ref(false)
let devicesLoadPromise: Promise<void> | null = null

const doOutputValueOptions = [
	{ value: "on", label: "ON" },
	{ value: "off", label: "OFF" },
]

const doOutputValueModel = computed<string>({
	get() {
		return doLinkage.do_output_value
	},
	set(v) {
		doLinkage.do_output_value = v === "off" ? "off" : "on"
	},
})

const doDeviceIdModel = computed<string>({
	get() {
		return doLinkage.do_device_id != null ? String(doLinkage.do_device_id) : ""
	},
	set(v) {
		const n = Number(v)
		doLinkage.do_device_id = v && Number.isFinite(n) ? n : null
	},
})

const cameraDeviceIdModel = computed<string>({
	get() {
		return cameraLinkage.camera_device_id != null ? String(cameraLinkage.camera_device_id) : ""
	},
	set(v) {
		const n = Number(v)
		cameraLinkage.camera_device_id = v && Number.isFinite(n) ? n : null
	},
})

const controllerDeviceOptions = computed(() => {
	const base = [{ value: "", label: isDevicesLoading.value ? "設備載入中..." : "請選擇設備" }]
	const items = devices.value
		.filter(
			(d) =>
				String((d as Device & { type_code?: string }).type_code || "").toLowerCase() ===
				"controller"
		)
		.map((d) => ({ value: String(d.id), label: String(d.name || "").trim() || "(未命名)" }))
	return [...base, ...items]
})

const cameraDeviceOptions = computed(() => {
	const base = [{ value: "", label: isDevicesLoading.value ? "設備載入中..." : "請選擇攝影機" }]
	const items = devices.value
		.filter(
			(d) =>
				String((d as Device & { type_code?: string }).type_code || "").toLowerCase() === "camera"
		)
		.map((d) => ({ value: String(d.id), label: String(d.name || "").trim() || "(未命名)" }))
	return [...base, ...items]
})

const parameterOptions: OptionItem[] = [
	{ value: "noise", label: "noise（噪音值）" },
	{ value: "pm25", label: "pm25（PM2.5）" },
	{ value: "pm10", label: "pm10（PM10）" },
	{ value: "co2", label: "co2（CO2）" },
	{ value: "temperature", label: "temperature（溫度）" },
	{ value: "humidity", label: "humidity（濕度）" },
	{ value: "tvoc", label: "tvoc（TVOC）" },
	{ value: "hcho", label: "hcho（HCHO）" },
	{ value: "wind", label: "wind（風速）" },
]

const zonesCache = useZonesCache()
const zones = ref<UnifiedZone[]>([])
const selectedZoneId = ref<string>("")
const selectedLocationId = ref<string>("")

const zoneOptions = computed<OptionItem[]>(() => {
	const base: OptionItem[] = [{ value: "", label: "全域" }]
	return base.concat(zones.value.map((z) => ({ value: String(z.id), label: z.name })))
})

const locationOptions = computed<OptionItem[]>(() => {
	if (!selectedZoneId.value) return []
	const zone = zones.value.find((z) => String(z.id) === String(selectedZoneId.value))
	const locations = zone?.locations || []
	return locations.map((l) => ({ value: String(l.id), label: l.name }))
})

const resetForm = () => {
	form.source = "environment"
	form.alert_type = "threshold"
	form.severity = "warning"
	form.target_type = null
	form.target_id = null
	form.message_suffix = ""
	form.enabled = true

	thresholdConfig.parameter = ""
	thresholdConfig.operator = ">"
	thresholdConfig.value = 0
	thresholdConfig.unit = ""
	errorCountConfig.min_errors = 5
	ioAddress.value = 0
	selectedZoneId.value = ""
	selectedLocationId.value = ""

	doLinkage.enabled = false
	doLinkage.do_device_id = null
	doLinkage.do_address = null
	doLinkage.do_output_value = "on"
	doLinkage.auto_off_seconds = null

	cameraLinkage.enabled = false
	cameraLinkage.camera_device_id = null

	webhook.enabled = false
	webhook.url = ""
	webhook.secret = ""

	expandedSections.linkage = false
	expandedSections.notify = false
}

const handleSelectZone = (zoneId: string) => {
	selectedZoneId.value = zoneId || ""
	selectedLocationId.value = ""
	// 目標映射：若選 location → target_type=location；若只選 zone → target_type=zone；都不選 → global
	if (!selectedZoneId.value) {
		form.target_type = null
		form.target_id = null
		return
	}
	form.target_type = "zone"
	form.target_id = Number(selectedZoneId.value)
}

const handleSelectLocation = (locationId: string) => {
	selectedLocationId.value = locationId || ""
	if (!selectedZoneId.value) {
		form.target_type = null
		form.target_id = null
		return
	}
	if (!selectedLocationId.value) {
		form.target_type = "zone"
		form.target_id = Number(selectedZoneId.value)
		return
	}
	form.target_type = "location"
	form.target_id = Number(selectedLocationId.value)
}

const loadZones = async () => {
	const systemType = alertSourceToSystemType(form.source)
	if (!systemType) {
		zones.value = []
		return
	}
	const z = await zonesCache.getZones(systemType)
	zones.value = z || []
}

const conditionTypeForPayload = (): SubmitPayload["condition_type"] =>
	form.alert_type === "offline"
		? "error_count"
		: form.alert_type === "di" || form.alert_type === "do"
			? "bit_state"
			: "threshold"

const buildConditionConfig = (): Record<string, unknown> => {
	if (form.alert_type === "threshold") {
		return {
			parameter: thresholdConfig.parameter.trim(),
			operator: thresholdConfig.operator,
			value: Number(thresholdConfig.value),
			unit: thresholdConfig.unit.trim(),
		}
	}
	if (form.alert_type === "offline") {
		return {
			min_errors: Math.max(1, Number(errorCountConfig.min_errors) || 1),
		}
	}
	const addr = normalizeModbusAddressInput(ioAddress.value)
	return {
		bit_key: `${form.alert_type}:${addr}`,
	}
}

const handleIoAddressBlur = () => {
	ioAddress.value = normalizeModbusAddressInput(ioAddress.value)
}

const loadDevices = async () => {
	if (devices.value.length > 0) return
	if (devicesLoadPromise) {
		await devicesLoadPromise
		return
	}
	isDevicesLoading.value = true
	devicesLoadPromise = (async () => {
		try {
			const res = await deviceApi.getDevices({
				limit: 500,
				offset: 0,
				orderBy: "id",
				order: "desc",
			})
			devices.value = Array.isArray(res.devices) ? res.devices : []
		} catch {
			devices.value = []
		} finally {
			isDevicesLoading.value = false
			devicesLoadPromise = null
		}
	})()
	await devicesLoadPromise
}

const loadIntegrationsForRule = async (ruleId: number) => {
	try {
		const res = await alertApi.getAlertRuleIntegrations(ruleId)
		const d = res?.doLinkage
		doLinkage.enabled = Boolean(d?.enabled)
		doLinkage.do_device_id = d?.do_device_id ?? null
		doLinkage.do_address = d?.do_address ?? null
		doLinkage.do_output_value = (d?.do_output_value as "on" | "off") || "on"
		doLinkage.auto_off_seconds = d?.auto_off_seconds ?? null

		const c = res?.cameraLinkage
		cameraLinkage.enabled = Boolean(c?.enabled)
		cameraLinkage.camera_device_id = c?.camera_device_id ?? null

		const w = Array.isArray(res?.webhookSubscriptions) ? res.webhookSubscriptions : []
		const first = w[0]
		webhook.enabled = Boolean(first?.enabled)
		webhook.url = String(first?.url || "")
		webhook.secret = String(first?.secret || "")
	} catch {
		// ignore
	}
}

watch(
	() => [form.source, form.alert_type] as const,
	async ([nextSource]) => {
		await loadZones()
		// 切換來源後，若原本選的 zone/location 不存在就重置
		const zoneExists = selectedZoneId.value
			? zones.value.some((z) => String(z.id) === String(selectedZoneId.value))
			: true
		if (!zoneExists) {
			handleSelectZone("")
		}

		// 編輯模式：若只帶 locationId，從 zones 反推 zoneId，確保 location 下拉可用
		if (selectedLocationId.value && !selectedZoneId.value) {
			for (const z of zones.value) {
				const exists = (z.locations || []).some(
					(l) => String(l.id) === String(selectedLocationId.value)
				)
				if (exists) {
					selectedZoneId.value = String(z.id)
					break
				}
			}
			if (selectedZoneId.value) {
				form.target_type = "location"
				form.target_id = Number(selectedLocationId.value)
			}
		}
	},
	{ immediate: true }
)

watch(
	() => props.editingRule,
	async (rule) => {
		if (!rule) {
			resetForm()
			return
		}
		form.source = rule.source
		form.alert_type = rule.alert_type
		// 相容：舊資料若是 error severity，前端顯示成 critical（紅）
		form.severity = rule.severity === "error" ? "critical" : rule.severity
		form.target_type = ((rule as any).target_type as AlertTargetType) || null
		form.target_id = (rule as any).target_id != null ? Number((rule as any).target_id) : null
		form.message_suffix = String((rule as AlertRule).message_suffix || "")
		form.enabled = rule.enabled

		// 目標反推：location > zone；其餘視為全域
		selectedZoneId.value = ""
		selectedLocationId.value = ""
		if (form.target_type === "location" && form.target_id != null) {
			selectedLocationId.value = String(form.target_id)
			form.target_type = "location"
		} else if (form.target_type === "zone" && form.target_id != null) {
			selectedZoneId.value = String(form.target_id)
			form.target_type = "zone"
		} else {
			form.target_type = null
			form.target_id = null
		}

		if (rule.condition_type === "threshold") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			thresholdConfig.parameter = String(config.parameter || "")
			const rawOp = String(config.operator || ">")
			thresholdConfig.operator = isAllowedThresholdOperator(rawOp) ? rawOp : ">"
			thresholdConfig.value = Number(config.value ?? 0)
			thresholdConfig.unit = String(config.unit || "")
		} else if (rule.condition_type === "error_count") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			errorCountConfig.min_errors = Number(config.min_errors ?? 5)
		} else if (rule.condition_type === "bit_state") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			const bitKey = String(config.bit_key || "")
			const match = bitKey.match(/^(di|do):(\d+)$/i)
			ioAddress.value = normalizeModbusAddressInput(match ? Number(match[2]) : 0)
		}

		if (import.meta.client) {
			if (devices.value.length === 0 && !isDevicesLoading.value) {
				void loadDevices()
			}
			if (rule.id) {
				void loadIntegrationsForRule(rule.id)
			}
		}
	},
	{ immediate: true }
)

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		if (!import.meta.client) return
		if (devices.value.length === 0 && !isDevicesLoading.value) {
			void loadDevices()
		}
	},
	{ immediate: true }
)

const handleSubmit = () => {
	const targetType = form.target_type || null
	const targetId = form.target_id != null ? Number(form.target_id) : null
	if (targetType && (targetId == null || !Number.isFinite(targetId))) return

	if (doLinkage.enabled) {
		if (!doLinkage.do_device_id) return
		if (doLinkage.do_address == null || Number(doLinkage.do_address) < 0) return
		if (doLinkage.auto_off_seconds != null && Number(doLinkage.auto_off_seconds) <= 0) return
	}

	if (cameraLinkage.enabled) {
		if (!cameraLinkage.camera_device_id) return
	}

	if (webhook.enabled) {
		if (!webhook.url.trim()) return
	}

	const conditionType = conditionTypeForPayload()
	const conditionConfig = buildConditionConfig()

	const rulePayload: SubmitPayload = {
		source: form.source,
		alert_type: form.alert_type,
		severity: form.severity,
		target_type: targetType,
		target_id: targetId,
		condition_type: conditionType,
		condition_config: conditionConfig,
		message_suffix: form.message_suffix ?? null,
		enabled: form.enabled,
	}

	const integrations: IntegrationsDraft = {
		doLinkage: doLinkage.enabled
			? {
					enabled: true,
					do_device_id: doLinkage.do_device_id,
					do_address: doLinkage.do_address,
					do_output_value: doLinkage.do_output_value,
					auto_off_seconds: doLinkage.auto_off_seconds,
				}
			: null,
		cameraLinkage: cameraLinkage.enabled
			? { enabled: true, camera_device_id: cameraLinkage.camera_device_id }
			: null,
		webhookSubscriptions:
			webhook.enabled && webhook.url.trim()
				? [{ enabled: true, url: webhook.url.trim(), secret: webhook.secret?.trim() || null }]
				: [],
	}

	emit("submit", { rule: rulePayload, integrations })
}
</script>
