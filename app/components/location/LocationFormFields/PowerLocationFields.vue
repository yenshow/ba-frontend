<template>
	<div class="flex w-full min-w-0 flex-col gap-3">
		<div class="flex min-w-0 flex-wrap items-end gap-2">
			<label
				class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>點位名稱 *</span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：GP-1"
					@input="handleChange"
				/>
			</label>

			<label
				class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>設備類型 *</span>
				<FilterDropdown
					:model-value="localLocation.equipmentKind === 'oil_level' ? 'oil_level' : 'generator'"
					:options="equipmentKindOptions"
					placeholder="請選擇設備類型"
					@update:model-value="handleEquipmentKindChange"
				/>
			</label>
		</div>

		<!-- 油位：statusPoints.running -->
		<template v-if="localLocation.equipmentKind === 'oil_level'">
			<div class="flex min-w-0 flex-wrap items-end gap-2">
				<label
					class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>控制器</span>
					<FilterDropdown
						v-model="oilLevelRow.deviceIdStr"
						:options="deviceOptions"
						:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
						@update:modelValue="handleChange"
					/>
				</label>
				<template v-if="oilLevelRow.deviceIdStr">
					<label
						class="flex w-24 min-w-0 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>類型 *</span>
						<FilterDropdown
							v-model="oilLevelRow.type"
							:options="[
								{ value: 'DO', label: 'DO' },
								{ value: 'DI', label: 'DI' },
							]"
							text-size="text-sm 2xl:text-base"
							@update:model-value="handleChange"
						/>
					</label>
					<label
						class="flex min-w-[5rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base sm:max-w-[8rem]"
					>
						<span>地址 *</span>
						<div class="relative w-full">
							<input
								v-model.number="oilLevelRow.address"
								type="number"
								min="0"
								placeholder="地址"
								required
								class="form-input-small w-full transition-all"
								:class="{ 'form-input-modbus-issue': !!oilLevelAddressIssue }"
								:title="oilLevelAddressIssue?.msg ?? undefined"
								@blur="handleChange"
							/>
							<div
								v-if="oilLevelAddressIssue"
								class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								:title="oilLevelAddressIssue.msg"
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

		<!-- 發電機：故障／高油位／低油位 -->
		<template v-else>
			<div class="space-y-3 rounded border border-white/10 bg-white/5 p-3">
				<div
					v-for="role in generatorRoles"
					:key="role.key"
					class="flex min-w-0 flex-col gap-2 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
				>
					<div class="flex min-w-0 flex-wrap items-end gap-2">
						<label
							class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
						>
							<span>{{ role.label }} 控制器</span>
							<FilterDropdown
								v-model="generatorRows[role.key].deviceIdStr"
								:options="deviceOptions"
								:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
								@update:model-value="handleChange"
							/>
						</label>
						<template v-if="generatorRows[role.key].deviceIdStr">
							<label
								class="flex w-24 min-w-0 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
							>
								<span>類型 *</span>
								<FilterDropdown
									v-model="generatorRows[role.key].type"
									:options="[
								{ value: 'DO', label: 'DO' },
								{ value: 'DI', label: 'DI' },
							]"
									text-size="text-sm 2xl:text-base"
									@update:model-value="handleChange"
								/>
							</label>
							<label
								class="flex min-w-[5rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base sm:max-w-[8rem]"
							>
								<span>地址 *</span>
								<div class="relative w-full">
									<input
										v-model.number="generatorRows[role.key].address"
										type="number"
										min="0"
										placeholder="地址"
										required
										class="form-input-small w-full transition-all"
										:class="{ 'form-input-modbus-issue': !!generatorAddressIssues[role.key] }"
										:title="generatorAddressIssues[role.key]?.msg ?? undefined"
										@blur="handleChange"
									/>
									<div
										v-if="generatorAddressIssues[role.key]"
										class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
										:title="generatorAddressIssues[role.key]!.msg"
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
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { PowerLocation } from "~/types/power"
import type { Device } from "~/types/device"
import type { ModbusStatusPointDef } from "~/types/location"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import {
	usePowerLocationValidation,
	type PowerModbusTuple,
	type PowerGeneratorPointKey,
	powerTupleKey,
	tuplesFromPowerLocation,
} from "~/composables/location/validation/usePowerLocationValidation"
import type { DiDo } from "~/utils/modbusPoints"
import { mapDiDoToRegisterType, registerTypeToDiDo } from "~/utils/modbusPoints"

interface ModbusRowState {
	deviceIdStr: string
	type: DiDo
	address: number
}

interface Props {
	location: PowerLocation
	groupViewCategory: string
	allLocations?: PowerLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: PowerLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const emit = defineEmits<Emits>()

const { validateModbusAddress } = usePowerLocationValidation()

const otherModbusKeys = computed(() => {
	const set = new Set<string>()
	if (props.currentIndex == null || props.currentIndex < 0) return set
	props.allLocations.forEach((loc, i) => {
		if (i === props.currentIndex) return
		for (const t of tuplesFromPowerLocation(loc)) {
			set.add(powerTupleKey(t))
		}
	})
	return set
})

const tupleFromOilLevelForm = (): PowerModbusTuple | null => {
	const id = Number(oilLevelRow.value.deviceIdStr)
	if (!id || id <= 0) return null
	if (!Number.isFinite(oilLevelRow.value.address) || oilLevelRow.value.address < 0) return null
	return { deviceId: id, type: oilLevelRow.value.type, address: oilLevelRow.value.address }
}

const tupleFromGeneratorForm = (role: PowerGeneratorPointKey): PowerModbusTuple | null => {
	const row = generatorRows.value[role]
	const id = Number(row.deviceIdStr)
	if (!id || id <= 0) return null
	if (!Number.isFinite(row.address) || row.address < 0) return null
	return { deviceId: id, type: row.type, address: row.address }
}

const generatorTupleKeyCounts = computed(() => {
	const m = new Map<string, number>()
	for (const { key } of generatorRoles) {
		const t = tupleFromGeneratorForm(key)
		if (!t) continue
		const k = powerTupleKey(t)
		m.set(k, (m.get(k) || 0) + 1)
	}
	return m
})

const oilLevelAddressIssue = computed((): { msg: string } | null => {
	if (localLocation.value.equipmentKind !== "oil_level") return null
	if (!oilLevelRow.value.deviceIdStr) return null
	const id = Number(oilLevelRow.value.deviceIdStr)
	const invalid = validateModbusAddress(oilLevelRow.value.address, id)
	if (invalid) return { msg: invalid }
	const t = tupleFromOilLevelForm()
	if (!t || props.currentIndex == null || props.currentIndex < 0) return null
	const k = powerTupleKey(t)
	if (otherModbusKeys.value.has(k)) return { msg: "此地址已被使用" }
	return null
})

const generatorAddressIssues = computed((): Record<PowerGeneratorPointKey, { msg: string } | null> => {
	const out: Record<PowerGeneratorPointKey, { msg: string } | null> = {
		fault: null,
		highOil: null,
		lowOil: null,
	}
	if (localLocation.value.equipmentKind === "oil_level") return out

	for (const { key } of generatorRoles) {
		const row = generatorRows.value[key]
		if (!row.deviceIdStr) continue
		const id = Number(row.deviceIdStr)
		const invalid = validateModbusAddress(row.address, id)
		if (invalid) {
			out[key] = { msg: invalid }
			continue
		}

		const t = tupleFromGeneratorForm(key)
		if (!t || props.currentIndex == null || props.currentIndex < 0) continue
		const k = powerTupleKey(t)
		if ((generatorTupleKeyCounts.value.get(k) || 0) > 1) {
			out[key] = { msg: "此地址已被使用" }
			continue
		}
		if (otherModbusKeys.value.has(k)) {
			out[key] = { msg: "此地址已被使用" }
		}
	}
	return out
})

const equipmentKindOptions = [
	{ value: "generator", label: "發電機" },
	{ value: "oil_level", label: "油位" },
]

const generatorRoles: { key: PowerGeneratorPointKey; label: string }[] = [
	{ key: "fault", label: "故障" },
	{ key: "highOil", label: "高油位" },
	{ key: "lowOil", label: "低油位" },
]

const emptyRow = (): ModbusRowState => ({
	deviceIdStr: "",
	type: "DI",
	address: 0,
})

const localLocation = ref<PowerLocation>({ ...props.location })
const oilLevelRow = ref<ModbusRowState>(emptyRow())
const generatorRows = ref<Record<PowerGeneratorPointKey, ModbusRowState>>({
	fault: emptyRow(),
	highOil: emptyRow(),
	lowOil: emptyRow(),
})

const hydrateFromLocation = (loc: PowerLocation) => {
	const kind = loc.equipmentKind === "oil_level" ? "oil_level" : "generator"
	const vc = props.groupViewCategory
	localLocation.value = {
		...loc,
		equipmentKind: kind,
		viewCategory: vc,
		statusPoints: loc.statusPoints ? { ...loc.statusPoints } : {},
	}

	if (kind === "oil_level") {
		const def = loc.statusPoints?.running as
			| (ModbusStatusPointDef & { deviceId?: number })
			| undefined
		if (def) {
			const did =
				def.deviceId != null && def.deviceId > 0
					? String(def.deviceId)
					: loc.deviceId && loc.deviceId > 0
						? String(loc.deviceId)
						: ""
			oilLevelRow.value = {
				deviceIdStr: did,
				type: registerTypeToDiDo(def),
				address: Number(def.address) || 0,
			}
		} else {
			oilLevelRow.value = emptyRow()
		}
		for (const { key } of generatorRoles) {
			generatorRows.value[key] = emptyRow()
		}
		return
	}

	oilLevelRow.value = emptyRow()
	for (const { key } of generatorRoles) {
		const def = loc.statusPoints?.[key] as
			| (ModbusStatusPointDef & { deviceId?: number })
			| undefined
		generatorRows.value[key] = def
			? {
					deviceIdStr:
						def.deviceId != null && def.deviceId > 0
							? String(def.deviceId)
							: loc.deviceId && loc.deviceId > 0
								? String(loc.deviceId)
								: "",
					type: registerTypeToDiDo(def),
					address: Number(def.address) || 0,
				}
			: emptyRow()
	}
}

const buildPowerLocation = (): PowerLocation => {
	const viewCategory = props.groupViewCategory
	const base: PowerLocation = {
		...localLocation.value,
		viewCategory,
		modbus: undefined,
		statusPoints: {},
	}

	if (base.equipmentKind === "oil_level") {
		const id = oilLevelRow.value.deviceIdStr ? Number(oilLevelRow.value.deviceIdStr) : 0
		base.deviceId = id > 0 ? id : undefined
		if (id > 0 && Number.isFinite(oilLevelRow.value.address) && oilLevelRow.value.address >= 0) {
			base.statusPoints = {
				running: {
					registerType: mapDiDoToRegisterType(oilLevelRow.value.type),
					address: oilLevelRow.value.address,
				},
			}
		}
		return base
	}

	const sp: Record<string, ModbusStatusPointDef & { deviceId?: number }> = {}
	let primaryDevice = 0
	for (const { key } of generatorRoles) {
		const row = generatorRows.value[key]
		const id = row.deviceIdStr ? Number(row.deviceIdStr) : 0
		if (!id || id <= 0) continue
		if (!Number.isFinite(row.address) || row.address < 0) continue
		sp[key] = {
			deviceId: id,
			registerType: mapDiDoToRegisterType(row.type),
			address: row.address,
		}
		if (!primaryDevice) primaryDevice = id
	}
	base.statusPoints = sp
	base.deviceId = primaryDevice > 0 ? primaryDevice : undefined
	return base
}

watch(
	() => [props.location, props.groupViewCategory] as const,
	([newLocation]) => {
		hydrateFromLocation({
			...newLocation,
			equipmentKind: newLocation.equipmentKind ?? "generator",
			viewCategory: newLocation.viewCategory ?? "",
			statusPoints: newLocation.statusPoints ?? {},
		})
	},
	{ immediate: true, deep: true }
)

const handleChange = () => {
	emit("update", buildPowerLocation())
}

const deviceOptions = computed(() => {
	if (props.isLoadingDevices) return [{ value: "", label: "載入中..." }]
	if (props.devices.length === 0) return [{ value: "", label: "尚無可用控制器" }]
	return [
		{ value: "", label: "請選擇控制器" },
		...props.devices.map((d) => ({ value: String(d.id), label: d.name })),
	]
})

const handleEquipmentKindChange = (value: string) => {
	const next = value === "oil_level" ? "oil_level" : "generator"
	if (localLocation.value.equipmentKind === next) return
	localLocation.value.equipmentKind = next
	oilLevelRow.value = emptyRow()
	for (const { key } of generatorRoles) {
		generatorRows.value[key] = emptyRow()
	}
	handleChange()
}
</script>
