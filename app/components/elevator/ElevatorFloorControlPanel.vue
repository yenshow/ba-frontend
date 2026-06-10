<template>
	<div class="show-scrollbar flex h-full flex-col space-y-8 overflow-y-auto">
		<div class="min-h-[220px] space-y-4">
			<h3
				class="people-unit-title bg-white/20 py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
			>
				呼梯控制
			</h3>

			<div
				v-if="!deviceId"
				class="flex min-h-[120px] items-center justify-center text-base text-white/60 2xl:text-lg"
			>
				此地點尚未綁定梯控設備
			</div>

			<template v-else>
				<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
					<span>樓層（gatewayIndex）</span>
					<input
						v-model.number="gatewayIndex"
						type="number"
						min="1"
						class="form-input-small"
						aria-label="樓層編號"
					/>
				</label>

				<div class="grid grid-cols-2 gap-2 2xl:gap-4">
					<button
						v-for="cmd in commands"
						:key="cmd.value"
						type="button"
						class="rounded-lg bg-cyan-500/80 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50 2xl:py-3 2xl:text-base"
						:disabled="isSubmitting || !canControl"
						:aria-label="cmd.label"
						@click="handleControl(cmd.value)"
					>
						{{ cmd.label }}
					</button>
				</div>

				<p v-if="errorText" class="form-error-text" role="alert">
					{{ errorText }}
				</p>
				<p v-if="successText" class="text-sm text-emerald-300 2xl:text-base" role="status">
					{{ successText }}
				</p>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { ElevatorControlCommand } from "~/types/elevator"
import { useElevatorApi } from "~/composables/systems/elevator/useElevatorApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"

interface Props {
	deviceId?: number | null
	canControl?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	deviceId: null,
	canControl: false,
})

const elevatorApi = useElevatorApi()
const { handleError } = useErrorHandler()

const gatewayIndex = ref(1)
const isSubmitting = ref(false)
const errorText = ref<string | null>(null)
const successText = ref<string | null>(null)

const commands: Array<{ value: ElevatorControlCommand; label: string }> = [
	{ value: "open", label: "開門" },
	{ value: "close", label: "關門" },
	{ value: "normally_open", label: "常開" },
	{ value: "normally_closed", label: "常閉" },
]

const handleControl = async (command: ElevatorControlCommand) => {
	if (!props.deviceId || !props.canControl) return
	isSubmitting.value = true
	errorText.value = null
	successText.value = null
	try {
		await elevatorApi.controlGateway(props.deviceId, {
			gatewayIndex: gatewayIndex.value,
			command,
		})
		successText.value = "指令已送出"
	} catch (error) {
		errorText.value = handleError(error, "呼梯控制失敗") || "呼梯控制失敗"
	} finally {
		isSubmitting.value = false
	}
}
</script>
