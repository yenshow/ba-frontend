<template>
	<div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
		<label
			class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
		>
			<span>點位名稱 *</span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：送風機 A"
				@blur="handleChange"
			/>
		</label>

		<label
			class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
		>
			<span>控制器</span>
			<FilterDropdown
				v-model="deviceIdString"
				:options="deviceOptions"
				:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
				@update:modelValue="handleDeviceChange"
			/>
		</label>

		<template v-if="localLocation.deviceId && localLocation.deviceId > 0">
			<label
				class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>類型 *</span>
				<select
					v-model="runningType"
					class="form-input-small form-select w-full"
					required
					@change="handleChange"
				>
					<option value="DO">DO</option>
					<option value="DI">DI</option>
				</select>
			</label>

			<label
				class="flex min-w-[5rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base sm:max-w-[8rem]"
			>
				<span>地址 *</span>
				<div class="relative w-full">
					<input
						v-model.number="runningAddress"
						type="number"
						min="0"
						placeholder="地址"
						required
						class="form-input-small w-full transition-all"
						:class="addressIssueFieldClass(pointAddressIssue)"
						:title="pointAddressIssue?.msg ?? undefined"
						@blur="handleChange"
					/>
					<div
						v-if="pointAddressIssue"
						class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
						:title="pointAddressIssue.msg"
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
import type { AirCirculationLocation } from "~/types/air-circulation"
import type { Device } from "~/types/device"
import type { ModbusStatusPointDef } from "~/types/location"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import type { DiDo } from "~/utils/modbusPoints"
import { mapDiDoToRegisterType, registerTypeToDiDo } from "~/utils/modbusPoints"

interface AddressIssue {
	msg: string
}

interface Props {
	location: AirCirculationLocation
	groupViewCategory?: string
	allLocations?: AirCirculationLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: AirCirculationLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	groupViewCategory: "",
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const emit = defineEmits<Emits>()
const { validateModbusAddress } = useModbusValidation()

const addressIssueFieldClass = (issue: AddressIssue | null): string =>
	issue
		? "animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]"
		: ""

const tupleFromLocation = (
	loc: AirCirculationLocation
): { deviceId: number; type: DiDo; address: number } | null => {
	const deviceId = typeof loc.deviceId === "number" ? loc.deviceId : 0
	if (!deviceId || deviceId <= 0) return null
	const def = loc.statusPoints?.running as ModbusStatusPointDef | undefined
	if (
		def &&
		typeof def === "object" &&
		Number.isFinite(Number(def.address)) &&
		Number(def.address) >= 0
	) {
		return {
			deviceId,
			type: registerTypeToDiDo(def),
			address: Math.max(0, Math.floor(Number(def.address))),
		}
	}
	return null
}

const tupleKey = (args: { deviceId: number; type: DiDo; address: number }) =>
	`${args.deviceId}:${args.type}:${args.address}`

const localLocation = ref<AirCirculationLocation>({ ...props.location })
const deviceIdString = ref("")
const runningAddress = ref(0)
const runningType = ref<DiDo>("DI")

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }]
	return [
		{ value: "", label: "請選擇控制器" },
		...props.devices.map((d) => ({ value: String(d.id), label: d.name })),
	]
})

const otherTupleKeys = computed(() => {
	const set = new Set<string>()
	if (props.currentIndex < 0) return set
	for (let i = 0; i < props.allLocations.length; i++) {
		if (i === props.currentIndex) continue
		const t = tupleFromLocation(props.allLocations[i]!)
		if (t) set.add(tupleKey(t))
	}
	return set
})

const hasDuplicateAddress = computed(() => {
	if (!localLocation.value.deviceId || localLocation.value.deviceId <= 0) return false
	if (props.currentIndex < 0) return false
	const k = tupleKey({
		deviceId: Number(localLocation.value.deviceId),
		type: runningType.value,
		address: runningAddress.value,
	})
	return otherTupleKeys.value.has(k)
})

const pointAddressIssue = computed((): AddressIssue | null => {
	if (!localLocation.value.deviceId || localLocation.value.deviceId <= 0) return null
	const id = localLocation.value.deviceId
	const invalid = validateModbusAddress(runningAddress.value, id)
	if (invalid) return { msg: invalid }
	if (hasDuplicateAddress.value) return { msg: "此地址已被使用" }
	return null
})

watch(
	() => [props.location, props.groupViewCategory] as const,
	([next]) => {
		localLocation.value = { ...next, viewCategory: props.groupViewCategory }
		deviceIdString.value =
			localLocation.value.deviceId && localLocation.value.deviceId > 0
				? String(localLocation.value.deviceId)
				: ""

		const runningDef = localLocation.value.statusPoints?.running as ModbusStatusPointDef | undefined
		if (
			runningDef &&
			typeof runningDef === "object" &&
			Number.isFinite(Number(runningDef.address)) &&
			Number(runningDef.address) >= 0
		) {
			runningAddress.value = Math.max(0, Math.floor(Number(runningDef.address)))
			runningType.value = registerTypeToDiDo(runningDef)
			return
		}

		runningAddress.value = 0
		runningType.value = "DI"
	},
	{ immediate: true, deep: true }
)

const handleChange = () => {
	const next: AirCirculationLocation = {
		...localLocation.value,
		viewCategory: props.groupViewCategory,
		modbus: undefined,
	}
	if (next.deviceId && next.deviceId > 0) {
		next.statusPoints = {
			running: {
				registerType: mapDiDoToRegisterType(runningType.value),
				address: Math.max(0, Math.floor(Number(runningAddress.value) || 0)),
			} satisfies ModbusStatusPointDef,
		}
	} else {
		next.statusPoints = {}
	}
	emit("update", next)
}

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId > 0 ? deviceId : undefined
	handleChange()
}
</script>
