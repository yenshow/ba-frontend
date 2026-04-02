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
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
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
									<span>狀態 *</span>
									<FilterDropdown
										v-model="form.severity"
										:options="severityOptions"
										placeholder="請選擇狀態（異常／警報）"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
							</div>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>類型 *</span>
								<FilterDropdown
									v-model="form.alert_type"
									:options="alertTypeOptions"
									placeholder="請選擇警報類型"
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
							<p class="mb-3 text-sm font-medium text-white/90 2xl:text-base">警報細節設定</p>
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
							<p class="mb-3 text-sm font-medium text-white/90 2xl:text-base">警報細節設定</p>
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

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>訊息模板</span>
							<textarea
								v-model="form.message_template"
								rows="3"
								class="form-input min-h-[5.5rem] resize-y"
								placeholder="例如：{location_label} 連續 {error_count} 次無法連接"
								@input="handleMessageTemplateInput"
							/>
						</label>
						<p
							v-if="previewRendered"
							class="text-sm leading-relaxed text-white/55 2xl:text-base"
							aria-live="polite"
						>
							預覽：{{ previewRendered }}
						</p>

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
} from "~/types/alert"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { UnifiedZone } from "~/types/location"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import {
	alertSourceToSystemType,
	getDefaultRuleMessageTemplate,
	inferRuleTemplateKeyFromAlertType,
	isAllowedThresholdOperator,
} from "~/utils/alertUtils"

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
	message_template: string
	enabled: boolean
}

interface Props {
	modelValue: boolean
	editingRule: AlertRule | null
	isSubmitting?: boolean
	errorMessage?: string | null
	sourceOptions: OptionItem[]
}

type MessageTemplateKey =
	| "rule.threshold.v1"
	| "rule.offline.v1"
	| "rule.di.v1"
	| "rule.do.v1"
	| "custom"

interface SubmitPayload {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	target_type?: AlertTargetType | null
	target_id?: number | null
	condition_type: "threshold" | "error_count" | "bit_state"
	condition_config: Record<string, unknown>
	message_template?: string
	message_template_key?: MessageTemplateKey
	message_template_custom?: boolean
	enabled: boolean
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
	(e: "submit", payload: SubmitPayload): void
}>()

const form = reactive<RuleFormValue>({
	source: "environment",
	alert_type: "threshold",
	severity: "warning",
	target_type: null,
	target_id: null,
	message_template: "",
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
const previewRendered = ref("")
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null

const inferTemplateKey = (): MessageTemplateKey =>
	inferRuleTemplateKeyFromAlertType(form.alert_type) as MessageTemplateKey

const syncDefaultMessageTemplate = (): string => getDefaultRuleMessageTemplate(form.alert_type)

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

const locationApi = useLocationApi()
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
	form.message_template = ""
	form.enabled = true

	thresholdConfig.parameter = ""
	thresholdConfig.operator = ">"
	thresholdConfig.value = 0
	thresholdConfig.unit = ""
	errorCountConfig.min_errors = 5
	ioAddress.value = 0
	selectedZoneId.value = ""
	selectedLocationId.value = ""
	isMessageTemplateDirty.value = false
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
	const result = await locationApi.getZones(systemType)
	zones.value = result.zones || []
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

const buildPreviewSampleCurrentValue = (): number => {
	if (form.alert_type !== "threshold") return 72
	const t = Number(thresholdConfig.value)
	if (!Number.isFinite(t)) return 72
	const op = thresholdConfig.operator
	if (op === ">" || op === ">=") return t + 2
	if (op === "<" || op === "<=") return Math.max(0, t - 2)
	return t + 2
}

const schedulePreview = () => {
	if (!import.meta.client) return
	if (previewDebounceTimer) clearTimeout(previewDebounceTimer)
	previewDebounceTimer = setTimeout(async () => {
		try {
			const { rendered } = await alertApi.previewAlertRuleMessage({
				source: form.source,
				alert_type: form.alert_type,
				condition_type: conditionTypeForPayload(),
				condition_config: buildConditionConfig(),
				target_type: form.target_type,
				target_id: form.target_id,
				message_template: form.message_template,
				message_template_custom: isMessageTemplateDirty.value,
				message_template_key: isMessageTemplateDirty.value ? "custom" : inferTemplateKey(),
				sample_source_display_name: "範例地點",
				sample_current_value: buildPreviewSampleCurrentValue(),
				sample_error_count:
					form.alert_type === "offline" ? Math.max(1, Number(errorCountConfig.min_errors) || 1) : 5,
			})
			previewRendered.value = rendered
		} catch {
			previewRendered.value = ""
		}
	}, 150)
}

const isMessageTemplateDirty = ref(false)
const handleMessageTemplateInput = () => {
	isMessageTemplateDirty.value = true
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

		if (!isMessageTemplateDirty.value) {
			form.message_template = syncDefaultMessageTemplate()
		}
		schedulePreview()
	},
	{ immediate: true }
)

watch(
	() =>
		[
			form.message_template,
			isMessageTemplateDirty.value,
			form.target_type,
			form.target_id,
			thresholdConfig.parameter,
			thresholdConfig.operator,
			thresholdConfig.value,
			thresholdConfig.unit,
			errorCountConfig.min_errors,
			ioAddress.value,
			selectedZoneId.value,
		] as const,
	() => {
		schedulePreview()
	}
)

watch(
	() => props.editingRule,
	(rule) => {
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
		form.message_template = rule.message_template || ""
		form.enabled = rule.enabled
		isMessageTemplateDirty.value = Boolean((rule as AlertRule).message_template_custom)

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
	},
	{ immediate: true }
)

const handleSubmit = () => {
	const targetType = form.target_type || null
	const targetId = form.target_id != null ? Number(form.target_id) : null
	if (targetType && (targetId == null || !Number.isFinite(targetId))) return

	const conditionType = conditionTypeForPayload()
	const conditionConfig = buildConditionConfig()
	const custom = isMessageTemplateDirty.value

	const payload: SubmitPayload = {
		source: form.source,
		alert_type: form.alert_type,
		severity: form.severity,
		target_type: targetType,
		target_id: targetId,
		condition_type: conditionType,
		condition_config: conditionConfig,
		message_template: form.message_template.trim(),
		message_template_key: custom ? "custom" : inferTemplateKey(),
		message_template_custom: custom,
		enabled: form.enabled,
	}

	emit("submit", payload)
}
</script>

<style scoped>
.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}

.form-input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}

.form-input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.form-select {
	cursor: pointer;
}

.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}
</style>
