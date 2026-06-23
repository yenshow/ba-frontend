<template>
	<div class="flex min-h-0 flex-1">
		<div class="flex min-w-0 flex-1 flex-col gap-8">
			<ElevatorLedBillboard
				:floor-text="displayFloorText"
				direction="idle"
				:is-connected="isDeviceNormal"
				:status-aria-label="statusAriaLabel"
				:device-health-label="deviceHealthLabel"
				:device-status-dot-class="deviceStatusDotClass"
				:is-call-elevator-disabled="isCallElevatorDisabled"
				:selected-floor-label="selectedFloorLabel"
				@call-elevator="handleCallElevator"
			/>

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
						:disabled="isSubmitting || !canControl || !isDeviceNormal || selectedFloorIndex == null"
						:aria-label="`${cmd.label} ${selectedFloorLabel}`"
						@click="handleControl(cmd.value)"
					>
						{{ cmd.label }}
					</button>
				</div>
			</div>

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
							<tr class="people-log-th text-center text-xs font-semibold text-white/80 2xl:text-sm">
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
									{{ getElevatorLogCellValue(log, col, { floorNames: props.floorNames }) }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<div class="ms-4 min-w-0 flex-1 border-l-2 border-white/30 ps-4">
			<div class="flex h-full min-h-0 flex-col">
				<div
					class="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03]"
				>
					<p class="mt-4 shrink-0 text-center text-lg font-semibold text-white/80 2xl:text-xl">
						樓層面板
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
import type { ElevatorControlCommand, ElevatorLog } from "~/types/elevator"
import MonitoringLogEmptyState from "~/components/common/MonitoringLogEmptyState.vue"
import ElevatorLedBillboard from "~/components/elevator/ElevatorLedBillboard.vue"
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
	isConnected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	logs: () => [],
	displayColumns: undefined,
	deviceId: null,
	canControl: false,
	floorCount: 0,
	floorNames: () => [],
	isConnected: false,
})

const { logs, displayColumns } = toRefs(props)

const elevatorApi = useElevatorApi()
const toast = useToast()

const recordColumns = computed(() => normalizeElevatorLogDisplayColumns(displayColumns.value))
const recordColumnLabels = ELEVATOR_LOG_COLUMN_LABELS as Record<ElevatorLogColumnKey, string>

const displayFloorText = computed(() => formatElevatorLiveFloorText({}))

const isDeviceNormal = computed(() => props.isConnected)

const deviceHealthLabel = computed(() => buildElevatorDeviceStatusLabel(props.isConnected))

const deviceStatusDotClass = computed(() =>
	isDeviceNormal.value ? "bg-emerald-400" : "bg-amber-400"
)

const statusAriaLabel = computed(() =>
	buildElevatorStatusAriaLabel({
		floorText: displayFloorText.value,
		direction: "idle",
		isConnected: props.isConnected,
		deviceHealthLabel: true,
	})
)

const isCallElevatorDisabled = computed(
	() =>
		isSubmitting.value ||
		!props.canControl ||
		!isDeviceNormal.value ||
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
	void handleControl("open")
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
