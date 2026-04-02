<template>
	<div class="flex w-full min-w-0 flex-col gap-3">
		<!-- 列 1：點位名稱 / 設備類型（檢視分類由分組列設定，不在此顯示） -->
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
					placeholder="例如：PW-1"
					@blur="handleChange"
				/>
			</label>

			<label
				class="flex min-w-[7rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
			>
				<span>設備類型 *</span>
				<FilterDropdown
					:model-value="localLocation.equipmentKind === 'tank' ? 'tank' : 'pump'"
					:options="equipmentKindOptions"
					placeholder="請選擇設備類型"
					@update:model-value="handleEquipmentKindChange"
				/>
			</label>
		</div>

		<!-- 列 2 起：馬達＝單組 控制器／類型／地址；液位＝三組（高水位／低水位／水箱蓋） -->
		<template v-if="localLocation.equipmentKind === 'pump'">
			<div class="flex min-w-0 flex-wrap items-end gap-2">
				<label
					class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
				>
					<span>控制器</span>
					<FilterDropdown
						v-model="motorRow.deviceIdStr"
						:options="deviceOptions"
						:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
						@update:modelValue="handleMotorDeviceChange"
					/>
				</label>

				<template v-if="motorRow.deviceIdStr">
					<label
						class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
					>
						<span>類型 *</span>
						<select
							v-model="motorRow.type"
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
								v-model.number="motorRow.address"
								type="number"
								min="0"
								placeholder="地址"
								required
								class="form-input-small w-full transition-all"
								:class="addressIssueFieldClass(motorAddressIssue)"
								:title="motorAddressIssue?.msg ?? undefined"
								@blur="handleChange"
							/>
							<div
								v-if="motorAddressIssue"
								class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								:title="motorAddressIssue.msg"
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

		<template v-else>
			<div class="space-y-3 rounded border border-white/10 bg-white/5 p-3">
				<div
					v-for="role in tankRoles"
					:key="role.key"
					class="flex min-w-0 flex-col gap-2 border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
				>
					<div class="flex min-w-0 flex-wrap items-end gap-2">
						<label
							class="flex min-w-[8rem] flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
						>
							<span>{{ role.label }} 控制器</span>
							<FilterDropdown
								v-model="tankRows[role.key].deviceIdStr"
								:options="deviceOptions"
								:placeholder="isLoadingDevices ? '載入中...' : '請選擇控制器'"
								@update:model-value="handleChange"
							/>
						</label>

						<template v-if="tankRows[role.key].deviceIdStr">
							<label
								class="flex w-24 flex-shrink-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
							>
								<span>類型 *</span>
								<select
									v-model="tankRows[role.key].type"
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
										v-model.number="tankRows[role.key].address"
										type="number"
										min="0"
										placeholder="地址"
										required
										class="form-input-small w-full transition-all"
										:class="addressIssueFieldClass(tankAddressIssues[role.key])"
										:title="tankAddressIssues[role.key]?.msg ?? undefined"
										@blur="handleChange"
									/>
									<div
										v-if="tankAddressIssues[role.key]"
										class="pointer-events-none absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
										:title="tankAddressIssues[role.key]!.msg"
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
import type { DrainageLocation } from "~/types/drainage"
import type { Device } from "~/types/device"
import type { DrainageStatusPointDef } from "~/types/location"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import {
	useDrainageLocationValidation,
	type DrainageModbusTuple,
} from "~/composables/location/validation/useDrainageLocationValidation"

type DiDo = "DI" | "DO"
type TankRoleKey = "highLevel" | "lowLevel" | "coverAlarm"

interface ModbusRowState {
	deviceIdStr: string
	type: DiDo
	address: number
}

interface AddressIssue {
	msg: string
}

interface Props {
	location: DrainageLocation
	/** 所屬檢視分類（由分組列決定；空字串為未分類） */
	groupViewCategory: string
	/** 同區域內所有點位（供地址重複檢查，對齊照明） */
	allLocations?: DrainageLocation[]
	currentIndex?: number
	devices?: Device[]
	isLoadingDevices?: boolean
}

interface Emits {
	(e: "update", location: DrainageLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	allLocations: () => [],
	currentIndex: -1,
	devices: () => [],
	isLoadingDevices: false,
})

const { validateModbusAddress, tuplesFromDrainageLocation, drainageTupleKey } =
	useDrainageLocationValidation()

const addressIssueFieldClass = (issue: AddressIssue | null): string =>
	issue
		? "animate-pulse border-2 border-rose-500 bg-rose-500/20 pr-10 shadow-[0_0_0_3px_rgba(244,63,94,0.2)] focus:border-rose-500 focus:bg-rose-500/25 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.3)]"
		: ""

const otherModbusKeys = computed(() => {
	const set = new Set<string>()
	if (props.currentIndex < 0) return set
	props.allLocations.forEach((loc, i) => {
		if (i === props.currentIndex) return
		for (const t of tuplesFromDrainageLocation(loc)) {
			set.add(drainageTupleKey(t))
		}
	})
	return set
})

const motorTupleFromForm = (): DrainageModbusTuple | null => {
	const id = Number(motorRow.value.deviceIdStr)
	if (!id || id <= 0) return null
	if (!Number.isFinite(motorRow.value.address) || motorRow.value.address < 0) return null
	return {
		deviceId: id,
		type: motorRow.value.type,
		address: motorRow.value.address,
	}
}

const tankTupleFromForm = (role: TankRoleKey): DrainageModbusTuple | null => {
	const row = tankRows.value[role]
	const id = Number(row.deviceIdStr)
	if (!id || id <= 0) return null
	if (!Number.isFinite(row.address) || row.address < 0) return null
	return {
		deviceId: id,
		type: row.type,
		address: row.address,
	}
}

const tankTupleKeyCounts = computed(() => {
	const m = new Map<string, number>()
	for (const { key } of tankRoles) {
		const t = tankTupleFromForm(key)
		if (!t) continue
		const k = drainageTupleKey(t)
		m.set(k, (m.get(k) || 0) + 1)
	}
	return m
})

const motorAddressIssue = computed((): AddressIssue | null => {
	if (!motorRow.value.deviceIdStr) return null
	const id = Number(motorRow.value.deviceIdStr)
	const invalid = validateModbusAddress(motorRow.value.address, id)
	if (invalid) return { msg: invalid }

	const t = motorTupleFromForm()
	if (!t || props.currentIndex < 0) return null
	const k = drainageTupleKey(t)
	if (otherModbusKeys.value.has(k)) return { msg: "此地址已被使用" }
	return null
})

const tankAddressIssues = computed((): Record<TankRoleKey, AddressIssue | null> => {
	const out: Record<TankRoleKey, AddressIssue | null> = {
		highLevel: null,
		lowLevel: null,
		coverAlarm: null,
	}
	if (localLocation.value.equipmentKind !== "tank") return out

	for (const { key } of tankRoles) {
		const row = tankRows.value[key]
		if (!row.deviceIdStr) continue
		const id = Number(row.deviceIdStr)
		const invalid = validateModbusAddress(row.address, id)
		if (invalid) {
			out[key] = { msg: invalid }
			continue
		}
		const t = tankTupleFromForm(key)
		if (!t || props.currentIndex < 0) continue
		const k = drainageTupleKey(t)
		if ((tankTupleKeyCounts.value.get(k) || 0) > 1) {
			out[key] = { msg: "此地址已被使用" }
			continue
		}
		if (otherModbusKeys.value.has(k)) {
			out[key] = { msg: "此地址已被使用" }
		}
	}
	return out
})

const emit = defineEmits<Emits>()

const equipmentKindOptions = [
	{ value: "pump", label: "馬達" },
	{ value: "tank", label: "液位" },
]

const tankRoles: { key: TankRoleKey; label: string }[] = [
	{ key: "coverAlarm", label: "水箱蓋" },
	{ key: "highLevel", label: "高水位" },
	{ key: "lowLevel", label: "低水位" },
]

const localLocation = ref<DrainageLocation>({ ...props.location })
const pumpPointKey = ref<"running" | "fault">("running")

const emptyRow = (): ModbusRowState => ({
	deviceIdStr: "",
	type: "DI",
	address: 0,
})

const motorRow = ref<ModbusRowState>(emptyRow())
const tankRows = ref<Record<TankRoleKey, ModbusRowState>>({
	highLevel: emptyRow(),
	lowLevel: emptyRow(),
	coverAlarm: emptyRow(),
})

const mapDiDoToRegisterType = (t: DiDo): DrainageStatusPointDef["registerType"] => {
	return t === "DO" ? "coil" : "discrete"
}

const registerTypeToDiDo = (def: DrainageStatusPointDef | undefined): DiDo => {
	if (!def) return "DI"
	const rt = String(def.registerType || "").toLowerCase()
	if (rt === "coil") return "DO"
	return "DI"
}

const hydrateFromLocation = (loc: DrainageLocation) => {
	const kind = loc.equipmentKind === "tank" ? "tank" : "pump"
	const vc = props.groupViewCategory
	localLocation.value = {
		...loc,
		equipmentKind: kind,
		viewCategory: vc,
		statusPoints: loc.statusPoints ? { ...loc.statusPoints } : {},
	}

	if (kind === "tank") {
		for (const { key } of tankRoles) {
			const def = loc.statusPoints?.[key] as
				| (DrainageStatusPointDef & { deviceId?: number })
				| undefined
			tankRows.value[key] = def
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
		motorRow.value = emptyRow()
		return
	}

	const sp = loc.statusPoints || {}
	let key: "running" | "fault" = "running"
	let def = sp.running as (DrainageStatusPointDef & { deviceId?: number }) | undefined
	if (!def && sp.fault) {
		key = "fault"
		def = sp.fault as (DrainageStatusPointDef & { deviceId?: number }) | undefined
	}
	pumpPointKey.value = key

	if (def) {
		const did =
			def.deviceId != null && def.deviceId > 0
				? String(def.deviceId)
				: loc.deviceId && loc.deviceId > 0
					? String(loc.deviceId)
					: ""
		motorRow.value = {
			deviceIdStr: did,
			type: registerTypeToDiDo(def),
			address: Number(def.address) || 0,
		}
	} else {
		motorRow.value = {
			deviceIdStr: loc.deviceId && loc.deviceId > 0 ? String(loc.deviceId) : "",
			type: "DI",
			address: 0,
		}
	}
	for (const { key: rk } of tankRoles) {
		tankRows.value[rk] = emptyRow()
	}
}

const buildDrainageLocation = (): DrainageLocation => {
	const viewCategory = props.groupViewCategory
	const base: DrainageLocation = {
		...localLocation.value,
		viewCategory,
		modbus: undefined,
		statusPoints: {},
	}

	if (base.equipmentKind === "pump") {
		const id = motorRow.value.deviceIdStr ? Number(motorRow.value.deviceIdStr) : 0
		base.deviceId = id > 0 ? id : undefined
		if (id > 0 && Number.isFinite(motorRow.value.address) && motorRow.value.address >= 0) {
			base.statusPoints = {
				[pumpPointKey.value]: {
					registerType: mapDiDoToRegisterType(motorRow.value.type),
					address: motorRow.value.address,
				},
			}
		}
		return base
	}

	const sp: Record<string, DrainageStatusPointDef & { deviceId?: number }> = {}
	let primaryDevice = 0
	for (const { key } of tankRoles) {
		const row = tankRows.value[key]
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
			equipmentKind: newLocation.equipmentKind ?? "pump",
			viewCategory: newLocation.viewCategory ?? "",
			statusPoints: newLocation.statusPoints ?? {},
		})
	},
	{ immediate: true, deep: true }
)

const handleChange = () => {
	emit("update", buildDrainageLocation())
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
	const next = value === "tank" ? "tank" : "pump"
	if (localLocation.value.equipmentKind === next) return
	localLocation.value.equipmentKind = next
	if (next === "tank") {
		motorRow.value = emptyRow()
		for (const { key } of tankRoles) {
			tankRows.value[key] = emptyRow()
		}
	} else {
		for (const { key } of tankRoles) {
			tankRows.value[key] = emptyRow()
		}
		pumpPointKey.value = "running"
		motorRow.value = emptyRow()
	}
	handleChange()
}

const handleMotorDeviceChange = (value: string) => {
	motorRow.value.deviceIdStr = value
	handleChange()
}
</script>
