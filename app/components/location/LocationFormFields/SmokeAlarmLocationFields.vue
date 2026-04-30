<template>
	<div class="flex min-w-0 flex-1 items-end gap-2">
		<label class="flex flex-1 min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>點位名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：大廳煙霧偵測器 1"
				@blur="handleChange"
			/>
		</label>

		<label class="flex flex-1 min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>控制器</span>
			<FilterDropdown
				v-model="deviceIdString"
				:options="deviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
				@update:modelValue="handleDeviceChange"
			/>
		</label>

		<template v-if="localLocation.deviceId && localLocation.deviceId > 0">
			<div class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/70 2xl:gap-2.5 2xl:text-base">
				<span>類型</span>
				<span class="form-input-small flex items-center justify-center bg-white/5 text-white/80">DI</span>
			</div>

			<label class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
				<span>地址 *</span>
				<div class="relative w-full">
					<input
						v-model.number="smokeAddress"
						type="number"
						min="0"
						placeholder="地址"
						required
						class="form-input-small w-full transition-all"
						:class="
							hasDuplicateAddress
								? 'animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]'
								: ''
						"
						title="此地址已被使用"
						@blur="handleChange"
					/>
					<div
						v-if="hasDuplicateAddress"
						class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
						title="此地址已被使用"
					>
						<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</div>
			</label>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue"
import type { SmokeAlarmLocation } from "~/types/smoke-alarm"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { DrainageStatusPointDef } from "~/types/location"

interface Props {
	location: SmokeAlarmLocation
	allLocations?: SmokeAlarmLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: SmokeAlarmLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const emit = defineEmits<Emits>()

const localLocation = ref<SmokeAlarmLocation>({ ...props.location })
const deviceIdString = ref("")
const smokeAddress = ref(0)

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }]
	return [{ value: "", label: "請選擇控制器" }, ...props.devices.map((d) => ({ value: String(d.id), label: d.name }))]
})

const tupleKey = (args: { deviceId: number; address: number }) => `DI:${args.deviceId}:${args.address}`

const otherTupleKeys = computed(() => {
	const set = new Set<string>()
	if (props.currentIndex < 0) return set
	for (let i = 0; i < props.allLocations.length; i++) {
		if (i === props.currentIndex) continue
		const loc = props.allLocations[i]!
		const deviceId = typeof loc.deviceId === "number" ? loc.deviceId : 0
		const address = Number(loc.statusPoints?.smoke?.address)
		if (!deviceId || deviceId <= 0) continue
		if (!Number.isFinite(address) || address < 0) continue
		set.add(tupleKey({ deviceId, address }))
	}
	return set
})

const hasDuplicateAddress = computed(() => {
	if (!localLocation.value.deviceId || localLocation.value.deviceId <= 0) return false
	if (props.currentIndex < 0) return false
	const k = tupleKey({ deviceId: Number(localLocation.value.deviceId), address: smokeAddress.value })
	return otherTupleKeys.value.has(k)
})

watch(
	() => props.location,
	(next) => {
		localLocation.value = { ...next }
		deviceIdString.value = localLocation.value.deviceId ? String(localLocation.value.deviceId) : ""
		const sp = localLocation.value.statusPoints || {}
		const resolved =
			Number(sp.smoke?.address) ||
			Number(sp.alarm?.address) ||
			Number(sp.trigger?.address) ||
			0
		smokeAddress.value = Number.isFinite(resolved) ? resolved : 0
	},
	{ immediate: true, deep: true }
)

const handleChange = () => {
	const next: SmokeAlarmLocation = { ...localLocation.value }
	if (next.deviceId && next.deviceId > 0) {
		next.statusPoints = {
			smoke: {
				registerType: "discrete",
				address: Math.max(0, Math.floor(Number(smokeAddress.value) || 0)),
			} satisfies DrainageStatusPointDef,
		}
	} else next.statusPoints = {}

	emit("update", next)
}

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId > 0 ? deviceId : undefined
	handleChange()
}
</script>

