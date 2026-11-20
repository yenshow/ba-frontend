<template>
	<div class="flex w-full min-w-0 flex-col gap-3">
		<label :class="fieldLabelClass">
			<span>點位名稱<span class="required-mark">*</span></span>
			<input
				v-model="localLocation.name"
				type="text"
				required
				class="form-input-small"
				placeholder="例如：一樓周界感測 1"
				@input="handleChange"
			/>
		</label>

		<label :class="fieldLabelClass">
			<span>佈防模式<span class="required-mark">*</span></span>
			<FilterDropdown
				v-model="armingMode"
				:options="ARMING_MODE_OPTIONS"
				placeholder="請選擇佈防模式"
				@update:modelValue="handleArmingModeChange"
			/>
		</label>

		<div
			v-if="armingMode === 'delay'"
			class="grid grid-cols-1 gap-3 sm:grid-cols-2"
		>
			<label :class="fieldLabelClass">
				<span>進入延遲（秒）</span>
				<input
					v-model.number="entryDelaySec"
					type="number"
					min="0"
					max="300"
					class="form-input-small"
					aria-label="進入延遲秒數"
					@blur="handleChange"
				/>
			</label>
			<label :class="fieldLabelClass">
				<span>離開延遲（秒）</span>
				<input
					v-model.number="exitDelaySec"
					type="number"
					min="0"
					max="600"
					class="form-input-small"
					aria-label="離開延遲秒數"
					@blur="handleChange"
				/>
			</label>
		</div>

		<span class="text-sm font-medium text-white/80 2xl:text-base"
			>資料來源<span class="required-mark">*</span></span
		>
		<div class="flex flex-wrap gap-4">
			<label
				v-for="opt in DATA_SOURCE_OPTIONS"
				:key="opt.value"
				class="flex cursor-pointer items-center gap-2"
			>
				<input
					v-model="dataSource"
					type="radio"
					:value="opt.value"
					class="h-4 w-4 accent-cyan-400"
					@change="handleDataSourceChange"
				/>
				<span class="text-sm text-white/90 2xl:text-base">{{ opt.label }}</span>
			</label>
		</div>
		<!-- DI：控制器／類型／地址同一列 -->
		<div v-if="usesDi" class="mt-1 space-y-3 border-t border-white/10 pt-3">
			<div
				v-if="!isLoadingDevices && !hasControllerDevices"
				:class="emptyHintClass"
			>
				請先在「設備管理」新增控制器（Modbus），再回此選擇
			</div>
			<div class="flex w-full min-w-0 flex-wrap items-end gap-3">
				<label :class="[fieldLabelClass, 'min-w-[12rem] flex-1']">
					<span>控制器<span class="required-mark">*</span></span>
					<FilterDropdown
						v-model="deviceIdString"
						:options="deviceOptions"
						:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
						@update:modelValue="handleDeviceChange"
					/>
				</label>

				<label :class="[fieldLabelClass, 'w-[7rem] shrink-0']">
					<span>類型<span class="required-mark">*</span></span>
					<FilterDropdown
						v-model="runningType"
						:options="[
							{ value: 'DI', label: 'DI' },
							{ value: 'DO', label: 'DO' },
						]"
						text-size="text-sm 2xl:text-base"
						@update:model-value="handleChange"
					/>
				</label>

				<label :class="[fieldLabelClass, 'w-[9rem] shrink-0']">
					<span>地址<span class="required-mark">*</span></span>
					<div class="relative w-full">
						<input
							v-model.number="runningAddress"
							type="number"
							min="0"
							placeholder="地址"
							required
							class="form-input-small w-full transition-all"
							:class="{ 'form-input-modbus-issue': hasDuplicateAddress }"
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
			</div>
		</div>

		<!-- 門禁機／讀卡機 -->
		<div v-if="usesAccess" class="mt-1 space-y-2 border-t border-white/10 pt-3">
			<div :class="fieldLabelClass">
				<span>門禁機／讀卡機（可複選）<span class="required-mark">*</span></span>
				<div v-if="accessControlDeviceList.length === 0" :class="emptyHintClass">
					請先在設備管理新增門禁機或讀卡機
				</div>
				<div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					<label
						v-for="d in accessControlDeviceList"
						:key="d.id"
						:class="[
							selectCardBaseClass,
							isAccessSelected(d.id) && selectCardSelectedClass,
						]"
					>
						<input
							type="checkbox"
							:checked="isAccessSelected(d.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleAccessDevice(d.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{
							formatDeviceSelectLabel(d)
						}}</span>
					</label>
				</div>
				<p
					v-if="accessControlDeviceList.length > 0 && !hasAccessSelected"
					:class="warnHintClass"
				>
					至少需要選擇一台門禁機或讀卡機
				</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { formatDeviceSelectLabel } from "~/utils/deviceSelectLabel"
import { ref, watch, computed } from "vue"
import type {
	SecurityArmingMode,
	SecurityDataSource,
	SecurityLocation,
} from "~/types/security"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { ModbusStatusPointDef } from "~/types/location"
import type { DiDo } from "~/utils/modbusPoints"
import { mapDiDoToRegisterType, registerTypeToDiDo } from "~/utils/modbusPoints"
import {
	SECURITY_DATA_SOURCE_LABELS,
	resolveSecurityDataSource,
	securityDataSourceUsesAccess,
	securityDataSourceUsesDi,
} from "~/utils/securityDataSource"

interface Props {
	location: SecurityLocation
	allLocations?: SecurityLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
	accessControlDevices?: Device[]
}

interface Emits {
	(e: "update", location: SecurityLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
	accessControlDevices: () => [],
})

const emit = defineEmits<Emits>()

const fieldLabelClass =
	"flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
const emptyHintClass =
	"rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
const selectCardBaseClass =
	"relative flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
const selectCardSelectedClass = "border-cyan-400/50 bg-cyan-500/20"
const warnHintClass = "mt-2 text-xs text-amber-300 2xl:text-sm"

const DATA_SOURCE_OPTIONS: Array<{ value: SecurityDataSource; label: string }> = [
	{ value: "di", label: SECURITY_DATA_SOURCE_LABELS.di },
	{ value: "access_control", label: SECURITY_DATA_SOURCE_LABELS.access_control },
	{ value: "both", label: SECURITY_DATA_SOURCE_LABELS.both },
]

const ARMING_MODE_OPTIONS = [
	{ value: "immediate", label: "立即佈防" },
	{ value: "delay", label: "延遲佈防" },
	{ value: "twenty_four_hour", label: "24 小時佈防" },
]

const resolveArmingMode = (loc: SecurityLocation): SecurityArmingMode => {
	const m = String(loc.armingMode || "immediate")
	if (m === "delay" || m === "twenty_four_hour") return m
	return "immediate"
}

const localLocation = ref<SecurityLocation>({ ...props.location })
const dataSource = ref<SecurityDataSource>(resolveSecurityDataSource(props.location))
const armingMode = ref<SecurityArmingMode>(resolveArmingMode(props.location))
const entryDelaySec = ref(Number(props.location.entryDelaySec ?? 30))
const exitDelaySec = ref(Number(props.location.exitDelaySec ?? 60))
const deviceIdString = ref("")
const runningAddress = ref(0)
const runningType = ref<DiDo>("DI")

const usesDi = computed(() => securityDataSourceUsesDi(dataSource.value))
const usesAccess = computed(() => securityDataSourceUsesAccess(dataSource.value))

const controllerDevices = computed(() =>
	props.devices.filter((d) => d.type_code === "controller" || !d.type_code),
)
const hasControllerDevices = computed(() => controllerDevices.value.length > 0)

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (!hasControllerDevices.value) return [{ value: "", label: "尚無可用控制器" }]
	return [
		{ value: "", label: "請選擇控制器" },
		...controllerDevices.value.map((d) => ({
			value: String(d.id),
			label: formatDeviceSelectLabel(d),
		})),
	]
})

const accessControlDeviceList = computed(() => {
	if (props.accessControlDevices.length > 0) return props.accessControlDevices
	return props.devices.filter((d) => d.type_code === "access_control")
})

const hasAccessSelected = computed(
	() => (localLocation.value.accessDeviceIds || []).some((id) => Number(id) > 0)
)

const isAccessSelected = (deviceId: number) =>
	(localLocation.value.accessDeviceIds || []).map(Number).includes(Number(deviceId))

const tupleKey = (args: { deviceId: number; type: DiDo; address: number }) =>
	`${args.deviceId}:${args.type}:${args.address}`

const otherTupleKeys = computed(() => {
	const set = new Set<string>()
	if (props.currentIndex < 0) return set
	for (let i = 0; i < props.allLocations.length; i++) {
		if (i === props.currentIndex) continue
		const loc = props.allLocations[i]!
		const deviceId = typeof loc.deviceId === "number" ? loc.deviceId : 0
		const sp = loc.statusPoints || {}
		const def = (sp.running || sp.smoke || sp.alarm || sp.trigger) as
			| ModbusStatusPointDef
			| undefined
		const address = Number(def?.address ?? sp.running?.address)
		const t = registerTypeToDiDo(def)
		if (!deviceId || deviceId <= 0) continue
		if (!Number.isFinite(address) || address < 0) continue
		set.add(tupleKey({ deviceId, type: t, address }))
	}
	return set
})

const hasDuplicateAddress = computed(() => {
	if (!usesDi.value) return false
	if (!localLocation.value.deviceId || localLocation.value.deviceId <= 0) return false
	if (props.currentIndex < 0) return false
	const k = tupleKey({
		deviceId: Number(localLocation.value.deviceId),
		type: runningType.value,
		address: runningAddress.value,
	})
	return otherTupleKeys.value.has(k)
})

const syncDiFieldsFromLocation = (loc: SecurityLocation) => {
	deviceIdString.value = loc.deviceId ? String(loc.deviceId) : ""
	const sp = loc.statusPoints || {}
	const runningDef = (sp.running || sp.smoke || sp.alarm || sp.trigger) as
		| ModbusStatusPointDef
		| undefined
	const resolved =
		Number(runningDef?.address) ||
		Number(sp.running?.address) ||
		Number(sp.smoke?.address) ||
		Number(sp.alarm?.address) ||
		Number(sp.trigger?.address) ||
		0
	runningAddress.value = Number.isFinite(resolved) ? resolved : 0
	runningType.value = registerTypeToDiDo(runningDef) || "DI"
}

watch(
	() => props.location,
	(next) => {
		localLocation.value = { ...next, accessDeviceIds: [...(next.accessDeviceIds || [])] }
		dataSource.value = resolveSecurityDataSource(next)
		armingMode.value = resolveArmingMode(next)
		entryDelaySec.value = Number(next.entryDelaySec ?? 30)
		exitDelaySec.value = Number(next.exitDelaySec ?? 60)
		syncDiFieldsFromLocation(localLocation.value)
	},
	{ immediate: true, deep: true }
)

const handleArmingModeChange = (value: string) => {
	armingMode.value = resolveArmingMode({
		armingMode: value as SecurityArmingMode,
	} as SecurityLocation)
	handleChange()
}

const handleChange = () => {
	const next: SecurityLocation = {
		...localLocation.value,
		dataSource: dataSource.value,
		armingMode: armingMode.value,
		entryDelaySec: Math.min(300, Math.max(0, Math.floor(Number(entryDelaySec.value) || 0))),
		exitDelaySec: Math.min(600, Math.max(0, Math.floor(Number(exitDelaySec.value) || 0))),
	}

	if (usesDi.value && next.deviceId && next.deviceId > 0) {
		next.statusPoints = {
			running: {
				registerType: mapDiDoToRegisterType(runningType.value),
				address: Math.max(0, Math.floor(Number(runningAddress.value) || 0)),
			} satisfies ModbusStatusPointDef,
		}
	} else if (!usesDi.value) {
		next.deviceId = undefined
		next.statusPoints = {}
		next.modbus = undefined
	} else {
		next.statusPoints = {}
	}

	if (!usesAccess.value) {
		next.accessDeviceIds = []
	} else {
		next.accessDeviceIds = [...(localLocation.value.accessDeviceIds || [])]
	}

	localLocation.value = next
	emit("update", next)
}

const handleDataSourceChange = () => {
	if (!usesDi.value) {
		localLocation.value.deviceId = undefined
		localLocation.value.statusPoints = {}
		localLocation.value.modbus = undefined
		deviceIdString.value = ""
		runningAddress.value = 0
		runningType.value = "DI"
	}
	if (!usesAccess.value) {
		localLocation.value.accessDeviceIds = []
	}
	handleChange()
}

const handleDeviceChange = (value: string) => {
	const deviceId = value ? Number(value) : 0
	localLocation.value.deviceId = deviceId > 0 ? deviceId : undefined
	handleChange()
}

const handleToggleAccessDevice = (deviceId: number) => {
	const id = Number(deviceId)
	if (!Number.isFinite(id) || id <= 0) return
	const set = new Set((localLocation.value.accessDeviceIds || []).map(Number))
	if (set.has(id)) set.delete(id)
	else set.add(id)
	localLocation.value.accessDeviceIds = [...set].filter((n) => n > 0)
	handleChange()
}
</script>
