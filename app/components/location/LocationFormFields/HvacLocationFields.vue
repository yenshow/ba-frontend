<template>
	<div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
		<label class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>點位名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：空調點位"
				@blur="handleChange"
			/>
		</label>

		<label class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
			<span>控制器</span>
			<FilterDropdown
				v-model="deviceIdString"
				:options="deviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
				@update:modelValue="handleDeviceChange"
			/>
		</label>

		<template v-if="localLocation.deviceId && localLocation.deviceId > 0 && localLocation.modbus?.points?.[0]">
			<label class="flex w-24 min-w-0 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
				<span>類型 *</span>
				<FilterDropdown
					v-model="localLocation.modbus.points[0].type"
					:options="[
						{ value: 'DO', label: 'DO' },
						{ value: 'DI', label: 'DI' },
					]"
					text-size="text-sm 2xl:text-base"
					@update:model-value="handleChange"
				/>
			</label>

			<label class="flex min-w-[5rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base sm:max-w-[8rem]">
				<span>地址 *</span>
				<div class="relative w-full">
					<input
						v-model.number="localLocation.modbus.points[0].address"
						type="number"
						min="0"
						placeholder="地址"
						required
						class="form-input-small w-full transition-all"
						:class="addressIssueFieldClass(modbusAddressIssue)"
						:title="modbusAddressIssue?.msg ?? undefined"
						@blur="handleChange"
					/>
					<div
						v-if="modbusAddressIssue"
						class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
						:title="modbusAddressIssue.msg"
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
import type { HvacLocation } from "~/types/hvac"
import type { LightingLocation } from "~/types/lighting"
import type { Device } from "~/types/device"
import { useLightingLocationValidation } from "~/composables/location/validation/useLightingLocationValidation"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

interface AddressIssue {
	msg: string
}

interface Props {
	location: HvacLocation
	allLocations?: HvacLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: HvacLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const emit = defineEmits<Emits>()

const { checkDuplicateAddress } = useLightingLocationValidation()
const { validateModbusAddress } = useModbusValidation()

const addressIssueFieldClass = (issue: AddressIssue | null): string =>
	issue
		? "animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]"
		: ""

const asLighting = (loc: HvacLocation): LightingLocation => loc as unknown as LightingLocation

const localLocation = ref<HvacLocation>({ ...props.location })
const deviceIdString = ref("")

const ensureModbusConfig = (location: HvacLocation) => {
	if (location.deviceId && location.deviceId > 0) {
		if (!location.modbus) {
			location.modbus = {
				deviceId: location.deviceId,
				points: [],
			}
		} else {
			location.modbus.deviceId = location.deviceId
		}
		if (!location.modbus.points || location.modbus.points.length === 0) {
			location.modbus.points = [{ address: 0, type: "DO" }]
		}
	}
}

watch(
	() => props.location,
	(newLocation) => {
		localLocation.value = { ...newLocation }
		ensureModbusConfig(localLocation.value)
		deviceIdString.value = localLocation.value.deviceId && localLocation.value.deviceId > 0 ? String(localLocation.value.deviceId) : ""
	},
	{ immediate: true, deep: true }
)

const modbusAddressIssue = computed((): AddressIssue | null => {
	const loc = localLocation.value
	if (!loc.deviceId || loc.deviceId <= 0 || !loc.modbus?.points?.[0]) return null
	const id = loc.deviceId
	const addr = loc.modbus.points[0].address
	const invalid = validateModbusAddress(addr, id)
	if (invalid) return { msg: invalid }
	if (props.currentIndex < 0 || !props.allLocations?.length) return null
	if (checkDuplicateAddress(asLighting(loc), props.allLocations.map(asLighting), props.currentIndex)) {
		return { msg: "此地址已被使用" }
	}
	return null
})

const handleChange = () => {
	emit("update", { ...localLocation.value })
}

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }]
	return [{ value: "", label: "請選擇控制器" }, ...props.devices.map((d) => ({ value: String(d.id), label: d.name }))]
})

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId > 0 ? deviceId : undefined
	ensureModbusConfig(localLocation.value)
	handleChange()
}
</script>
