<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<div class="min-h-[220px] space-y-4">
			<div
				v-if="floors.length === 0"
				class="flex min-h-[120px] items-center justify-center text-base text-white/60 2xl:text-lg"
			>
				此地點尚未設定樓層
			</div>

			<template v-else>
				<div class="space-y-2">
					<div class="grid grid-cols-2 gap-2 2xl:gap-3">
						<button
							v-for="floor in floors"
							:key="floor.index"
							type="button"
							class="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors 2xl:py-3 2xl:text-base"
							:class="
								selectedFloorIndex === floor.index
									? 'border-cyan-300 bg-cyan-500/80 text-white'
									: 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
							"
							:aria-pressed="selectedFloorIndex === floor.index"
							:aria-label="`選擇樓層 ${floor.label}`"
							@click="selectedFloorIndex = floor.index"
						>
							{{ floor.label }}
						</button>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 2xl:gap-4">
					<button
						v-for="cmd in commands"
						:key="cmd.value"
						type="button"
						class="rounded-lg bg-cyan-500/80 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50 2xl:py-3 2xl:text-base"
						:disabled="isSubmitting || !canControl"
						:aria-label="`${cmd.label} ${selectedFloorLabel}`"
						@click="handleControl(cmd.value)"
					>
						{{ cmd.label }}
					</button>
				</div>

				<p v-if="errorText" class="form-error-text" role="alert">
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

const selectedFloorIndex = ref(1)
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)

const floors = computed(() => {
	const count = Number(props.floorCount) || 0
	const names = props.floorNames ?? []
	if (count < 1) return []
	return Array.from({ length: count }, (_, i) => {
		const index = i + 1
		return {
			index,
			label: defaultElevatorFloorLabel(index, names),
		}
	})
})

const selectedFloorLabel = computed(
	() => floors.value.find((f) => f.index === selectedFloorIndex.value)?.label ?? ""
)

watch(
	() => [props.floorCount, props.floorNames] as const,
	() => {
		const first = floors.value[0]?.index
		selectedFloorIndex.value = first ?? 1
	},
	{ immediate: true }
)

const commands: Array<{ value: ElevatorControlCommand; label: string }> = [
	{ value: "open", label: "開啟" },
	{ value: "close", label: "關閉" },
	{ value: "normally_open", label: "常開" },
	{ value: "normally_closed", label: "常閉" },
]

const handleControl = async (command: ElevatorControlCommand) => {
	if (!props.deviceId || !props.canControl || floors.value.length === 0) return
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
