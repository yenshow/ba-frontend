<script setup lang="ts">
import type { EnergyBreakdownResponse, EnergyBreakdownSystem } from "~/types/energy"
import { useEnergyApi } from "~/composables/systems/energy/useEnergyApi"
import { ENERGY_DASHBOARD_USE_MOCK, MOCK_ENERGY_BREAKDOWN } from "~/constants/energyDashboard.mock"

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ "update:modelValue": [boolean] }>()

const api = useEnergyApi()
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const breakdown = ref<EnergyBreakdownResponse | null>(null)
const selectedSystemKey = ref<string | null>(null)
const titleId = "energy-breakdown-dialog-title"

const systems = computed(() => breakdown.value?.systems || [])

const selectedSystem = computed<EnergyBreakdownSystem | null>(() => {
	const list = systems.value
	if (list.length === 0) return null
	const key = selectedSystemKey.value
	return list.find((s) => s.systemKey === key) || list[0] || null
})

const handleClose = () => {
	emit("update:modelValue", false)
}

const formatTime = (iso: string | null) => {
	if (!iso) return "—"
	try {
		return new Date(iso).toLocaleString("zh-TW", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		})
	} catch {
		return "—"
	}
}

const loadBreakdown = async () => {
	loading.value = true
	errorMessage.value = null
	try {
		if (ENERGY_DASHBOARD_USE_MOCK) {
			await new Promise((r) => setTimeout(r, 150))
			breakdown.value = structuredClone(MOCK_ENERGY_BREAKDOWN)
		} else {
			breakdown.value = await api.getBreakdown()
		}
		selectedSystemKey.value = breakdown.value.systems[0]?.systemKey ?? null
	} catch (err: unknown) {
		breakdown.value = null
		errorMessage.value = err instanceof Error ? err.message : "載入明細失敗"
	} finally {
		loading.value = false
	}
}

const handleSelectSystem = (key: string) => {
	selectedSystemKey.value = key
}

watch(
	() => props.modelValue,
	(v) => {
		if (v) void loadBreakdown()
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
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl p-6 2xl:max-w-6xl 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-4">
						<div>
							<h3
								:id="titleId"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								系統用電明細
							</h3>
							<p class="mt-1 text-sm text-white/55 2xl:text-base">
								各用途系統下電表今日用量
								<span v-if="breakdown" class="text-white/40">
									· 合計 {{ breakdown.totalEnergyKwh.toLocaleString() }} kWh
								</span>
							</p>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white/70 transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>

					<div v-if="loading" class="py-16 text-center text-white/60">載入中…</div>
					<p
						v-else-if="errorMessage"
						class="rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-200"
						role="alert"
					>
						{{ errorMessage }}
					</p>
					<div v-else-if="systems.length === 0" class="py-16 text-center text-white/60">
						<p class="text-base 2xl:text-lg">尚無系統用量資料</p>
						<p class="mt-2 text-sm">請於設備管理為電表設定用途系統，並納入能源監測</p>
					</div>
					<div
						v-else
						class="show-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-[14rem_1fr] 2xl:grid-cols-[16rem_1fr] 2xl:gap-6"
					>
						<nav
							class="show-scrollbar max-h-[50vh] space-y-1 overflow-y-auto md:max-h-none"
							aria-label="用途系統列表"
						>
							<button
								v-for="sys in systems"
								:key="sys.systemKey"
								type="button"
								class="flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors"
								:class="
									selectedSystem?.systemKey === sys.systemKey
										? 'border-cyan-400/50 bg-cyan-500/15 text-white'
										: 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
								"
								:aria-pressed="selectedSystem?.systemKey === sys.systemKey"
								:aria-label="`選擇 ${sys.systemName}`"
								@click="handleSelectSystem(sys.systemKey)"
							>
								<span class="text-sm font-medium tracking-wider 2xl:text-base">{{
									sys.systemName
								}}</span>
								<span class="text-xs text-white/50 2xl:text-sm">
									{{ sys.energyKwh.toLocaleString() }} kWh · {{ sys.percent }}% ·
									{{ sys.deviceCount }} 表
								</span>
							</button>
						</nav>

						<div class="show-scrollbar min-h-0 overflow-y-auto overflow-x-auto">
							<table
								v-if="selectedSystem"
								class="w-full min-w-[40rem] border-collapse text-left text-sm text-white/85 2xl:text-base"
							>
								<thead>
									<tr
										class="border-b border-white/20 text-xs tracking-wider text-white/50 2xl:text-sm"
									>
										<th class="px-2 py-2 font-medium">電表名稱</th>
										<th class="px-2 py-2 font-medium">位置</th>
										<th class="px-2 py-2 text-right font-medium">今日用量</th>
										<th class="px-2 py-2 text-right font-medium">佔系統</th>
										<th class="px-2 py-2 text-right font-medium">佔全站</th>
										<th class="px-2 py-2 text-right font-medium">即時功率</th>
										<th class="px-2 py-2 font-medium">最近讀數</th>
									</tr>
								</thead>
								<tbody>
									<tr
										v-for="m in selectedSystem.meters"
										:key="m.deviceId"
										class="border-b border-white/10"
									>
										<td class="px-2 py-2.5">
											<div>{{ m.deviceName }}</div>
										</td>
										<td class="px-2 py-2.5 text-white/70">{{ m.location || "—" }}</td>
										<td class="px-2 py-2.5 text-right tabular-nums">
											{{ m.energyKwh.toLocaleString() }} kWh
										</td>
										<td class="px-2 py-2.5 text-right tabular-nums text-white/70">
											{{ m.percentOfSystem }}%
										</td>
										<td class="px-2 py-2.5 text-right tabular-nums text-white/70">
											{{ m.percentOfTotal }}%
										</td>
										<td class="px-2 py-2.5 text-right tabular-nums">
											{{ m.activePowerKw != null ? `${m.activePowerKw.toLocaleString()} kW` : "—" }}
										</td>
										<td class="px-2 py-2.5 text-white/60">
											{{ formatTime(m.lastReadingAt) }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<footer class="flex justify-end border-t border-white/20 pt-4">
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
