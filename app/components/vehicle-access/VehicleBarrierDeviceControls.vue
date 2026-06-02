<template>
	<div class="mx-auto flex w-[65%] flex-col gap-2" @click.stop @keydown.stop>
		<div
			v-for="dev in devices"
			:key="dev.id"
			class="flex w-full min-w-0 items-center gap-2 rounded-lg border-2 border-white/20 px-2 py-2 2xl:gap-3 2xl:px-3"
			role="group"
			:aria-label="`${dev.label} 道閘控制`"
		>
			<span
				class="min-w-0 flex-1 line-clamp-2 text-xs font-medium text-white/90 2xl:text-sm"
				:title="dev.label"
			>
				{{ dev.label }}
			</span>

			<div class="flex shrink-0 items-center gap-1.5 2xl:gap-2">
				<button
					v-for="action in gateActions"
					:key="action.mode"
					type="button"
					:class="[gateBtnBaseClass, action.btnClass]"
					:disabled="isDisabled"
					:aria-busy="isControlling"
					:aria-label="`${dev.label} ${action.label}道閘`"
					@click="runControl(dev.id, action.mode)"
				>
					{{ action.label }}
				</button>

				<label
					class="relative inline-flex select-none items-center"
					:class="isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'"
				>
					<input
						type="checkbox"
						:checked="isLocked(dev.id)"
						class="peer sr-only"
						:disabled="isDisabled"
						:aria-label="`${dev.label} ${isLocked(dev.id) ? '常開' : '常關'}`"
						@change="handleLockToggle(dev.id, $event)"
					/>
					<div
						:class="[
							'relative h-7 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-8 2xl:w-16',
							isDisabled ? 'opacity-50' : '',
						]"
					>
						<span
							class="pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
							:class="isLocked(dev.id) ? 'opacity-100' : 'opacity-0'"
						>
							常開
						</span>
						<span
							class="pointer-events-none absolute right-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
							:class="isLocked(dev.id) ? 'opacity-0' : 'opacity-100'"
						>
							常關
						</span>
						<span
							class="pointer-events-none absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-6 2xl:w-6"
							:class="
								isLocked(dev.id)
									? 'left-[calc(100%-1.25rem-0.125rem)] 2xl:left-[calc(100%-1.375rem-0.125rem)]'
									: 'left-0.5'
							"
						/>
					</div>
				</label>
			</div>
		</div>

		<p
			v-if="devices.length === 0"
			class="rounded-lg border border-dashed border-white/20 p-3 text-center text-xs text-white/50"
		>
			未設定攝影機
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess"
import { useVehicleAccessIsapiBarrierDevices } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiBarrierDevices"
import { useVehicleBarrierGate } from "~/composables/systems/vehicleAccess/useVehicleBarrierGate"

const gateBtnBaseClass =
	"flex h-8 min-w-[3rem] items-center justify-center rounded-lg border border-white/60 px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 2xl:h-9 2xl:min-w-[3.25rem] 2xl:px-3 2xl:text-sm"

const gateActions = [
	{
		mode: "open" as const,
		label: "開啟",
		btnClass: "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/35",
	},
	{
		mode: "close" as const,
		label: "關閉",
		btnClass: "bg-white/15 text-white hover:bg-white/25",
	},
]

const props = defineProps<{
	location?: VehicleAccessLocation | null
	canWrite?: boolean
}>()

const { devices } = useVehicleAccessIsapiBarrierDevices(() => props.location)

/** 預設常關；僅使用者切換常開常關開關時送 lock / unlock */
const lockedByDeviceId = ref<Record<number, boolean>>({})

const barrierDeviceId = ref<number | null>(null)
const { isControlling, isBusy, control, clearCooldown } = useVehicleBarrierGate({
	location: () => props.location ?? null,
	deviceId: () => barrierDeviceId.value,
})

const isDisabled = computed(() => !props.canWrite || isBusy.value)

watch(
	() => props.location?.id ?? props.location?.locationId,
	() => {
		lockedByDeviceId.value = {}
		clearCooldown()
	}
)

const isLocked = (deviceId: number) => lockedByDeviceId.value[deviceId] ?? false

const runControl = (deviceId: number, ctrlMode: BarrierGateCtrlMode) => {
	if (isDisabled.value) return
	barrierDeviceId.value = deviceId
	void control(ctrlMode, Boolean(props.canWrite))
}

const handleLockToggle = (deviceId: number, event: Event) => {
	const nextLocked = (event.target as HTMLInputElement).checked
	if (isDisabled.value || isLocked(deviceId) === nextLocked) return
	lockedByDeviceId.value = { ...lockedByDeviceId.value, [deviceId]: nextLocked }
	runControl(deviceId, nextLocked ? "lock" : "unlock")
}
</script>
