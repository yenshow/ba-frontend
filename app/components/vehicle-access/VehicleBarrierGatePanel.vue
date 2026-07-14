<template>
	<div
		class="vehicle-barrier-panel flex min-h-0 min-w-0 flex-col overflow-hidden"
		:class="variant === 'panel' && !hideTitle ? 'space-y-3' : 'space-y-0'"
		@click.stop
		@keydown.stop
	>
		<h3
			v-if="variant === 'panel' && !hideTitle"
			class="vehicle-barrier-title shrink-0 monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
		>
			柵欄機
		</h3>

		<!-- 詳情面板：動畫閘桿 + 控制鈕 -->
		<template v-if="variant === 'panel'">
			<div
				v-if="devices.length === 0"
				class="flex items-center justify-center rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-white/50 2xl:text-base"
				role="status"
			>
				未設定攝影機
			</div>

			<div
				v-else
				class="show-scrollbar grid min-h-0 grid-cols-2 content-start gap-3 overflow-y-auto px-1 2xl:gap-4"
			>
				<article
					v-for="dev in devices"
					:key="dev.id"
					class="flex min-w-0 flex-col gap-2 rounded-xl border-2 border-white/20 bg-black/10 p-2 2xl:gap-2.5 2xl:p-3"
					role="group"
					:aria-label="`${dev.label} 柵欄機控制`"
				>
					<div
						class="relative mx-auto aspect-[4/3] w-full max-h-[175px] overflow-hidden rounded-lg bg-gradient-to-b from-slate-700/20 via-slate-900/30 to-black/40 2xl:max-h-[195px]"
						:aria-hidden="true"
					>
						<VehicleBarrierArmSvg
							:raised="Boolean(isArmRaised(dev.id))"
							:locked="isLocked(dev.id)"
							:busy="isControllingDevice(dev.id)"
							:arm-style="armStyle(dev.id)"
						/>
					</div>

					<h4
						class="line-clamp-2 shrink-0 text-center text-base font-semibold text-white 2xl:text-lg"
						:title="dev.label"
					>
						{{ dev.label }}
					</h4>

					<div class="flex shrink-0 flex-wrap items-center justify-center gap-1.5 2xl:gap-2">
						<button
							v-for="action in BARRIER_GATE_ACTIONS"
							:key="action.mode"
							type="button"
							:class="[BARRIER_GATE_BTN_BASE_CLASS, action.btnClass]"
							:disabled="isDisabled"
							:aria-busy="isControllingDevice(dev.id)"
							:aria-label="`${dev.label} ${action.label}道閘`"
							@click="runControl(dev.id, action.mode)"
						>
							{{ action.label }}
						</button>

						<VehicleBarrierLockToggle
							:label="dev.label"
							:locked="isLocked(dev.id)"
							:disabled="isDisabled"
							@change="handleLockToggle(dev.id, $event)"
						/>
					</div>
				</article>
			</div>
		</template>

		<!-- 總覽卡：精簡列 -->
		<div v-else class="mx-auto flex w-[65%] flex-col gap-2">
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
						v-for="action in BARRIER_GATE_ACTIONS"
						:key="action.mode"
						type="button"
						:class="[BARRIER_GATE_BTN_BASE_CLASS, action.btnClass]"
						:disabled="isDisabled"
						:aria-busy="isControllingDevice(dev.id)"
						:aria-label="`${dev.label} ${action.label}道閘`"
						@click="runControl(dev.id, action.mode)"
					>
						{{ action.label }}
					</button>

					<VehicleBarrierLockToggle
						:label="dev.label"
						:locked="isLocked(dev.id)"
						:disabled="isDisabled"
						@change="handleLockToggle(dev.id, $event)"
					/>
				</div>
			</div>

			<p
				v-if="devices.length === 0"
				class="rounded-lg border border-dashed border-white/20 p-3 text-center text-xs text-white/50"
			>
				未設定攝影機
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation } from "~/types/vehicleAccess"
import {
	BARRIER_GATE_ACTIONS,
	BARRIER_GATE_BTN_BASE_CLASS,
	useVehicleBarrierDeviceControls,
} from "~/composables/systems/vehicleAccess/useVehicleBarrierDeviceControls"
import VehicleBarrierArmSvg from "~/components/vehicle-access/VehicleBarrierArmSvg.vue"
import VehicleBarrierLockToggle from "~/components/vehicle-access/VehicleBarrierLockToggle.vue"

const props = withDefaults(
	defineProps<{
		location?: VehicleAccessLocation | null
		canWrite?: boolean
		hideTitle?: boolean
		/** panel=詳情動畫；compact=總覽精簡列 */
		variant?: "panel" | "compact"
	}>(),
	{ hideTitle: false, variant: "panel" }
)

const {
	devices,
	isDisabled,
	isLocked,
	isControllingDevice,
	isArmRaised,
	armStyle,
	runControl,
	handleLockToggle,
} = useVehicleBarrierDeviceControls({
	location: () => props.location,
	canWrite: () => props.canWrite,
	autoCloseVisual: props.variant === "panel",
})
</script>
