<template>
	<div class="mx-auto flex w-[75%] flex-col gap-2" @click.stop @keydown.stop>
		<div
			v-for="dev in devices"
			:key="dev.id"
			class="flex w-full min-w-0 items-center gap-2 rounded-lg border-2 border-white/20 px-2 py-2 2xl:gap-3 2xl:px-3"
			role="group"
			:aria-label="`${dev.label} 門控`"
		>
			<span
				class="min-w-0 flex-1 line-clamp-2 text-center text-xs font-medium text-white/90 2xl:text-sm"
				:title="dev.label"
			>
				{{ dev.label }}
			</span>

			<div class="flex shrink-0 items-center gap-1.5 2xl:gap-2">
				<button
					v-for="action in doorActions"
					:key="action.cmd"
					type="button"
					:class="[doorBtnBaseClass, action.btnClass]"
					:disabled="isDisabled"
					:aria-busy="isControlling"
					:aria-label="`${dev.label} ${action.label}`"
					@click="handleControl(dev.id, action.cmd)"
				>
					{{ action.label }}
				</button>

				<label
					class="relative inline-flex select-none items-center"
					:class="isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'"
				>
					<input
						type="checkbox"
						:checked="isAlwaysOpen(dev.id)"
						class="peer sr-only"
						:disabled="isDisabled"
						:aria-label="`${dev.label} ${isAlwaysOpen(dev.id) ? '常開' : '常關'}`"
						@change="handleAlwaysOpenToggle(dev.id, $event)"
					/>
					<div
						:class="[
							'relative h-7 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white/15 transition-colors duration-200 peer-checked:bg-[#5eb8e8] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white 2xl:h-8 2xl:w-16',
							isDisabled ? 'opacity-50' : '',
						]"
					>
						<span
							class="pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
							:class="isAlwaysOpen(dev.id) ? 'opacity-100' : 'opacity-0'"
						>
							常開
						</span>
						<span
							class="pointer-events-none absolute right-1.5 top-1/2 z-10 -translate-y-1/2 text-[10px] font-semibold text-white transition-opacity duration-200 2xl:text-[12px]"
							:class="isAlwaysOpen(dev.id) ? 'opacity-0' : 'opacity-100'"
						>
							常關
						</span>
						<span
							class="pointer-events-none absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out 2xl:h-6 2xl:w-6"
							:class="
								isAlwaysOpen(dev.id)
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
			未設定門禁設備
		</p>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import type { RemoteDoorCmd } from "~/composables/systems/accessControl/useAccessControlApi"
import { usePeopleCountingDoorDevices } from "~/composables/systems/peopleCounting/usePeopleCountingDoorDevices"
import { useAccessControlRemoteDoor } from "~/composables/systems/accessControl/useAccessControlRemoteDoor"

const doorBtnBaseClass =
	"flex h-8 min-w-[3rem] items-center justify-center rounded-lg border border-white/60 px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 2xl:h-9 2xl:min-w-[3.25rem] 2xl:px-3 2xl:text-sm"

const doorActions = [
	{
		cmd: "open" as const,
		label: "開啟",
		btnClass: "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/35",
	},
	{
		cmd: "close" as const,
		label: "關閉",
		btnClass: "bg-white/15 text-white hover:bg-white/25",
	},
]

const props = defineProps<{
	location?: PeopleCountingLocation | null
	canWrite?: boolean
}>()

const { devices } = usePeopleCountingDoorDevices(() => props.location)
const alwaysOpenByDeviceId = ref<Record<number, boolean>>({})
const { isControlling, isBusy, control, clearCooldown } = useAccessControlRemoteDoor()
const canWrite = computed(() => Boolean(props.canWrite))
const isDisabled = computed(() => !canWrite.value || isBusy.value)

watch(
	() => props.location?.locationId ?? props.location?.id,
	() => {
		alwaysOpenByDeviceId.value = {}
		clearCooldown()
	}
)

const isAlwaysOpen = (deviceId: number) => Boolean(alwaysOpenByDeviceId.value[deviceId])

const handleControl = (deviceId: number, cmd: RemoteDoorCmd) => {
	void control(deviceId, cmd, canWrite.value)
}

const handleAlwaysOpenToggle = (deviceId: number, event: Event) => {
	const next = (event.target as HTMLInputElement).checked
	if (isDisabled.value || isAlwaysOpen(deviceId) === next) return
	alwaysOpenByDeviceId.value = { ...alwaysOpenByDeviceId.value, [deviceId]: next }
	handleControl(deviceId, next ? "alwaysOpen" : "alwaysClose")
}
</script>
