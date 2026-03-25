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
								<span>來源系統 *</span>
								<FilterDropdown
									v-model="form.source"
									:options="sourceSelectOptions"
									placeholder="請選擇來源系統"
									text-size="text-sm 2xl:text-base"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>警報類型 *</span>
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
								<span>嚴重程度 *</span>
								<FilterDropdown
									v-model="form.severity"
									:options="severityOptions"
									placeholder="請選擇嚴重程度"
									text-size="text-sm 2xl:text-base"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>條件類型</span>
								<input
									:value="conditionTypeLabel"
									type="text"
									disabled
									class="form-input cursor-not-allowed opacity-70"
									aria-readonly="true"
								/>
							</label>
						</div>

						<div
							v-if="form.alert_type === 'threshold'"
							class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
							<p class="mb-3 text-sm font-medium text-white/90 2xl:text-base">Threshold 條件設定</p>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>參數 (parameter) *</span>
									<input
										v-model="thresholdConfig.parameter"
										type="text"
										required
										class="form-input"
										placeholder="例如：pm25 / humidity"
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
							<p class="mb-3 text-sm font-medium text-white/90 2xl:text-base">
								Error count 條件設定
							</p>
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
						</div>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>訊息模板 (message_template)</span>
							<textarea
								v-model="form.message_template"
								rows="3"
								class="form-input min-h-[5.5rem] resize-y"
								placeholder="例如：{source_name} 連續 {error_count} 次無法連接"
							/>
						</label>

						<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base">
							<span class="sr-only">規則啟用狀態</span>
							<label class="relative inline-flex cursor-pointer items-center">
								<input v-model="form.enabled" type="checkbox" class="peer sr-only" />
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									form.enabled ? "規則已啟用" : "規則已停用"
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
							{{ isSubmitting ? "處理中..." : editingRule ? "儲存變更" : "建立規則" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { AlertRule, AlertSeverity, AlertSource, AlertType } from "~/types/alert"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

interface OptionItem {
	value: string
	label: string
}

interface RuleFormValue {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
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

interface SubmitPayload {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	condition_type: "threshold" | "error_count"
	condition_config: Record<string, unknown>
	message_template?: string
	enabled: boolean
}

const props = withDefaults(defineProps<Props>(), {
	isSubmitting: false,
	errorMessage: null,
})

/** 與列表篩選共用選項時排除「全部」，僅保留實際來源（對齊必填欄位） */
const sourceSelectOptions = computed(() => props.sourceOptions.filter((o) => o.value !== ""))

const alertTypeOptions: OptionItem[] = [
	{ value: "offline", label: "offline" },
	{ value: "error", label: "error" },
	{ value: "threshold", label: "threshold" },
]

const severityOptions: OptionItem[] = [
	{ value: "warning", label: "warning" },
	{ value: "error", label: "error" },
	{ value: "critical", label: "critical" },
]

const thresholdOperatorOptions: OptionItem[] = [
	{ value: ">", label: "大於 (>)" },
	{ value: ">=", label: "大於等於 (>=)" },
	{ value: "<", label: "小於 (<)" },
	{ value: "<=", label: "小於等於 (<=)" },
]

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
	(e: "submit", payload: SubmitPayload): void
}>()

const form = reactive<RuleFormValue>({
	source: "environment",
	alert_type: "threshold",
	severity: "warning",
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

const conditionTypeLabel = computed(() =>
	form.alert_type === "threshold" ? "threshold（固定）" : "error_count（固定）"
)

const resetForm = () => {
	form.source = "environment"
	form.alert_type = "threshold"
	form.severity = "warning"
	form.message_template = ""
	form.enabled = true

	thresholdConfig.parameter = ""
	thresholdConfig.operator = ">"
	thresholdConfig.value = 0
	thresholdConfig.unit = ""
	errorCountConfig.min_errors = 5
}

watch(
	() => props.editingRule,
	(rule) => {
		if (!rule) {
			resetForm()
			return
		}
		form.source = rule.source
		form.alert_type = rule.alert_type
		form.severity = rule.severity
		form.message_template = rule.message_template || ""
		form.enabled = rule.enabled

		if (rule.alert_type === "threshold") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			thresholdConfig.parameter = String(config.parameter || "")
			thresholdConfig.operator = String(config.operator || ">")
			thresholdConfig.value = Number(config.value ?? 0)
			thresholdConfig.unit = String(config.unit || "")
		} else {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			errorCountConfig.min_errors = Number(config.min_errors ?? 5)
		}
	},
	{ immediate: true }
)

const handleSubmit = () => {
	const payload: SubmitPayload = {
		source: form.source,
		alert_type: form.alert_type,
		severity: form.severity,
		condition_type: form.alert_type === "threshold" ? "threshold" : "error_count",
		condition_config:
			form.alert_type === "threshold"
				? {
						parameter: thresholdConfig.parameter.trim(),
						operator: thresholdConfig.operator,
						value: Number(thresholdConfig.value),
						unit: thresholdConfig.unit.trim(),
					}
				: {
						min_errors: Math.max(1, Number(errorCountConfig.min_errors) || 1),
					},
		message_template: form.message_template.trim(),
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
