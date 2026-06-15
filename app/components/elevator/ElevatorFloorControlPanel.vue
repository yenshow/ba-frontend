<template>
	<div class="flex h-full min-h-0 flex-col">
		<div
			class="flex min-h-0 flex-col rounded-2xl border-2 border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.03]"
		>
			<p class="mt-4 text-center text-lg font-semibold text-white/80 2xl:text-xl">呼梯面板</p>

			<div
				v-if="floors.length === 0"
				class="flex min-h-[160px] items-center justify-center text-base text-white/60 2xl:text-lg"
			>
				此地點尚未設定樓層
			</div>

			<template v-else>
				<div class="overflow-y-auto p-4">
					<div
						class="flex flex-col"
						:class="[floorGridMinHeightClass, exceedsVisibleGrid ? 'justify-start' : 'justify-end']"
					>
						<div class="grid grid-cols-4 justify-items-center gap-3 2xl:gap-4">
							<button
								v-for="floor in floors"
								:key="floor.index"
								type="button"
								class="flex aspect-square w-[4.5rem] items-center justify-center rounded-full border-2 text-2xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 2xl:w-20 2xl:text-3xl"
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

				<div class="p-4 shrink-0 border-t border-white/15">
					<div class="grid grid-cols-4 justify-items-center gap-3 2xl:gap-4">
						<button
							v-for="cmd in commands"
							:key="cmd.value"
							type="button"
							class="flex aspect-square w-[4.5rem] items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/70 text-lg font-bold text-white transition-all hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-40 2xl:w-20 2xl:text-xl"
							:disabled="isSubmitting || !canControl || selectedFloorIndex == null"
							:aria-label="`${cmd.label} ${selectedFloorLabel}`"
							@click="handleControl(cmd.value)"
						>
							{{ cmd.label }}
						</button>
					</div>
				</div>

				<p v-if="errorText" class="form-error-text mt-3 shrink-0" role="alert">
					{{ errorText }}
				</p>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { ElevatorControlCommand } from "~/types/elevator"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useToast } from "~/composables/core/useToast"
import { resolveFormApiError } from "~/utils/errorUtils"
import { defaultElevatorFloorLabel } from "~/utils/ladderFloorFormUtils"
import {
	buildElevatorPanelFloorOrder,
	ELEVATOR_PANEL_VISIBLE_ROWS,
} from "~/utils/elevatorFloorConfig"

interface Props {
	deviceId?: number | null
	canControl?: boolean
	floorCount?: number
	floorNames?: string[]
}

const props = withDefaults(defineProps<Props>(), {
	deviceId: null,
	canControl: false,
	floorCount: 0,
	floorNames: () => [],
})

const elevatorApi = useElevatorApi()
const toast = useToast()

const selectedFloorIndex = ref<number | null>(null)
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const floors = computed(() => {
	const count = Number(props.floorCount) || 0
	const names = props.floorNames ?? []
	if (count < 1) return []
	return buildElevatorPanelFloorOrder(count).map((index) => ({
		index,
		label: defaultElevatorFloorLabel(index, names),
	}))
})

/** 最小高度：5 列 × 4 欄按鈕區（與 w-[4.5rem] / gap-3 對齊） */
const floorGridMinHeightClass =
	"min-h-[calc(5*4.5rem+4*0.75rem)] 2xl:min-h-[calc(5*5rem+4*1rem)]"

const exceedsVisibleGrid = computed(
	() => floors.value.length > ELEVATOR_PANEL_VISIBLE_ROWS * 4,
)

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
