<script setup lang="ts">
import type { EnergySettingsConfig } from "~/types/energy"
import type { Device, SensorDeviceConfig, SensorDeviceModelConfig } from "~/types/device"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useToast } from "~/composables/core/useToast"
import {
	ENERGY_USAGE_SYSTEMS,
	getEnergyUsageSystemLabel,
	type EnergyUsageSystemKey,
} from "~/constants/energyUsageSystems"

type SensorDeviceRow = {
	id: number
	name: string
	modelId: number
	isElectricityMeter: boolean
	config: SensorDeviceConfig
	usageSystem: EnergyUsageSystemKey | ""
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
const usageSystemSelectOptions = ENERGY_USAGE_SYSTEMS.map((s) => ({
	value: s.key,
	label: s.label,
}))

const handleClose = () => {
	emit("update:modelValue", false)
}

const load = async () => {
	const [settings, devicesRes, modelsRes] = await Promise.all([
		api.getSettings(),
		deviceApi.getDevices({ type_code: "sensor", limit: 200 }),
		deviceApi.getDeviceModels({ type_code: "sensor" }),
	])
	form.value = structuredClone(settings.config)

	const meterKindByModel = new Map<number, string | undefined>()
	for (const m of modelsRes?.device_models || []) {
		const cfg = m.config as SensorDeviceModelConfig | undefined
		meterKindByModel.set(m.id, cfg?.meterKind)
	}

	sensorDevices.value = (devicesRes?.devices || []).map((d: Device) => {
		const cfg = (d.config || { type: "sensor", protocol: "modbus" }) as SensorDeviceConfig
		const isElectricityMeter = meterKindByModel.get(d.model_id) === "electricity"
		return {
			id: d.id,
			name: d.name,
			modelId: d.model_id,
			isElectricityMeter,
			config: cfg,
			usageSystem: (cfg.energy_usage_system as EnergyUsageSystemKey) || "",
		}
	})
}

const toggleDevice = (id: number) => {
	if (!form.value) return
	const set = new Set(form.value.include_device_ids)
	if (set.has(id)) set.delete(id)
	else set.add(id)
	form.value.include_device_ids = Array.from(set)
}

const handleUsageSystemChange = async (row: SensorDeviceRow, event: Event) => {
	const value = (event.target as HTMLSelectElement).value as EnergyUsageSystemKey | ""
	row.usageSystem = value
	const nextConfig: SensorDeviceConfig = {
		...row.config,
		type: "sensor",
		energy_usage_system: value || undefined,
	}
	if (!value) delete nextConfig.energy_usage_system
	try {
		await deviceApi.updateDevice(row.id, { config: nextConfig })
		row.config = nextConfig
		toast.success(`已更新用途系統：${getEnergyUsageSystemLabel(value)}`)
	} catch (err: unknown) {
		toast.error(err instanceof Error ? err.message : "更新用途系統失敗")
		await load()
	}
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

watch(
	() => props.modelValue,
	(v) => {
		if (v) void load()
	}
)
</script>

<template>
	<!-- 與 EditMockDialog／ConfirmDialog／SimulationFrame 相同殼層 -->
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] px-4 backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				:aria-labelledby="titleId"
				@click.self="handleClose"
				@keydown.esc="handleClose"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl p-6 2xl:max-w-3xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-4">
						<h3
							:id="titleId"
							class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
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

					<div class="show-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto text-sm 2xl:text-base">
						<template v-if="form">
							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									契約容量
								</h4>
								<label class="form-label">
									<span>契約容量 (kW)</span>
									<input
										v-model.number="form.contract_capacity_kw"
										type="number"
										min="0"
										class="form-input"
									/>
								</label>
								<label class="form-label">
									<span>需量視窗（分鐘）</span>
									<input
										v-model.number="form.demand_window_minutes"
										type="number"
										min="1"
										class="form-input"
									/>
								</label>
								<p class="text-xs tracking-wider text-white/45 2xl:text-sm">
									需量視窗目前僅儲存設定，契約告警仍依即時加總功率／需量判定（後續版本啟用）。
								</p>
							</section>

							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									告警門檻 — 需處置（Incident）
								</h4>
								<p class="text-xs tracking-wider text-white/50 2xl:text-sm">
									寫入警示紀錄；可於儀表板「告警通知」與 Header 未解數查看。
								</p>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.demand_warning_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用契約接近預警</span>
								</label>
								<label class="form-label">
									<span>接近契約容量（%）</span>
									<input
										v-model.number="form.demand_warning_pct"
										type="number"
										min="1"
										max="100"
										class="form-input"
									/>
								</label>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.demand_alert_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用超契約容量告警</span>
								</label>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.meter_stale_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用表計通訊逾時告警</span>
								</label>
								<label class="form-label">
									<span>表計逾時（分鐘）</span>
									<input
										v-model.number="form.meter_stale_minutes"
										type="number"
										min="1"
										class="form-input"
									/>
								</label>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.reading_jump_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用讀數跳動異常告警</span>
								</label>
								<div class="grid grid-cols-2 gap-3">
									<label class="form-label">
										<span>跳動倍數門檻</span>
										<input
											v-model.number="form.reading_jump_multiplier"
											type="number"
											min="1.5"
											step="0.1"
											class="form-input"
										/>
									</label>
									<label class="form-label">
										<span>最小跳動 (kWh)</span>
										<input
											v-model.number="form.reading_jump_min_kwh"
											type="number"
											min="0"
											step="0.1"
											class="form-input"
										/>
									</label>
								</div>
							</section>

							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									告警門檻 — 營運提示（Insight）
								</h4>
								<p class="text-xs tracking-wider text-white/50 2xl:text-sm">
									僅顯示於儀表板「告警通知」，不進警示紀錄。
								</p>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.usage_vs_avg_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用用量達歷史平均提示（電）</span>
								</label>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.water_usage_vs_avg_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用用量達歷史平均提示（水）</span>
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
									<span>啟用離峰用量偏低提示</span>
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
										/>
									</label>
									<label class="form-label">
										<span>基線天數</span>
										<input
											v-model.number="form.offpeak_baseline_days"
											type="number"
											min="7"
											class="form-input"
										/>
									</label>
								</div>
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.meter_share_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用單表佔比過高提示</span>
								</label>
								<label class="form-label">
									<span>單表佔比門檻（%）</span>
									<input
										v-model.number="form.meter_share_pct"
										type="number"
										min="1"
										max="100"
										class="form-input"
									/>
								</label>
							</section>

							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									台電三段式參考電價（NT$/kWh）
								</h4>
								<div class="grid grid-cols-3 gap-3">
									<label class="form-label">
										<span>尖峰</span>
										<input
											v-model.number="form.electricity_tariff.peak.rate"
											type="number"
											min="0"
											step="0.01"
											class="form-input"
										/>
									</label>
									<label class="form-label">
										<span>半尖峰</span>
										<input
											v-model.number="form.electricity_tariff.semi_peak.rate"
											type="number"
											min="0"
											step="0.01"
											class="form-input"
										/>
									</label>
									<label class="form-label">
										<span>離峰</span>
										<input
											v-model.number="form.electricity_tariff.off_peak.rate"
											type="number"
											min="0"
											step="0.01"
											class="form-input"
										/>
									</label>
								</div>
								<p class="text-xs tracking-wider text-white/50 2xl:text-sm">
									時段 window 可於 JSON／後續表單細調；未命中時段歸離峰。預設可用離峰單價估算。
								</p>
							</section>

							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									參考水價（NT$/m³）
								</h4>
								<input
									v-model.number="form.water_tariff.rate"
									type="number"
									min="0"
									step="0.01"
									class="form-input"
								/>
							</section>

							<section class="space-y-3">
								<h4 class="text-base font-medium tracking-widest text-white/80">
									納入統計的表計設備
								</h4>
								<div
									class="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-white/5 p-3"
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
										<select
											v-if="d.isElectricityMeter"
											class="form-input max-w-[9rem] shrink-0 py-1 text-sm"
											:value="d.usageSystem"
											:aria-label="`${d.name} 用途系統`"
											@change="handleUsageSystemChange(d, $event)"
										>
											<option value="">未設定</option>
											<option
												v-for="opt in usageSystemSelectOptions"
												:key="opt.value"
												:value="opt.value"
											>
												{{ opt.label }}
											</option>
										</select>
										<span
											v-else
											class="shrink-0 text-xs text-white/45 2xl:text-sm"
											>非電表</span
										>
									</div>
									<div v-if="sensorDevices.length === 0" class="py-4 text-center text-white/60">
										<p class="text-base">尚無感測器設備</p>
										<p class="mt-2 text-sm">請先於「設備管理」新增</p>
									</div>
								</div>
							</section>
						</template>
						<div v-else class="py-8 text-center text-white/60">載入設定中…</div>
					</div>

					<footer class="flex items-center justify-end gap-3 border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" @click="handleClose">取消</button>
						<button type="button" class="btn-primary" :disabled="saving || !form" @click="handleSave">
							{{ saving ? "儲存中…" : "儲存" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
