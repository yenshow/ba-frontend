<script setup lang="ts">
import type { EnergyLoadShedStage, EnergySettingsConfig } from "~/types/energy"
import type { Device, SensorDeviceConfig, SensorDeviceModelConfig } from "~/types/device"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useToast } from "~/composables/core/useToast"
import {
	getEnergyUsageSystemLabel,
	type EnergyUsageSystemKey,
} from "~/constants/energyUsageSystems"

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

type SettingsSectionKey = "devices" | "tariff" | "contract"

const STAGE_META: Record<
	1 | 2 | 3,
	{ severityLabel: string; severityClass: string; defaultPct: number }
> = {
	1: { severityLabel: "預警", severityClass: "text-amber-300", defaultPct: 80 },
	2: { severityLabel: "嚴重", severityClass: "text-orange-300", defaultPct: 90 },
	3: { severityLabel: "危急", severityClass: "text-rose-300", defaultPct: 100 },
}

const SECTION_DEFAULTS: Record<SettingsSectionKey, boolean> = {
	devices: true,
	tariff: false,
	contract: false,
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

const expandedSections = reactive({ ...SECTION_DEFAULTS })

const canAddStage = computed(() => (form.value?.load_shed_stages || []).length < 3)

const handleClose = () => {
	emit("update:modelValue", false)
}

const toggleSection = (key: SettingsSectionKey) => {
	expandedSections[key] = !expandedSections[key]
}

const resetSections = () => {
	Object.assign(expandedSections, SECTION_DEFAULTS)
}

const nextStageLevel = (): 1 | 2 | 3 | null => {
	const used = new Set((form.value?.load_shed_stages || []).map((s) => Number(s.level)))
	for (const level of [1, 2, 3] as const) {
		if (!used.has(level)) return level
	}
	return null
}

const handleAddStage = () => {
	if (!form.value) return
	const level = nextStageLevel()
	if (level == null) return
	const stage: EnergyLoadShedStage = {
		level,
		enabled: true,
		threshold_pct: STAGE_META[level].defaultPct,
		actions: [],
	}
	form.value.load_shed_stages = [...form.value.load_shed_stages, stage].sort(
		(a, b) => a.level - b.level
	)
}

const handleRemoveStage = (level: 1 | 2 | 3) => {
	if (!form.value) return
	form.value.load_shed_stages = form.value.load_shed_stages.filter((s) => s.level !== level)
}

const load = async () => {
	const [settings, devicesRes, modelsRes] = await Promise.all([
		api.getSettings(),
		deviceApi.getDevices({ type_code: "sensor", limit: 200 }),
		deviceApi.getDeviceModels({ type_code: "sensor" }),
	])
	form.value = structuredClone(settings.config)
	resetSections()

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
						class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto text-sm 2xl:text-base"
					>
						<template v-if="form">
							<!-- 1. 表計設備（預設展開）＋表計異常 -->
							<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
								<button
									type="button"
									class="flex w-full items-center justify-between text-left text-sm font-medium tracking-widest text-white/90 2xl:text-base"
									:aria-expanded="expandedSections.devices"
									aria-controls="energy-settings-devices"
									@click="toggleSection('devices')"
								>
									<span>表計設備</span>
									<span class="text-white/60">{{
										expandedSections.devices ? "收合" : "展開"
									}}</span>
								</button>

								<div
									v-if="expandedSections.devices"
									id="energy-settings-devices"
									class="mt-4 space-y-5"
								>
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
							</div>

							<!-- 2. 電價／水價＋營運提示 -->
							<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
								<button
									type="button"
									class="flex w-full items-center justify-between text-left text-sm font-medium tracking-widest text-white/90 2xl:text-base"
									:aria-expanded="expandedSections.tariff"
									aria-controls="energy-settings-tariff"
									@click="toggleSection('tariff')"
								>
									<span>電價／水價</span>
									<span class="text-white/60">{{ expandedSections.tariff ? "收合" : "展開" }}</span>
								</button>

								<div
									v-if="expandedSections.tariff"
									id="energy-settings-tariff"
									class="mt-4 space-y-5"
								>
									<section class="space-y-3">
										<h5 class="text-sm font-medium text-white/80 2xl:text-base">
											參考電價（NT$/kWh）
										</h5>
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
									</section>

									<section class="space-y-3">
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
									</section>

									<div class="space-y-3 border-t border-white/10 pt-4">
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

							<!-- 3. 契約與分級告警 -->
							<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
								<button
									type="button"
									class="flex w-full items-center justify-between text-left text-sm font-medium tracking-widest text-white/90 2xl:text-base"
									:aria-expanded="expandedSections.contract"
									aria-controls="energy-settings-contract"
									@click="toggleSection('contract')"
								>
									<span>契約與分級告警</span>
									<span class="text-white/60">{{
										expandedSections.contract ? "收合" : "展開"
									}}</span>
								</button>

								<div
									v-if="expandedSections.contract"
									id="energy-settings-contract"
									class="mt-4 space-y-4"
								>
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
													:class="STAGE_META[stage.level].severityClass"
												>
													{{ STAGE_META[stage.level].severityLabel }}
												</span>
											</div>
											<div class="flex items-center gap-3">
												<label class="flex items-center gap-2 text-white/90">
													<input
														v-model="stage.enabled"
														type="checkbox"
														class="h-4 w-4 accent-cyan-400"
														:aria-label="`啟用 ${stage.level} 級`"
													/>
													<span>啟用</span>
												</label>
												<button
													type="button"
													class="text-xs tracking-wider text-white/50 transition-colors hover:text-rose-300 2xl:text-sm"
													:aria-label="`移除 ${stage.level} 級`"
													@click="handleRemoveStage(stage.level)"
												>
													移除
												</button>
											</div>
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

									<button
										v-if="canAddStage"
										type="button"
										class="btn-secondary w-full"
										@click="handleAddStage"
									>
										新增分級
									</button>
								</div>
							</div>
						</template>
						<div v-else class="py-8 text-center text-white/60">載入設定中…</div>
					</div>

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
