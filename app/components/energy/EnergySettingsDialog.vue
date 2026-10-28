<script setup lang="ts">
import type { EnergyMonthElectricityCost, EnergySettingsConfig, EnergyTariffScheme } from "~/types/energy"
import type { Device, SensorDeviceConfig, SensorDeviceModelConfig } from "~/types/device"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useToast } from "~/composables/core/useToast"
import {
	getEnergyUsageSystemLabel,
	type EnergyUsageSystemKey,
} from "~/constants/energyUsageSystems"
import { buildTaipowerTariff, formatTouWindows } from "~/constants/taipowerTouDefaults"
import EnergyReferenceBillBreakdown from "~/components/energy/EnergyReferenceBillBreakdown.vue"

type MeterKind = "electricity" | "water"

type SensorDeviceRow = {
	id: number
	name: string
	meterKind: MeterKind
	isElectricityMeter: boolean
	usageSystemLabel: string
}

const isMeterKind = (value: string | undefined): value is MeterKind =>
	value === "electricity" || value === "water"

type SettingsSectionKey = "devices" | "tariff" | "pf" | "contract" | "insights"

const ALERT_LOG_ENERGY_PATH = "/core/alert-log?source=energy"

const STAGE_META: Record<1 | 2 | 3, { severityLabel: string; severityClass: string }> = {
	1: { severityLabel: "預警", severityClass: "text-amber-300" },
	2: { severityLabel: "嚴重", severityClass: "text-orange-300" },
	3: { severityLabel: "危急", severityClass: "text-rose-300" },
}

const NAV_ITEMS: Array<{ key: SettingsSectionKey; label: string }> = [
	{ key: "devices", label: "表計設備" },
	{ key: "tariff", label: "電價／水價" },
	{ key: "pf", label: "功率因數" },
	{ key: "contract", label: "契約與分級告警" },
	{ key: "insights", label: "營運提示" },
]

const SCHEME_OPTIONS = [
	{ value: "three_stage", label: "三段式（簡易型時間電價）" },
	{ value: "two_stage", label: "二段式（簡易型時間電價）" },
]

const stageMeta = (level: number) => {
	if (level === 2 || level === 3) return STAGE_META[level]
	return STAGE_META[1]
}

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [boolean]; saved: [] }>()

const api = useEnergyApi()
const deviceApi = useDeviceApi()
const toast = useToast()
const saving = ref(false)
const form = ref<EnergySettingsConfig | null>(null)
const sensorDevices = ref<SensorDeviceRow[]>([])
const titleId = "energy-settings-dialog-title"
const activeSection = ref<SettingsSectionKey>("devices")
const billPreview = ref<EnergyMonthElectricityCost | null>(null)

const handleClose = () => {
	emit("update:modelValue", false)
}

const applyTariffPreset = (scheme: EnergyTariffScheme) => {
	if (!form.value) return
	form.value.electricity_tariff = {
		...buildTaipowerTariff(scheme),
		currency: form.value.electricity_tariff.currency || "TWD",
	}
}

const load = async () => {
	const [settings, devicesRes, modelsRes, summary] = await Promise.all([
		api.getSettings(),
		deviceApi.getDevices({ type_code: "sensor", limit: 200 }),
		deviceApi.getDeviceModels({ type_code: "sensor" }),
		api.getSummary().catch(() => null),
	])
	form.value = structuredClone(settings.config)
	activeSection.value = "devices"
	billPreview.value = summary?.monthElectricityCost ?? null

	const meterKindByModel = new Map<number, string | undefined>()
	for (const m of modelsRes?.device_models || []) {
		const cfg = m.config as SensorDeviceModelConfig | undefined
		meterKindByModel.set(m.id, cfg?.meterKind)
	}

	sensorDevices.value = (devicesRes?.devices || []).flatMap((d: Device) => {
		const meterKind = meterKindByModel.get(d.model_id)
		if (!isMeterKind(meterKind)) return []
		const cfg = (d.config || { type: "sensor", protocol: "modbus" }) as SensorDeviceConfig
		const usageSystem = (cfg.energy_usage_system as EnergyUsageSystemKey) || ""
		return [
			{
				id: d.id,
				name: d.name,
				meterKind,
				isElectricityMeter: meterKind === "electricity",
				usageSystemLabel: usageSystem ? getEnergyUsageSystemLabel(usageSystem) : "未設定",
			},
		]
	})

	const meterIds = new Set(sensorDevices.value.map((row) => row.id))
	form.value.include_device_ids = (form.value.include_device_ids || []).filter((id) =>
		meterIds.has(id)
	)
}

const toggleDevice = (id: number) => {
	if (!form.value) return
	const set = new Set(form.value.include_device_ids)
	if (set.has(id)) set.delete(id)
	else set.add(id)
	form.value.include_device_ids = Array.from(set)
}

const handleSchemeChange = (value: string | number) => {
	const scheme: EnergyTariffScheme = value === "two_stage" ? "two_stage" : "three_stage"
	if (form.value?.electricity_tariff.scheme === scheme) return
	applyTariffPreset(scheme)
}

const handleRestoreTariff = () => {
	const scheme = form.value?.electricity_tariff.scheme === "two_stage" ? "two_stage" : "three_stage"
	applyTariffPreset(scheme)
}

const handleSave = async () => {
	if (!form.value) return
	saving.value = true
	try {
		await api.updateSettings(form.value as unknown as Record<string, unknown>)
		toast.success("能源設定已儲存")
		emit("saved")
		handleClose()
	} catch (err: unknown) {
		toast.error(err instanceof Error ? err.message : "儲存失敗")
	} finally {
		saving.value = false
	}
}

const isThreeStage = computed(() => form.value?.electricity_tariff.scheme !== "two_stage")

watch(
	() => props.modelValue,
	(v) => {
		if (v) void load()
	}
)
</script>

<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@keydown.esc="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl p-6 2xl:max-w-6xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-4">
						<h3 :id="titleId" class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							能源設定
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div
						v-if="form"
						class="show-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-[14rem_1fr] 2xl:grid-cols-[16rem_1fr] 2xl:gap-6"
					>
						<nav class="show-scrollbar max-h-[40vh] space-y-1 overflow-y-auto md:max-h-none" aria-label="設定分類">
							<button
								v-for="item in NAV_ITEMS"
								:key="item.key"
								type="button"
								class="flex w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors 2xl:text-base"
								:class="
									activeSection === item.key
										? 'border-cyan-400/50 bg-cyan-500/15 text-white'
										: 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
								"
								:aria-pressed="activeSection === item.key"
								:aria-label="`選擇 ${item.label}`"
								@click="activeSection = item.key"
							>
								{{ item.label }}
							</button>
						</nav>

						<div class="show-scrollbar min-h-0 overflow-y-auto text-sm 2xl:text-base">
							<div v-show="activeSection === 'devices'" id="energy-settings-devices" class="space-y-5">
								<div
									class="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-white/5 p-3"
								>
									<div
										v-for="d in sensorDevices"
										:key="d.id"
										class="flex flex-wrap items-center gap-2 rounded border border-white/10 bg-white/5 p-2 text-white/90"
									>
										<label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
											<input
												type="checkbox"
												class="h-4 w-4 shrink-0 accent-cyan-400"
												:checked="form.include_device_ids.includes(d.id)"
												:aria-label="`納入 ${d.name}`"
												@change="toggleDevice(d.id)"
											/>
											<span class="truncate">{{ d.name }} (#{{ d.id }})</span>
										</label>
										<span
											v-if="d.isElectricityMeter"
											class="shrink-0 text-xs text-white/70 2xl:text-sm"
										>
											{{ d.usageSystemLabel }}
										</span>
										<span v-else class="shrink-0 text-xs text-white/45 2xl:text-sm">水表</span>
									</div>
									<div v-if="sensorDevices.length === 0" class="py-4 text-center text-white/60">
										<p>尚無數位電表或水表</p>
										<p class="mt-1 text-xs text-white/45 2xl:text-sm">
											請先至設備管理新增（型號 meterKind 為 electricity／water）
										</p>
									</div>
								</div>

								<div class="space-y-3 border-t border-white/10 pt-4">
									<h5 class="text-sm font-medium text-white/80 2xl:text-base">表計異常</h5>
									<label class="flex items-center gap-2 text-white/90">
										<input
											v-model="form.meter_stale_enabled"
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
										/>
										<span>通訊逾時告警</span>
									</label>
									<label class="form-label">
										<span>逾時（分鐘）</span>
										<input
											v-model.number="form.meter_stale_minutes"
											type="number"
											min="1"
											class="form-input"
											:disabled="!form.meter_stale_enabled"
										/>
									</label>
									<label class="flex items-center gap-2 text-white/90">
										<input
											v-model="form.reading_jump_enabled"
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
										/>
										<span>讀數跳動告警</span>
									</label>
									<div class="grid grid-cols-2 gap-3">
										<label class="form-label">
											<span>倍數門檻</span>
											<input
												v-model.number="form.reading_jump_multiplier"
												type="number"
												min="1.5"
												step="0.1"
												class="form-input"
												:disabled="!form.reading_jump_enabled"
											/>
										</label>
										<label class="form-label">
											<span>電表最小跳動 (kWh)</span>
											<input
												v-model.number="form.reading_jump_min_kwh"
												type="number"
												min="0"
												step="0.1"
												class="form-input"
												:disabled="!form.reading_jump_enabled"
											/>
										</label>
									</div>
								</div>
							</div>

							<div v-show="activeSection === 'tariff'" id="energy-settings-tariff" class="space-y-5">
								<section class="space-y-3">
									<div class="flex flex-wrap items-end justify-between gap-3">
										<label class="form-label min-w-[14rem] flex-1">
											<span>電價方案</span>
											<FilterDropdown
												:model-value="form.electricity_tariff.scheme"
												:options="SCHEME_OPTIONS"
												placeholder="請選擇方案"
												@update:model-value="handleSchemeChange"
											/>
										</label>
										<button type="button" class="btn-secondary text-xs 2xl:text-sm" @click="handleRestoreTariff">
											還原台電預設
										</button>
									</div>
									<p class="text-xs text-white/45 2xl:text-sm">
										夏月 {{ form.electricity_tariff.summer_start }}–{{ form.electricity_tariff.summer_end }}；週六／日全日離峰。參考用，不含基本電費。
									</p>
								</section>

								<section class="space-y-3">
									<h5 class="text-sm font-medium text-white/80 2xl:text-base">參考電價（NT$/kWh）</h5>
									<div class="overflow-x-auto">
										<table class="w-full min-w-[28rem] border-collapse text-left text-white/85">
											<thead>
												<tr class="border-b border-white/15 text-xs text-white/50 2xl:text-sm">
													<th class="px-2 py-2 font-medium">時段</th>
													<th class="px-2 py-2 font-medium">夏月</th>
													<th class="px-2 py-2 font-medium">非夏月</th>
													<th class="px-2 py-2 font-medium">夏月時段（週一至五）</th>
												</tr>
											</thead>
											<tbody>
												<tr class="border-b border-white/10">
													<td class="px-2 py-2">尖峰</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.peak.summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="尖峰夏月費率"
														/>
													</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.peak.non_summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="尖峰非夏月費率"
														/>
													</td>
													<td class="px-2 py-2 text-xs text-white/55 2xl:text-sm">
														{{ formatTouWindows(form.electricity_tariff.peak.summer_windows) }}
													</td>
												</tr>
												<tr v-if="isThreeStage" class="border-b border-white/10">
													<td class="px-2 py-2">半尖峰</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.semi_peak.summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="半尖峰夏月費率"
														/>
													</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.semi_peak.non_summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="半尖峰非夏月費率"
														/>
													</td>
													<td class="px-2 py-2 text-xs text-white/55 2xl:text-sm">
														{{ formatTouWindows(form.electricity_tariff.semi_peak.summer_windows) }}
													</td>
												</tr>
												<tr>
													<td class="px-2 py-2">離峰</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.off_peak.summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="離峰夏月費率"
														/>
													</td>
													<td class="px-2 py-2">
														<input
															v-model.number="form.electricity_tariff.off_peak.non_summer_rate"
															type="number"
															min="0"
															step="0.01"
															class="form-input"
															aria-label="離峰非夏月費率"
														/>
													</td>
													<td class="px-2 py-2 text-xs text-white/55 2xl:text-sm">其餘時段／週末</td>
												</tr>
											</tbody>
										</table>
									</div>
								</section>

								<div class="grid grid-cols-2 gap-3">
									<label class="form-label">
										<span>超額門檻（kWh）</span>
										<input
											v-model.number="form.electricity_tariff.excess_threshold_kwh"
											type="number"
											min="0"
											class="form-input"
											aria-label="超額門檻"
										/>
									</label>
									<label class="form-label">
										<span>超額每度加價</span>
										<input
											v-model.number="form.electricity_tariff.excess_surcharge_per_kwh"
											type="number"
											min="0"
											step="0.01"
											class="form-input"
											aria-label="超額每度加價"
										/>
									</label>
								</div>

								<label class="form-label">
									<span>參考水價（NT$/m³）</span>
									<input
										v-model.number="form.water_tariff.rate"
										type="number"
										min="0"
										step="0.01"
										class="form-input"
									/>
								</label>

								<EnergyReferenceBillBreakdown :cost="billPreview" />
							</div>

							<div v-show="activeSection === 'pf'" class="space-y-4">
								<p class="text-xs text-white/45 2xl:text-sm">
									基準 80%；每高／低 1 個百分點，流動電費 ±0.1%；獎勵上限 95%。以納入電表本月平均功率因數（kWh 加權）估算。
								</p>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.power_factor_adjustment.enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用功率因數獎懲</span>
								</label>
								<div class="grid grid-cols-3 gap-3">
									<label class="form-label">
										<span>基準（%）</span>
										<input
											v-model.number="form.power_factor_adjustment.baseline_pct"
											type="number"
											min="1"
											max="100"
											class="form-input"
											:disabled="!form.power_factor_adjustment.enabled"
										/>
									</label>
									<label class="form-label">
										<span>每點費率（%）</span>
										<input
											v-model.number="form.power_factor_adjustment.rate_per_point_pct"
											type="number"
											min="0"
											step="0.01"
											class="form-input"
											:disabled="!form.power_factor_adjustment.enabled"
										/>
									</label>
									<label class="form-label">
										<span>獎勵上限（%）</span>
										<input
											v-model.number="form.power_factor_adjustment.reward_cap_pct"
											type="number"
											min="1"
											max="100"
											class="form-input"
											:disabled="!form.power_factor_adjustment.enabled"
										/>
									</label>
								</div>
							</div>

							<div v-show="activeSection === 'contract'" id="energy-settings-contract" class="space-y-4">
								<label class="form-label">
									<span>契約容量 (kW)</span>
									<input
										v-model.number="form.contract_capacity_kw"
										type="number"
										min="0"
										class="form-input"
									/>
								</label>
								<div
									v-for="stage in form.load_shed_stages"
									:key="stage.level"
									class="rounded-2xl border border-white/10 bg-white/5 p-4"
								>
									<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
										<div class="flex items-center gap-2">
											<span class="font-medium text-white/90">{{ stage.level }} 級</span>
											<span
												class="text-xs tracking-wider 2xl:text-sm"
												:class="stageMeta(stage.level).severityClass"
											>
												{{ stageMeta(stage.level).severityLabel }}
											</span>
										</div>
										<label class="flex items-center gap-2 text-white/90">
											<input
												v-model="stage.enabled"
												type="checkbox"
												class="h-4 w-4 accent-cyan-400"
												:aria-label="`啟用 ${stage.level} 級`"
											/>
											<span>啟用</span>
										</label>
									</div>
									<label class="form-label">
										<span>門檻（%）</span>
										<input
											v-model.number="stage.threshold_pct"
											type="number"
											min="1"
											max="100"
											class="form-input"
											:disabled="!stage.enabled"
										/>
									</label>
								</div>
								<p class="text-sm text-white/60 2xl:text-base">
									門檻儲存後同步警示規則；DO／Email 連動請至
									<NuxtLink
										:to="ALERT_LOG_ENERGY_PATH"
										class="text-cyan-300 underline-offset-2 hover:underline"
									>
										警示紀錄
									</NuxtLink>
									。
								</p>
							</div>

							<div v-show="activeSection === 'insights'" class="space-y-3">
								<h5 class="text-sm font-medium text-white/80 2xl:text-base">營運提示</h5>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.usage_vs_avg_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>用量達歷史平均（電）</span>
								</label>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.water_usage_vs_avg_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>用量達歷史平均（水）</span>
								</label>
								<div class="grid grid-cols-2 gap-3">
									<label class="form-label">
										<span>達平均（%）</span>
										<input
											v-model.number="form.usage_vs_avg_pct"
											type="number"
											min="1"
											max="100"
											class="form-input"
										/>
									</label>
									<label class="form-label">
										<span>基線天數</span>
										<input
											v-model.number="form.usage_vs_avg_days"
											type="number"
											min="7"
											class="form-input"
										/>
									</label>
								</div>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.offpeak_low_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>離峰用量偏低</span>
								</label>
								<div class="grid grid-cols-2 gap-3">
									<label class="form-label">
										<span>低於均值（%）</span>
										<input
											v-model.number="form.offpeak_low_pct"
											type="number"
											min="1"
											max="100"
											class="form-input"
											:disabled="!form.offpeak_low_enabled"
										/>
									</label>
									<label class="form-label">
										<span>基線天數</span>
										<input
											v-model.number="form.offpeak_baseline_days"
											type="number"
											min="7"
											class="form-input"
											:disabled="!form.offpeak_low_enabled"
										/>
									</label>
								</div>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.meter_share_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>單表佔比過高</span>
								</label>
								<label class="form-label">
									<span>佔比門檻（%）</span>
									<input
										v-model.number="form.meter_share_pct"
										type="number"
										min="1"
										max="100"
										class="form-input"
										:disabled="!form.meter_share_enabled"
									/>
								</label>
							</div>
						</div>
					</div>
					<div v-else class="py-8 text-center text-white/60">載入設定中…</div>

					<footer class="flex items-center justify-end gap-3 border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" @click="handleClose">取消</button>
						<button
							type="button"
							class="btn-primary"
							:disabled="saving || !form"
							@click="handleSave"
						>
							{{ saving ? "儲存中…" : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
