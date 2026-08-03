<script setup lang="ts">
import type { EnergySettingsConfig } from "~/types/energy"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { useToast } from "~/composables/core/useToast"

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [boolean]; saved: [] }>()

const api = useEnergyApi()
const deviceApi = useDeviceApi()
const toast = useToast()
const saving = ref(false)
const form = ref<EnergySettingsConfig | null>(null)
const sensorDevices = ref<Array<{ id: number; name: string }>>([])
const titleId = "energy-settings-dialog-title"

const handleClose = () => {
	emit("update:modelValue", false)
}

const load = async () => {
	const [settings, devicesRes] = await Promise.all([
		api.getSettings(),
		deviceApi.getDevices({ type_code: "sensor", limit: 200 }),
	])
	form.value = structuredClone(settings.config)
	sensorDevices.value = (devicesRes?.devices || []).map((d) => ({
		id: d.id,
		name: d.name,
	}))
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
									契約容量／告警
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
								<label class="flex items-center gap-2 text-white/90">
									<input
										v-model="form.demand_alert_enabled"
										type="checkbox"
										class="h-4 w-4 accent-cyan-400"
									/>
									<span>啟用超契約容量告警</span>
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
									class="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-white/20 bg-white/5 p-3"
								>
									<label
										v-for="d in sensorDevices"
										:key="d.id"
										class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 text-white/90 transition-colors hover:bg-white/10"
									>
										<input
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
											:checked="form.include_device_ids.includes(d.id)"
											:aria-label="`納入 ${d.name}`"
											@change="toggleDevice(d.id)"
										/>
										<span>{{ d.name }} (#{{ d.id }})</span>
									</label>
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
