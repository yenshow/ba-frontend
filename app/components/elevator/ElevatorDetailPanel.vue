<template>
	<div class="flex min-h-0 flex-1">
		<ElevatorRuntimePanel
			class="min-w-0 flex-1"
			:floor-text="displayFloorText"
			:direction="displayDirection"
			:slide-direction="floorSlideDirection"
			:is-connected="isPanelConnected"
			:status-aria-label="statusAriaLabel"
			:device-health-label="deviceHealthLabel"
			:device-status-dot-class="deviceStatusDotClass"
			:is-moving="isMoving"
			:has-floor-snapshot="hasFloorSnapshot"
			:floors="floors"
			:current-rank="displayedFloor?.rank ?? null"
		/>

		<div class="ms-4 flex min-w-0 flex-1 flex-col border-l-2 border-white/30 ps-4">
			<div
				class="flex min-h-0 flex-1 flex-col rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-4"
			>
				<p class="shrink-0 text-center text-lg font-semibold text-white/80 2xl:text-xl">門控操作</p>

				<div class="mt-3 grid shrink-0 grid-cols-4 justify-items-center">
					<button
						v-for="cmd in commands"
						:key="`${cmd.kind}-${cmd.label}`"
						type="button"
						class="flex aspect-square w-20 items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/70 text-xl font-bold text-white transition-all hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40 2xl:w-24 2xl:text-2xl"
						:disabled="isOperationDisabled(cmd.kind)"
						:aria-label="`${cmd.label} ${selectedFloorLabel}`"
						@click="handleOperation(cmd)"
					>
						{{ cmd.label }}
					</button>
				</div>

				<div class="my-8 h-px shrink-0 bg-white/20" aria-hidden="true" />

				<div
					v-if="panelFloors.length === 0"
					class="flex min-h-[160px] flex-1 items-center justify-center text-base text-white/60 2xl:text-lg"
				>
					此地點尚未設定樓層
				</div>

				<div v-else class="flex min-h-0 flex-1 flex-col justify-center">
					<div
						class="grid gap-y-3"
						:style="{
							gridTemplateColumns: `repeat(${panelColumns}, minmax(0, 1fr))`,
							gridTemplateRows: `repeat(${panel?.rows ?? 6}, auto)`,
						}"
					>
						<button
							v-for="floor in panelFloors"
							:key="floor.index"
							type="button"
							class="mx-auto flex aspect-square w-16 items-center justify-center rounded-full border-2 text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 2xl:w-20 2xl:text-xl"
							:class="floorButtonClass(floor.index)"
							:style="{
								gridColumn: floor.panelCol + 1,
								gridRow: floor.panelRow + 1,
							}"
							:aria-pressed="selectedFloorIndex === floor.index"
							:aria-label="`選擇樓層 ${floor.label}`"
							@click="selectedFloorIndex = floor.index"
						>
							{{ floor.label }}
						</button>
					</div>

					<p v-if="errorText" class="form-error-text mt-3 shrink-0" role="alert">
						{{ errorText }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { computed, ref, watch } from "vue"
import type {
	ElevatorDoorControlCommand,
	ElevatorLiveState,
	ElevatorLogicalFloor,
} from "~/types/elevator"
import ElevatorRuntimePanel from "~/components/elevator/ElevatorRuntimePanel.vue"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useElevatorRuntime } from "~/composables/systems/elevator/useElevatorRuntime"
import { useToast } from "~/composables/core/useToast"
import { resolveFormApiError } from "~/utils/apiError"
import { sortFloorsForPanel, resolveElevatorCallCommand } from "~/utils/elevatorFloorModel"
import {
	buildElevatorDeviceStatusLabel,
	buildElevatorStatusAriaLabel,
	isElevatorPanelConnected,
} from "~/utils/elevatorDisplayUtils"

interface Props {
	ladderDeviceId?: number | null
	callDeviceId?: number | null
	hasFloorDetection?: boolean
	locationId?: number | null
	canControl?: boolean
	floors?: ElevatorLogicalFloor[]
	panel?: { columns: number; rows: number }
	live?: ElevatorLiveState | null
	isLadderConnected?: boolean
	isCallConnected?: boolean
	isFloorDetectionConnected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	ladderDeviceId: null,
	callDeviceId: null,
	hasFloorDetection: false,
	locationId: null,
	canControl: false,
	floors: () => [],
	panel: () => ({ columns: 3, rows: 6 }),
	live: null,
	isLadderConnected: false,
	isCallConnected: false,
	isFloorDetectionConnected: false,
})

const emit = defineEmits<{
	"runtime-updated": [live: ElevatorLiveState]
	"logs-refresh": []
}>()

const elevatorApi = useElevatorApi()
const toast = useToast()

const {
	applyLiveState,
	displayFloorText,
	displayedFloor,
	displayDirection,
	floorSlideDirection,
	isMoving,
} = useElevatorRuntime({
	floors: () => props.floors,
})

watch(
	() => props.live,
	(live) => {
		if (live) applyLiveState(live)
	},
	{ immediate: true, deep: true }
)

const isPanelConnected = computed(() =>
	isElevatorPanelConnected({
		isLadderConnected: props.isLadderConnected,
		hasFloorDetection: props.hasFloorDetection,
		isFloorDetectionConnected: props.isFloorDetectionConnected,
		live: props.live,
	})
)

const deviceHealthLabel = computed(() => buildElevatorDeviceStatusLabel(isPanelConnected.value))

const deviceStatusDotClass = computed(() =>
	isPanelConnected.value ? "bg-emerald-400" : "bg-amber-400"
)

const statusAriaLabel = computed(() =>
	buildElevatorStatusAriaLabel({
		floorText: displayFloorText.value,
		direction: displayDirection.value,
		isConnected: isPanelConnected.value,
		deviceHealthLabel: true,
	})
)

const hasFloorSnapshot = computed(
	() =>
		(props.floors?.length ?? 0) > 0 &&
		(displayedFloor.value != null || Boolean(props.live?.currentFloor))
)

const panelColumns = computed(() => props.panel?.columns ?? 3)

const panelFloors = computed(() => {
	const floors = props.floors ?? []
	return sortFloorsForPanel(floors).map((floor) => ({
		index: floors.indexOf(floor) + 1,
		label: floor.label,
		panelCol: floor.panelCol,
		panelRow: floor.panelRow,
		ladderGateway: floor.ladderGateway,
		callGateway: floor.callGateway,
	}))
})

type PanelOperation =
	| { kind: "call"; label: "呼梯" }
	| { kind: "door"; label: string; command: ElevatorDoorControlCommand }

const commands: PanelOperation[] = [
	{ kind: "call", label: "呼梯" },
	{ kind: "door", label: "手動", command: "open" },
	{ kind: "door", label: "常開", command: "normally_open" },
	{ kind: "door", label: "常閉", command: "normally_closed" },
]

const selectedFloorIndex = ref<number | null>(null)
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const selectedFloorLabel = computed(() => {
	if (selectedFloorIndex.value == null) return ""
	return panelFloors.value.find((f) => f.index === selectedFloorIndex.value)?.label ?? ""
})

const floorButtonClass = (index: number) => {
	if (selectedFloorIndex.value === index) {
		return "border-cyan-300 bg-cyan-500/70 text-white shadow-[0_0_16px_rgba(34,211,238,0.45)] ring-2 ring-cyan-300/50"
	}
	return "border-white/25 bg-white/10 text-white/85 hover:bg-white/20"
}

watch(
	() => [props.callDeviceId, props.floors?.length, props.locationId] as const,
	() => {
		selectedFloorIndex.value = null
		errorText.value = null
	}
)

const isOperationDisabled = (kind: PanelOperation["kind"]) => {
	if (isSubmitting.value || !props.canControl || selectedFloorIndex.value == null) return true
	if (kind === "call") {
		return !props.isCallConnected || !props.callDeviceId
	}
	return !props.isLadderConnected || !props.ladderDeviceId
}

const handleOperation = async (op: PanelOperation) => {
	if (!props.canControl || panelFloors.value.length === 0) return
	if (selectedFloorIndex.value == null) {
		errorText.value = "請先選擇樓層"
		return
	}
	const floor = panelFloors.value.find((f) => f.index === selectedFloorIndex.value)
	if (!floor) return

	isSubmitting.value = true
	errorText.value = null
	try {
		if (op.kind === "call") {
			const deviceId = props.callDeviceId
			if (!deviceId || floor.callGateway == null) {
				errorText.value = "此樓層未設定呼梯 gateway"
				return
			}
			const res = await elevatorApi.callElevatorToFloor({
				callDeviceId: deviceId,
				gatewayIndex: floor.callGateway,
				command: resolveElevatorCallCommand(),
				locationId: props.locationId ?? undefined,
				targetLogicalIndex: selectedFloorIndex.value,
			})
			if (res?.live) {
				applyLiveState(res.live)
				emit("runtime-updated", res.live)
			}
			emit("logs-refresh")
		} else {
			const deviceId = props.ladderDeviceId
			if (!deviceId || floor.ladderGateway == null) {
				errorText.value = "此樓層未設定梯控 gateway"
				return
			}
			await elevatorApi.controlLadderDoor({
				ladderDeviceId: deviceId,
				gatewayIndex: floor.ladderGateway,
				command: op.command,
			})
		}
		toast.success(TOAST.ELEVATOR_COMMAND_SENT)
	} catch (error) {
		errorText.value = resolveFormApiError(error, op.kind === "call" ? "呼梯失敗" : "門控操作失敗")
	} finally {
		isSubmitting.value = false
	}
}
</script>
