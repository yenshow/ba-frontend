<template>
	<div
		class="access-door-panel flex min-h-0 min-w-0 flex-col overflow-hidden"
		:class="variant === 'panel' && !hideTitle ? 'space-y-3' : 'space-y-0'"
		@click.stop
		@keydown.stop
	>
		<h3
			v-if="variant === 'panel' && !hideTitle"
			class="access-door-title shrink-0 monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
		>
			門控
		</h3>

		<div
			v-if="devices.length === 0"
			:class="
				variant === 'panel'
					? 'flex items-center justify-center rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-white/50 2xl:text-base'
					: 'mx-auto w-[75%] rounded-lg border border-dashed border-white/20 p-3 text-center text-xs text-white/50'
			"
			role="status"
		>
			未設定門禁設備
		</div>

		<div
			v-else
			:class="
				variant === 'panel'
					? 'show-scrollbar grid min-h-0 grid-cols-2 content-start gap-3 overflow-y-auto px-1 2xl:gap-4'
					: 'mx-auto flex w-[75%] flex-col gap-2'
			"
		>
			<article
				v-for="dev in devices"
				:key="dev.id"
				:class="
					variant === 'panel'
						? 'flex min-w-0 flex-col gap-2 rounded-xl border-2 border-white/40 bg-black/30 p-2 2xl:gap-2.5 2xl:p-3'
						: 'flex w-full min-w-0 items-center gap-2 rounded-lg border-2 border-white/40 bg-black/20 px-2 py-2 2xl:gap-3 2xl:px-3'
				"
				role="group"
				:aria-label="`${dev.label} 門控`"
			>
				<template v-if="variant === 'panel'">
					<div
						class="relative mx-auto aspect-[4/3] w-full max-h-[175px] overflow-hidden rounded-lg bg-gradient-to-b from-slate-700/15 via-slate-800/20 to-slate-900/35 2xl:max-h-[195px]"
						:aria-hidden="true"
					>
						<AccessDoorLeafSvg :open="isDoorOpen(dev.id)" />
					</div>
					<h4
						class="line-clamp-2 shrink-0 text-center text-base font-semibold text-white 2xl:text-lg"
						:title="dev.label"
					>
						{{ dev.label }}
					</h4>
				</template>
				<span
					v-else
					class="min-w-0 flex-1 line-clamp-2 text-center text-xs font-medium text-white/90 2xl:text-sm"
					:title="dev.label"
				>
					{{ dev.label }}
				</span>

				<div
					:class="
						variant === 'panel'
							? 'flex shrink-0 flex-wrap items-center justify-center gap-1.5 2xl:gap-2'
							: 'flex shrink-0 items-center gap-1.5 2xl:gap-2'
					"
				>
					<button
						v-for="action in ACCESS_DOOR_ACTIONS"
						:key="action.cmd"
						type="button"
						:class="[ACCESS_DOOR_BTN_BASE_CLASS, action.btnClass]"
						:disabled="isDisabled"
						:aria-busy="isControllingDevice(dev.id)"
						:aria-label="`${dev.label} ${action.label}`"
						@click="runControl(dev.id, action.cmd)"
					>
						{{ action.label }}
					</button>
					<AccessDoorLockToggle
						:label="dev.label"
						:locked="isAlwaysOpen(dev.id)"
						:disabled="isDisabled"
						@change="handleAlwaysOpenToggle(dev.id, $event)"
					/>
				</div>
			</article>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import {
	ACCESS_DOOR_ACTIONS,
	ACCESS_DOOR_BTN_BASE_CLASS,
	useAccessControlDoorControls,
} from "~/composables/systems/accessControl/useAccessControlDoorControls"
import AccessDoorLeafSvg from "~/components/people-counting/AccessDoorLeafSvg.vue"
import AccessDoorLockToggle from "~/components/people-counting/AccessDoorLockToggle.vue"

const props = withDefaults(
	defineProps<{
		location?: PeopleCountingLocation | null
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
	isAlwaysOpen,
	isControllingDevice,
	isDoorOpen,
	runControl,
	handleAlwaysOpenToggle,
} = useAccessControlDoorControls({
	location: () => props.location,
	canWrite: () => props.canWrite,
	autoCloseVisual: props.variant === "panel",
})
</script>
