<template>
	<div
		class="flex min-w-[200px] flex-col gap-2 rounded-lg border-2 border-white/20 p-2"
		role="group"
		:aria-label="`${deviceName} 道閘控制`"
		@click.stop
		@keydown.stop
	>
		<span
			class="line-clamp-2 text-[10px] font-medium text-white/70 2xl:text-xs"
			:title="deviceName"
		>
			{{ deviceName }}
		</span>
		<div class="flex gap-1">
			<button
				type="button"
				class="rounded bg-emerald-500/20 px-1 py-1.5 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-50 2xl:text-xs"
				:disabled="!canWrite || isControlling"
				:aria-label="`${deviceName} 開啟道閘`"
				@click="handleControl('open')"
			>
				開啟
			</button>
			<button
				type="button"
				class="rounded bg-white/15 px-1 py-1.5 text-[10px] font-medium text-white hover:bg-white/25 disabled:opacity-50 2xl:text-xs"
				:disabled="!canWrite || isControlling"
				:aria-label="`${deviceName} 關閉道閘`"
				@click="handleControl('close')"
			>
				關閉
			</button>
			<button
				type="button"
				class="rounded bg-amber-500/20 px-1 py-1.5 text-[10px] font-medium text-amber-100 hover:bg-amber-500/35 disabled:opacity-50 2xl:text-xs"
				:disabled="!canWrite || isControlling"
				:aria-label="`${deviceName} 鎖定道閘`"
				@click="handleControl('lock')"
			>
				鎖定
			</button>
			<button
				type="button"
				class="rounded bg-cyan-500/20 px-1 py-1.5 text-[10px] font-medium text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-50 2xl:text-xs"
				:disabled="!canWrite || isControlling"
				:aria-label="`${deviceName} 解鎖道閘`"
				@click="handleControl('unlock')"
			>
				解鎖
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess";
import { useVehicleBarrierGate } from "~/composables/systems/vehicleAccess/useVehicleBarrierGate";

const props = defineProps<{
	location: VehicleAccessLocation | null;
	deviceId: number;
	deviceName: string;
	canWrite?: boolean;
}>();

const { isControlling, control } = useVehicleBarrierGate({
	location: () => props.location,
	deviceId: () => props.deviceId,
});

const handleControl = (ctrlMode: BarrierGateCtrlMode) => {
	void control(ctrlMode, Boolean(props.canWrite));
};
</script>
