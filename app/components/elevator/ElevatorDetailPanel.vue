<template>
	<div class="flex min-h-0 flex-1">
		<div class="show-scrollbar flex min-w-0 flex-1 flex-col gap-4">
			<div
				class="rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4"
				role="status"
				aria-live="polite"
				:aria-label="statusAriaLabel"
			>
				<p class="text-center text-lg font-semibold text-white/80 2xl:text-xl">即時狀態</p>

				<div class="flex justify-center items-center gap-6">
					<div
						class="min-w-[200px] flex items-center justify-center px-4 py-2 2xl:px-8 2xl:py-4 bg-black/15 rounded-xl"
					>
						<p class="text-4xl font-bold text-white 2xl:text-8xl">
							{{ displayFloorText }}
						</p>
					</div>

					<div class="flex flex-col items-center">
						<svg
							class="h-8 w-8 shrink-0 transition-opacity duration-300 2xl:h-24 2xl:w-24"
							:class="elevatorDirectionArrowClass(direction, 'up')"
							viewBox="2 3 20 13"
							fill="currentColor"
						>
							<path d="M10.8 6.2Q12 4.8 13.2 6.2L20.2 15Q21 16 20 16H4Q3 16 3.8 15Z" />
						</svg>
						<svg
							class="-mt-1 h-8 w-8 shrink-0 transition-opacity duration-300 2xl:-mt-2 2xl:h-24 2xl:w-24"
							:class="elevatorDirectionArrowClass(direction, 'down')"
							viewBox="2 8 20 13"
							fill="currentColor"
						>
							<path d="M10.8 17.8Q12 19.2 13.2 17.8L20.2 9Q21 8 20 8H4Q3 8 3.8 9Z" />
						</svg>
					</div>

					<div class="flex flex-col items-center gap-3 2xl:gap-4">
						<button
							type="button"
							class="min-w-[5.5rem] rounded-full border-2 border-white bg-white px-6 py-2 text-lg font-bold text-[#0d4f5c] shadow-[0_2px_12px_rgba(0,0,0,0.12)] transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 2xl:min-w-[6.5rem] 2xl:px-8 2xl:py-3 2xl:text-2xl"
							:disabled="isCallElevatorDisabled"
							:aria-label="`呼梯至 ${selectedFloorLabel || '未選樓層'}`"
							@click="handleCallElevator"
						>
							呼梯
						</button>

						<div
							class="flex h-9 w-full items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-2 2xl:h-10"
						>
							<span
								class="h-3 w-3 shrink-0 rounded-full border border-white 2xl:h-4 2xl:w-4"
								:class="deviceStatusDotClass"
								aria-hidden="true"
							></span>
							<span class="text-sm font-semibold text-white 2xl:text-base">
								{{ deviceStatusLabel }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div
				class="rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4"
			>
				<p class="text-center text-lg font-semibold text-white/80 2xl:text-xl">門控操作</p>

				<div class="grid grid-cols-4 justify-items-center">
					<button
						v-for="cmd in commands"
						:key="cmd.value"
						type="button"
						class="flex aspect-square w-20 items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/70 text-xl font-bold text-white transition-all hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40 2xl:w-24 2xl:text-2xl"
						:disabled="isSubmitting || !canControl || !isConnected || selectedFloorIndex == null"
						:aria-label="`${cmd.label} ${selectedFloorLabel}`"
						@click="handleControl(cmd.value)"
					>
						{{ cmd.label }}
					</button>
				</div>
			</div>

			<div class="min-h-0 flex-1">
				<div
					class="monitoring-log-panel flex min-h-[320px] w-full min-w-0 flex-col 2xl:min-h-[400px]"
				>
					<div
						v-if="logs.length === 0"
						class="flex flex-1 items-center justify-center rounded-lg border-2 border-white/20 bg-white/5 p-8"
						role="status"
					>
						<MonitoringLogEmptyState message="尚無電梯事件記錄" />
					</div>

					<div v-else>
						<table class="w-full border-b-2 border-l-2 border-r-2 border-white/20">
							<thead class="bg-white/20">
								<tr
									class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm"
								>
									<th v-for="col in recordColumns" :key="col" class="people-log-cell-pad p-2">
										{{ recordColumnLabels[col] }}
									</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="log in logs"
									:key="log.id"
									class="border-b border-white/10 text-center text-white"
								>
									<td
										v-for="col in recordColumns"
										:key="`${log.id}-${col}`"
										class="people-log-cell-pad p-2"
									>
										{{ getElevatorLogCellValue(log, col) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>

		<div class="ms-4 min-w-0 flex-1 border-l-2 border-white/30 ps-4">
			<div class="flex h-full min-h-0 flex-col">
				<div
					class="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03]"
				>
					<p class="mt-4 shrink-0 text-center text-lg font-semibold text-white/80 2xl:text-xl">
						呼梯面板
					</p>

					<div
						v-if="floors.length === 0"
						class="flex min-h-[160px] flex-1 items-center justify-center text-base text-white/60 2xl:text-lg"
					>
						此地點尚未設定樓層
					</div>

					<div
						v-else
						class="flex min-h-0 flex-1 flex-col"
						:class="exceedsVisibleGrid ? 'justify-start' : 'justify-center'"
					>
						<div
							class="p-4"
							:class="exceedsVisibleGrid ? 'min-h-0 flex-1 overflow-y-auto' : 'shrink-0'"
						>
							<div
								class="flex flex-col"
								:class="[
									floorGridMinHeightClass,
									exceedsVisibleGrid ? 'justify-start' : 'justify-center',
								]"
							>
								<div class="grid grid-cols-4 justify-items-center gap-y-6">
									<button
										v-for="floor in floors"
										:key="floor.index"
										type="button"
										class="flex aspect-square w-20 items-center justify-center rounded-full border-2 text-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 2xl:w-24 2xl:text-3xl"
										:class="floorButtonClass(floor.index)"
										:aria-pressed="selectedFloorIndex === floor.index"
										:aria-label="`選擇樓層 ${floor.label}`"
										@click="selectedFloorIndex = floor.index"
									>
										{{ floor.label }}
									</button>
								</div>
							</div>
						</div>

						<p v-if="errorText" class="form-error-text mt-3 shrink-0 px-4 pb-4" role="alert">
							{{ errorText }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue"
import type { ElevatorControlCommand, ElevatorDirection, ElevatorLog } from "~/types/elevator"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useToast } from "~/composables/core/useToast"
import { resolveFormApiError } from "~/utils/errorUtils"
import {
	buildElevatorPanelFloorOrder,
	ELEVATOR_PANEL_VISIBLE_ROWS,
	resolveElevatorFloorLabel,
} from "~/utils/elevatorFloorConfig"
import {
	buildElevatorDeviceStatusLabel,
	buildElevatorStatusAriaLabel,
	elevatorDirectionArrowClass,
	formatElevatorLiveFloorText,
} from "~/utils/elevatorDisplayUtils"
import {
	ELEVATOR_LOG_COLUMN_LABELS,
	getElevatorLogCellValue,
	normalizeElevatorLogDisplayColumns,
	type ElevatorLogColumnKey,
} from "~/utils/elevatorLogColumns"

interface Props {
	logs: ElevatorLog[]
	displayColumns?: string[]
	deviceId?: number | null
	canControl?: boolean
	floorCount?: number
	floorNames?: string[]
	currentFloor?: number | string | null
	direction?: ElevatorDirection
	isConnected?: boolean
	floorLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
	logs: () => [],
	displayColumns: undefined,
	deviceId: null,
	canControl: false,
	floorCount: 0,
	floorNames: () => [],
	currentFloor: null,
	direction: "idle",
	isConnected: false,
	floorLabel: undefined,
})

const { logs, displayColumns } = toRefs(props)

const elevatorApi = useElevatorApi()
const toast = useToast()

const recordColumns = computed(() => normalizeElevatorLogDisplayColumns(displayColumns.value))
const recordColumnLabels = ELEVATOR_LOG_COLUMN_LABELS as Record<ElevatorLogColumnKey, string>

const displayFloorText = computed(() =>
	formatElevatorLiveFloorText({
		floorLabel: props.floorLabel,
		currentFloor: props.currentFloor,
	})
)

const deviceStatusLabel = computed(() => buildElevatorDeviceStatusLabel(props.isConnected))

const deviceStatusDotClass = computed(() => (props.isConnected ? "bg-emerald-400" : "bg-amber-400"))

const statusAriaLabel = computed(() =>
	buildElevatorStatusAriaLabel({
		floorText: displayFloorText.value,
		direction: props.direction,
		isConnected: props.isConnected,
		deviceHealthLabel: true,
	})
)

const isCallElevatorDisabled = computed(
	() =>
		isSubmitting.value ||
		!props.canControl ||
		!props.isConnected ||
		selectedFloorIndex.value == null
)

const selectedFloorIndex = ref<number | null>(null)
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const floors = computed(() => {
	const count = Number(props.floorCount) || 0
	const names = props.floorNames ?? []
	if (count < 1) return []
	return buildElevatorPanelFloorOrder(count).map((index) => ({
		index,
		label: resolveElevatorFloorLabel(index, names),
	}))
})

const floorGridMinHeightClass = "min-h-[calc(5*4.5rem+4*0.75rem)] 2xl:min-h-[calc(5*5rem+4*1rem)]"

const exceedsVisibleGrid = computed(() => floors.value.length > ELEVATOR_PANEL_VISIBLE_ROWS * 4)

const selectedFloorLabel = computed(() => {
	if (selectedFloorIndex.value == null) return ""
	return floors.value.find((f) => f.index === selectedFloorIndex.value)?.label ?? ""
})

const floorButtonClass = (index: number) => {
	if (selectedFloorIndex.value === index) {
		return "border-cyan-300 bg-cyan-500/70 text-white shadow-[0_0_16px_rgba(34,211,238,0.45)] ring-2 ring-cyan-300/50"
	}
	return "border-white/25 bg-white/10 text-white/85 hover:bg-white/20"
}

watch(
	() => [props.deviceId, props.floorCount] as const,
	() => {
		selectedFloorIndex.value = null
		errorText.value = null
	}
)

const commands: Array<{ value: ElevatorControlCommand; label: string }> = [
	{ value: "open", label: "開啟" },
	{ value: "close", label: "關閉" },
	{ value: "normally_open", label: "常開" },
	{ value: "normally_closed", label: "常閉" },
]

const handleCallElevator = () => {
	// 呼梯 API 尚未實作，僅保留 UI 入口
}

const handleControl = async (command: ElevatorControlCommand) => {
	if (!props.deviceId || !props.canControl || floors.value.length === 0) return
	if (selectedFloorIndex.value == null) {
		errorText.value = "請先選擇樓層"
		return
	}
	isSubmitting.value = true
	errorText.value = null
	try {
		await elevatorApi.controlGateway(props.deviceId, {
			gatewayIndex: selectedFloorIndex.value,
			command,
		})
		toast.success("指令已送出")
	} catch (error) {
		errorText.value = resolveFormApiError(error, "呼梯控制失敗")
	} finally {
		isSubmitting.value = false
	}
}
</script>
