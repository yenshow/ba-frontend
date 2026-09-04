<template>
	<div class="flex w-full min-w-0 flex-col gap-3">
		<!-- 上排：點位名稱、控制器、類型、地址（單一設備） -->
		<div class="flex min-w-0 flex-wrap items-end gap-2">
			<label
				class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>點位名稱<span class="required-mark">*</span></span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：空調點位"
					@input="emitBuilt"
				/>
			</label>

			<label
				class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>控制器</span>
				<FilterDropdown
					v-model="deviceIdString"
					:options="controllerOptions"
					:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
					@update:model-value="handleDeviceChange"
				/>
			</label>

			<template v-if="hasController && localLocation.modbus?.points?.[0]">
				<label
					class="flex w-24 min-w-0 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>類型<span class="required-mark">*</span></span>
					<FilterDropdown
						v-model="localLocation.modbus.points[0].type"
						:options="diDoTypeOptions"
						text-size="text-sm 2xl:text-base"
						@update:model-value="emitBuilt"
					/>
				</label>

				<label
					class="flex min-w-[5rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base sm:max-w-[8rem]"
				>
					<span>地址<span class="required-mark">*</span></span>
					<div class="relative w-full">
						<input
							v-model.number="localLocation.modbus.points[0].address"
							type="number"
							min="0"
							placeholder="地址"
							required
							class="form-input-small w-full transition-all"
							:class="{ 'form-input-modbus-issue': !!powerAddressIssue }"
							:title="powerAddressIssue?.msg ?? undefined"
							@blur="emitBuilt"
						/>
						<div
							v-if="powerAddressIssue"
							class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
							:title="powerAddressIssue.msg"
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

		<!-- 下方：2×2 類比卡片（偵測／設定／風速；第 4 格留空） -->
		<template v-if="hasController">
			<div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
				<div class="flex min-w-0 flex-col gap-2 rounded border border-white/10 bg-white/5 p-2">
					<span class="text-xs tracking-wider text-white/60 2xl:text-sm">偵測溫度</span>
					<div
						class="flex w-full min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>暫存器</span>
						<FilterDropdown
							v-model="tempRegisterType"
							:options="registerTypeOptions"
							text-size="text-sm 2xl:text-base"
							@update:model-value="emitBuilt"
						/>
					</div>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>地址</span>
						<input
							v-model.number="tempAddress"
							type="number"
							min="0"
							placeholder="選填"
							class="form-input-small w-full"
							@blur="handleAddressBlur('temp')"
						/>
					</label>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>轉換公式</span>
						<input
							v-model="tempTransform"
							type="text"
							class="form-input-small w-full"
							placeholder="例如: - 1, / 10, * 2, + 5"
							@blur="handleTransformBlur('temp')"
						/>
					</label>
				</div>

				<div class="flex min-w-0 flex-col gap-2 rounded border border-white/10 bg-white/5 p-2">
					<span class="text-xs tracking-wider text-white/60 2xl:text-sm">設定溫度（AO）</span>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>地址</span>
						<input
							v-model.number="setpointAddress"
							type="number"
							min="0"
							placeholder="選填"
							class="form-input-small w-full"
							@blur="handleAddressBlur('setpoint')"
						/>
					</label>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>轉換公式</span>
						<input
							v-model="setpointTransform"
							type="text"
							class="form-input-small w-full"
							placeholder="例如: - 1, / 10, * 2, + 5"
							@blur="handleTransformBlur('setpoint')"
						/>
					</label>
				</div>

				<div class="flex min-w-0 flex-col gap-2 rounded border border-white/10 bg-white/5 p-2">
					<span class="text-xs tracking-wider text-white/60 2xl:text-sm">風速（AO）</span>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>地址</span>
						<input
							v-model.number="fanAddress"
							type="number"
							min="0"
							placeholder="選填"
							class="form-input-small w-full"
							@blur="handleAddressBlur('fan')"
						/>
					</label>
					<label
						class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>檔位 levels</span>
						<input
							v-model="fanLevelsStr"
							type="text"
							placeholder="1,2,3,4 或 0,33,66,100"
							class="form-input-small w-full"
							@blur="handleFanLevelsBlur"
						/>
					</label>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { HvacLocation } from "~/types/hvac"
import type { LightingLocation } from "~/types/lighting"
import type { Device } from "~/types/device"
import type { ModbusStatusPointDef } from "~/types/location"
import { useLightingLocationValidation } from "~/composables/location/validation/useLightingLocationValidation"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { hydrateTransformDisplay } from "~/utils/modbusTransform"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

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

const asLighting = (loc: HvacLocation): LightingLocation => loc as unknown as LightingLocation

const diDoTypeOptions = [
	{ value: "DO", label: "DO" },
	{ value: "DI", label: "DI" },
]
const registerTypeOptions = [
	{ value: "holding", label: "holding" },
	{ value: "input", label: "input" },
]

const localLocation = ref<HvacLocation>({ ...props.location })
const deviceIdString = ref("")

/** 空調偵測溫度預設 input（AI）；holding 僅在設備規格需要時再改 */
const tempRegisterType = ref("input")
const tempAddress = ref<number | null>(null)
const tempTransform = ref("")
const setpointAddress = ref<number | null>(null)
const setpointTransform = ref("")
const fanAddress = ref<number | null>(null)
const fanLevelsStr = ref("1,2,3,4")

/** 避免 emit → 父層回寫 → deep watch 把草稿欄位沖掉 */
let skipHydrateFromProps = false

const hasController = computed(
	() => !!(localLocation.value.deviceId && localLocation.value.deviceId > 0)
)

const ensureModbusConfig = (location: HvacLocation) => {
	if (!(location.deviceId && location.deviceId > 0)) return
	if (!location.modbus) location.modbus = { points: [] }
	if (!location.modbus.points?.length) {
		location.modbus.points = [{ address: 0, type: "DO" }]
	}
}

const isValidAddress = (v: number | null | undefined): v is number =>
	v != null && Number.isFinite(v) && v >= 0

const normalizeNonNeg = (refVal: Ref<number | null>) => {
	if (refVal.value != null && (!Number.isFinite(refVal.value) || refVal.value < 0)) {
		refVal.value = null
	}
}

const parseLevels = (raw: string): number[] | undefined => {
	const nums = raw
		.split(/[,，\s]+/)
		.map((s) => s.trim())
		.filter(Boolean)
		.map(Number)
	if (nums.length === 0 || !nums.every((n) => Number.isFinite(n))) return undefined
	return nums
}

const hydrateStatusPoints = (location: HvacLocation) => {
	const sp = location.statusPoints || {}
	const temp = sp.temperatureC
	tempRegisterType.value =
		temp?.registerType === "holding" || temp?.registerType === "input" ? temp.registerType : "input"
	tempAddress.value = isValidAddress(temp?.address) ? Number(temp.address) : null
	tempTransform.value = hydrateTransformDisplay(temp)

	const setp = sp.setpointC
	setpointAddress.value = isValidAddress(setp?.address) ? Number(setp.address) : null
	setpointTransform.value = hydrateTransformDisplay(setp)

	const fan = sp.fanSpeed
	fanAddress.value = isValidAddress(fan?.address) ? Number(fan.address) : null
	fanLevelsStr.value =
		Array.isArray(fan?.levels) && fan.levels.length > 0 ? fan.levels.join(",") : "1,2,3,4"
}

const buildStatusPoints = (): Record<string, ModbusStatusPointDef> | undefined => {
	const next: Record<string, ModbusStatusPointDef> = {}

	if (isValidAddress(tempAddress.value)) {
		const def: ModbusStatusPointDef = {
			registerType: tempRegisterType.value === "holding" ? "holding" : "input",
			address: tempAddress.value,
		}
		const t = tempTransform.value.trim()
		if (t) def.transform = t
		next.temperatureC = def
	}

	if (isValidAddress(setpointAddress.value)) {
		const def: ModbusStatusPointDef = {
			registerType: "holding",
			address: setpointAddress.value,
		}
		const t = setpointTransform.value.trim()
		if (t) def.transform = t
		next.setpointC = def
	}

	if (isValidAddress(fanAddress.value)) {
		const def: ModbusStatusPointDef = {
			registerType: "holding",
			address: fanAddress.value,
		}
		const levels = parseLevels(fanLevelsStr.value)
		if (levels?.length) def.levels = levels
		next.fanSpeed = def
	}

	return Object.keys(next).length > 0 ? next : undefined
}

const emitBuilt = () => {
	skipHydrateFromProps = true
	emit("update", {
		...localLocation.value,
		statusPoints: buildStatusPoints(),
	})
	nextTick(() => {
		skipHydrateFromProps = false
	})
}

watch(
	() => props.location,
	(newLocation) => {
		localLocation.value = {
			...newLocation,
			statusPoints: newLocation.statusPoints ? { ...newLocation.statusPoints } : undefined,
		}
		ensureModbusConfig(localLocation.value)
		deviceIdString.value =
			localLocation.value.deviceId && localLocation.value.deviceId > 0
				? String(localLocation.value.deviceId)
				: ""

		if (skipHydrateFromProps) return
		hydrateStatusPoints(localLocation.value)
	},
	{ immediate: true, deep: true }
)

const powerAddressIssue = computed((): { msg: string } | null => {
	const loc = localLocation.value
	if (!loc.deviceId || loc.deviceId <= 0 || !loc.modbus?.points?.[0]) return null
	const invalid = validateModbusAddress(loc.modbus.points[0].address, loc.deviceId)
	if (invalid) return { msg: invalid }
	if (props.currentIndex < 0 || !props.allLocations?.length) return null
	if (
		checkDuplicateAddress(asLighting(loc), props.allLocations.map(asLighting), props.currentIndex)
	) {
		return { msg: "此地址已被使用" }
	}
	return null
})

const controllerOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }]
	return [
		{ value: "", label: "請選擇控制器" },
		...props.devices.map((d) => ({ value: String(d.id), label: d.name })),
	]
})

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId > 0 ? deviceId : undefined
	ensureModbusConfig(localLocation.value)
	emitBuilt()
}

const handleAddressBlur = (key: "temp" | "setpoint" | "fan") => {
	const refVal = key === "temp" ? tempAddress : key === "setpoint" ? setpointAddress : fanAddress
	normalizeNonNeg(refVal)
	emitBuilt()
}

const handleTransformBlur = (key: "temp" | "setpoint") => {
	const refVal = key === "temp" ? tempTransform : setpointTransform
	refVal.value = refVal.value.trim()
	emitBuilt()
}

const handleFanLevelsBlur = () => {
	const levels = parseLevels(fanLevelsStr.value)
	fanLevelsStr.value = levels?.length ? levels.join(",") : "1,2,3,4"
	emitBuilt()
}
</script>
