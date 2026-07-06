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
							<span>系統<span class="required-mark">*</span></span>
							<FilterDropdown
								v-model="form.source"
								:options="sourceSelectOptions"
								placeholder="請選擇來源系統"
								text-size="text-sm 2xl:text-base"
							/>
						</label>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>類型<span class="required-mark">*</span></span>
								<FilterDropdown
									v-model="form.alert_type"
									:options="alertTypeOptions"
									placeholder="請選擇警報類型"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>狀態<span class="required-mark">*</span></span>
								<FilterDropdown
									v-model="form.severity"
									:options="severityOptions"
									placeholder="請選擇狀態（異常／警報）"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
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
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>參數 (parameter)<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="thresholdConfig.parameter"
										:options="parameterOptions"
										placeholder="請選擇參數"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>運算子 (operator)<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="thresholdConfig.operator"
										:options="thresholdOperatorOptions"
										placeholder="請選擇運算子"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>門檻值 (value)<span class="required-mark">*</span></span>
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
									<span>最小錯誤次數 (min_errors)<span class="required-mark">*</span></span>
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
									<span>位址<span class="required-mark">*</span></span>
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
								v-model="form.message_suffix"
								rows="3"
								class="form-input min-h-[5.5rem] resize-y"
								placeholder="例如：請值班人員立即到場確認"
							/>
						</label>

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

									<div v-if="doLinkage.enabled" class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>設備<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="doDeviceIdModel"
												:options="controllerDeviceOptions"
												placeholder="請選擇控制器設備"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>觸發時輸出<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="doOutputValueModel"
												:options="doOutputValueOptions"
												placeholder="請選擇"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>位址<span class="required-mark">*</span></span>
											<input
												v-model.number="doLinkage.do_address"
												type="number"
												min="0"
												class="form-input"
												placeholder="例如：0"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
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
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm text-white/80">攝影機（最多 4 台）<span class="required-mark">*</span></p>
											<button
												type="button"
												class="btn-secondary"
												:disabled="cameraDeviceIdsModel.length >= 4"
												aria-label="新增一台攝影機"
												@click="handleAddCameraDeviceSlot"
											>
												新增
											</button>
										</div>
										<div class="mt-3 space-y-3">
											<div
												v-for="(val, index) in cameraDeviceIdsModel"
												:key="`camera-slot-${index}`"
												class="flex items-end gap-2"
											>
												<label class="flex flex-1 flex-col gap-2 text-sm text-white/80">
													<span>第 {{ index + 1 }} 台</span>
													<FilterDropdown
														:model-value="val ? String(val) : ''"
														:options="cameraDeviceOptions"
														placeholder="請選擇攝影機"
														text-size="text-sm 2xl:text-base"
														@update:model-value="
															(v: string) => handleUpdateCameraDeviceId(index, v)
														"
													/>
												</label>
												<button
													type="button"
													class="btn-secondary"
													:disabled="cameraDeviceIdsModel.length <= 1"
													aria-label="移除此攝影機"
													@click="handleRemoveCameraDeviceSlot(index)"
												>
													移除
												</button>
											</div>
											<p class="text-xs text-white/60">
												提示：重複選擇會自動去除；僅會儲存前 4 台。
											</p>
										</div>
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
								<span>警報通知</span>
								<span class="text-white/60">{{ expandedSections.notify ? "收合" : "展開" }}</span>
							</button>

							<div v-if="expandedSections.notify" class="mt-4 space-y-3">
								<div class="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
									<p class="mb-3 text-sm font-medium text-white/90">Email（SMTP）</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="email.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用 Email 通知</span>
									</label>

									<div v-if="email.enabled" class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>SMTP Host (主機)<span class="required-mark">*</span></span>
											<input
												v-model="email.smtp_host"
												type="text"
												class="form-input"
												placeholder="例如：smtp.example.com"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>SMTP Port (連接埠)<span class="required-mark">*</span></span>
											<input
												v-model.number="email.smtp_port"
												type="number"
												min="1"
												class="form-input"
												placeholder="例如：587"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>連線方式<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="email.smtp_security"
												:options="smtpSecurityOptions"
												placeholder="請選擇"
												text-size="text-sm 2xl:text-base"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>寄件人 Email<span class="required-mark">*</span></span>
											<input
												v-model="email.smtp_user"
												type="text"
												required
												class="form-input"
												placeholder="例如：noreply@example.com"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>密碼</span>
											<input
												v-model="email.smtp_password"
												type="password"
												class="form-input"
												placeholder="可留空"
												autocomplete="new-password"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>收件人 To（每行一個）<span class="required-mark">*</span></span>
											<textarea
												v-model="email.to_emails_text"
												rows="3"
												class="form-input min-h-[5.5rem] resize-y"
												placeholder="a@example.com&#10;b@example.com"
											/>
										</label>

										<div class="flex flex-col gap-2 md:col-span-2">
											<button
												type="button"
												class="btn-secondary w-full md:w-auto"
												:disabled="isEmailSmtpTestLoading || isSubmitting || !props.editingRule?.id"
												aria-label="寄送 SMTP 測試信"
												@click="handleEmailSmtpTestClick"
											>
												{{ isEmailSmtpTestLoading ? "寄送中..." : "寄送測試信" }}
											</button>
											<p v-if="!props.editingRule?.id" class="text-xs text-white/55">
												請先建立並儲存規則（取得規則 ID）後，才能寄送測試信。
											</p>
										</div>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>重複發送間隔（秒）<span class="required-mark">*</span></span>
											<input
												v-model.number="email.repeat_min_interval_seconds"
												type="number"
												min="15"
												class="form-input"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>最大發送次數（含第一封）<span class="required-mark">*</span></span>
											<input
												v-model.number="email.repeat_max_send_count"
												type="number"
												min="1"
												max="10"
												class="form-input"
											/>
										</label>
									</div>
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

						<p v-if="localErrorMessage || errorMessage" class="form-error-text">
							{{ localErrorMessage || errorMessage }}
						</p>
						<p
							v-if="smtpTestFeedback.message"
							class="text-sm 2xl:text-base"
							:class="smtpTestFeedback.ok ? 'text-emerald-300' : 'text-amber-200'"
						>
							{{ smtpTestFeedback.message }}
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
import {
	normalizeAlertRuleCameraDeviceIds,
	parseAlertRuleEmailsFromText,
	validateAlertRuleEmailSubscription,
	validateAlertRuleFormForSave,
} from "~/utils/alertRuleFormValidation"

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
		camera_device_ids?: number[]
	}
	emailSubscription: null | {
		enabled: boolean
		smtp_host: string
		smtp_port: number
		smtp_user: string | null
		smtp_password: string | null
		smtp_security: "none" | "ssl" | "tls"
		to_emails: string[]
		repeat_min_interval_seconds: number
		repeat_max_send_count: number
	}
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
	/** 內部用 slots 表示（可為 null），送出時再轉成 number[] */
	camera_device_ids: [null] as Array<number | null>,
})

const smtpSecurityOptions: OptionItem[] = [
	{ value: "none", label: "無" },
	{ value: "ssl", label: "SSL" },
	{ value: "tls", label: "TLS" },
]

const email = reactive({
	enabled: false,
	smtp_host: "",
	smtp_port: 587 as number,
	smtp_user: "",
	smtp_password: "",
	smtp_security: "tls" as "none" | "ssl" | "tls",
	to_emails_text: "",
	repeat_min_interval_seconds: 15 as number,
	repeat_max_send_count: 10 as number,
})

const localErrorMessage = ref<string>("")
const isEmailSmtpTestLoading = ref(false)
const smtpTestFeedback = reactive<{ ok: boolean; message: string }>({
	ok: false,
	message: "",
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

const cameraDeviceIdsModel = computed<Array<number | null>>({
	get() {
		const raw = Array.isArray(cameraLinkage.camera_device_ids)
			? cameraLinkage.camera_device_ids
			: []
		const normalized = raw
			.map((v) => (v == null ? null : Number(v)))
			.map((n) => (Number.isFinite(n as number) ? (n as number) : null))

		// 保留空 slot；但已選擇的 deviceId 需去重（保留第一個）
		const seen = new Set<number>()
		const deduped = normalized.map((v) => {
			if (v == null || v <= 0) return null
			if (seen.has(v)) return null
			seen.add(v)
			return v
		})

		const trimmed = deduped.slice(0, 4)
		return trimmed.length > 0 ? trimmed : [null]
	},
	set(next) {
		const raw = Array.isArray(next) ? next : []
		const normalized = raw
			.map((v) => (v == null ? null : Number(v)))
			.map((n) => (Number.isFinite(n as number) ? (n as number) : null))
			.map((v) => (v != null && v > 0 ? v : null))

		const seen = new Set<number>()
		const deduped = normalized.map((v) => {
			if (v == null) return null
			if (seen.has(v)) return null
			seen.add(v)
			return v
		})

		const trimmed = deduped.slice(0, 4)
		cameraLinkage.camera_device_ids = trimmed.length > 0 ? trimmed : [null]
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
	{ value: "noise", label: "噪音值" },
	{ value: "pm25", label: "PM2.5" },
	{ value: "pm10", label: "PM10" },
	{ value: "co2", label: "CO2" },
	{ value: "temperature", label: "溫度" },
	{ value: "humidity", label: "濕度" },
	{ value: "tvoc", label: "TVOC" },
	{ value: "hcho", label: "HCHO" },
	{ value: "wind", label: "風速" },
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
	cameraLinkage.camera_device_ids = [null]

	email.enabled = false
	email.smtp_host = ""
	email.smtp_port = 587
	email.smtp_user = ""
	email.smtp_password = ""
	email.smtp_security = "tls"
	email.to_emails_text = ""
	email.repeat_min_interval_seconds = 15
	email.repeat_max_send_count = 10

	localErrorMessage.value = ""

	expandedSections.linkage = false
	expandedSections.notify = false
}

const handleAddCameraDeviceSlot = () => {
	if (cameraDeviceIdsModel.value.length >= 4) return
	cameraDeviceIdsModel.value = [...cameraDeviceIdsModel.value, null]
}

const handleRemoveCameraDeviceSlot = (index: number) => {
	const next = [...cameraDeviceIdsModel.value]
	next.splice(index, 1)
	cameraDeviceIdsModel.value = next.length > 0 ? next : [null]
}

const handleUpdateCameraDeviceId = (index: number, value: string) => {
	const n = Number(value)
	const next = [...cameraDeviceIdsModel.value]
	next[index] = Number.isFinite(n) && n > 0 ? n : null
	cameraDeviceIdsModel.value = next
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
		const idsRaw = (c as any)?.camera_device_ids as unknown
		const ids = Array.isArray(idsRaw)
			? (idsRaw as unknown[])
					.map((v) => Number(v))
					.filter((n): n is number => Number.isFinite(n) && n > 0)
					.slice(0, 4)
			: []
		const merged = [...new Set(ids)].slice(0, 4)
		cameraLinkage.camera_device_ids = merged.length > 0 ? merged : [null]

		const es = (res as any)?.emailSubscription
		email.enabled = Boolean(es?.enabled)
		email.smtp_host = String(es?.smtp_host || "")
		email.smtp_port = Number(es?.smtp_port ?? 587)
		email.smtp_user = String(es?.smtp_user || "")
		email.smtp_password = String(es?.smtp_password || "")
		email.smtp_security = String(es?.smtp_security || "tls") as any as "none" | "ssl" | "tls"
		email.to_emails_text = Array.isArray(es?.to_emails) ? es.to_emails.join("\n") : ""
		email.repeat_min_interval_seconds = Number(es?.repeat_min_interval_seconds ?? 15)
		email.repeat_max_send_count = Number(es?.repeat_max_send_count ?? 10)
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
		smtpTestFeedback.ok = false
		smtpTestFeedback.message = ""
		if (!import.meta.client) return
		if (devices.value.length === 0 && !isDevicesLoading.value) {
			void loadDevices()
		}
	},
	{ immediate: true }
)

const buildAlertRuleValidationInput = () => ({
	target_type: form.target_type || null,
	target_id: form.target_id != null ? Number(form.target_id) : null,
	doLinkage: {
		enabled: doLinkage.enabled,
		do_device_id: doLinkage.do_device_id,
		do_address: doLinkage.do_address,
		auto_off_seconds: doLinkage.auto_off_seconds,
	},
	cameraLinkage: {
		enabled: cameraLinkage.enabled,
		camera_device_ids: normalizeAlertRuleCameraDeviceIds(cameraDeviceIdsModel.value),
	},
	email,
})

const handleEmailSmtpTestClick = async () => {
	localErrorMessage.value = ""
	smtpTestFeedback.ok = false
	smtpTestFeedback.message = ""

	const ruleId = props.editingRule?.id
	if (!ruleId) {
		localErrorMessage.value = "SMTP 測試：請先建立並儲存規則"
		return
	}

	const err = validateAlertRuleEmailSubscription(email, "SMTP 測試")
	if (err) {
		localErrorMessage.value = err
		return
	}

	isEmailSmtpTestLoading.value = true
	try {
		const res = await alertApi.testAlertRuleSmtpEmail(ruleId, {
			emailSubscription: {
				enabled: Boolean(email.enabled),
				smtp_host: email.smtp_host.trim(),
				smtp_port: Number(email.smtp_port),
				smtp_user: email.smtp_user.trim(),
				smtp_password: email.smtp_password || null,
				smtp_security: email.smtp_security,
				to_emails: parseAlertRuleEmailsFromText(email.to_emails_text),
			},
		})

		smtpTestFeedback.ok = true
		smtpTestFeedback.message = `SMTP 測試寄送成功（messageId: ${String(res?.messageId || "") || "—"}）`
	} catch (e: any) {
		smtpTestFeedback.ok = false
		smtpTestFeedback.message = `SMTP 測試寄送失敗：${String(e?.data?.message || e?.message || e || "未知錯誤")}`
	} finally {
		isEmailSmtpTestLoading.value = false
	}
}

const handleSubmit = () => {
	localErrorMessage.value = ""
	smtpTestFeedback.ok = false
	smtpTestFeedback.message = ""

	const submitError = validateAlertRuleFormForSave(buildAlertRuleValidationInput())
	if (submitError) {
		localErrorMessage.value = submitError
		return
	}

	const targetType = form.target_type || null
	const targetId = form.target_id != null ? Number(form.target_id) : null
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
			? {
					enabled: true,
					camera_device_ids: normalizeAlertRuleCameraDeviceIds(
						cameraDeviceIdsModel.value,
					).slice(0, 4),
				}
			: null,
		emailSubscription: email.enabled
			? {
					enabled: true,
					smtp_host: email.smtp_host.trim(),
					smtp_port: Number(email.smtp_port),
					smtp_user: email.smtp_user.trim(),
					smtp_password: email.smtp_password || null,
					smtp_security: email.smtp_security,
					to_emails: parseAlertRuleEmailsFromText(email.to_emails_text),
					repeat_min_interval_seconds: Number(email.repeat_min_interval_seconds),
					repeat_max_send_count: Number(email.repeat_max_send_count),
				}
			: null,
	}

	emit("submit", { rule: rulePayload, integrations })
}
</script>
