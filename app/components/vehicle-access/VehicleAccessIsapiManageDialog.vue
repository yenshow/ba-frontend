<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="vehicle-isapi-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3
							id="vehicle-isapi-manage-title"
							class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							車牌管理
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							tabindex="0"
							@click="handleClose"
							@keydown.enter="handleClose"
							@keydown.space.prevent="handleClose"
						>
							&times;
						</button>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<div v-if="deviceOptions.length === 0" class="py-8 text-center text-white/60">
								<p class="text-base 2xl:text-lg">此地點尚未設定入口或出口攝影機</p>
								<p class="mt-2 text-sm 2xl:text-base">請至「地點管理」設定 ISAPI 攝影機</p>
							</div>

							<div v-else class="space-y-3">
								<div
									v-for="opt in deviceOptions"
									:key="opt.id"
									class="overflow-hidden rounded-lg border border-white/20 bg-white/10 transition-all"
									:class="{ 'bg-white/15': isDeviceExpanded(opt.id) }"
								>
									<div
										class="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-white/10"
										role="button"
										tabindex="0"
										:aria-expanded="isDeviceExpanded(opt.id)"
										:aria-label="`${opt.label} 車牌名單`"
										@click="handleToggleDevice(opt.id)"
										@keydown.enter="handleToggleDevice(opt.id)"
										@keydown.space.prevent="handleToggleDevice(opt.id)"
									>
										<div class="flex min-w-0 flex-1 items-center gap-4">
											<svg
												class="h-5 w-5 shrink-0 text-white/70 transition-transform"
												:class="{ 'rotate-90': isDeviceExpanded(opt.id) }"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
											<div
												class="flex h-16 min-w-[80px] max-w-[12rem] items-center justify-center rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-3 shadow-lg"
											>
												<h4
													class="truncate text-xl font-bold tracking-wider text-white 2xl:text-2xl"
												>
													{{ opt.label }}
												</h4>
											</div>
											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-3">
													<span
														class="rounded-full bg-white/25 px-3 py-1 text-sm font-medium text-white 2xl:text-base"
													>
														{{ getPlateCountLabel(opt.id) }}
													</span>
													<span class="text-sm text-white/60 2xl:text-base">
														{{ opt.laneRole }} · 通道 {{ channelId }}
													</span>
												</div>
											</div>
										</div>
									</div>

									<Transition name="expand">
										<div
											v-if="isDeviceExpanded(opt.id)"
											class="space-y-3 border-t border-white/10 p-4"
										>
											<div class="flex items-center justify-between">
												<span class="text-base font-medium 2xl:text-lg">車牌名單</span>
												<div v-if="canWrite" class="flex flex-wrap gap-2 2xl:gap-3">
													<button
														type="button"
														class="btn-secondary"
														@click="handleOpenPlateForm(opt.id)"
													>
														新增車牌
													</button>
													<button
														type="button"
														class="btn-secondary"
														:disabled="isLoadingDevice(opt.id)"
														@click="loadPlatesForDevice(opt.id)"
													>
														重新載入
													</button>
												</div>
											</div>

											<div
												v-if="isLoadingDevice(opt.id)"
												class="flex justify-center py-8"
											>
												<div
													class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
												></div>
											</div>
											<p
												v-else-if="getDeviceError(opt.id)"
												class="text-base text-rose-300 2xl:text-lg"
											>
												{{ getDeviceError(opt.id) }}
											</p>
											<div
												v-else-if="getDevicePlates(opt.id).length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無車牌名單資料
											</div>
											<div
												v-else
												class="overflow-x-auto rounded border border-white/10 bg-white/5 p-2"
											>
												<table class="w-full min-w-[520px] text-left text-sm text-white/90 2xl:text-base">
													<thead>
														<tr class="border-b border-white/15 text-white/60">
															<th class="px-2 py-2 font-medium">車牌</th>
															<th class="px-2 py-2 font-medium">名單</th>
															<th class="px-2 py-2 font-medium">綁定人員</th>
															<th class="px-2 py-2 font-medium">開始</th>
															<th class="px-2 py-2 font-medium">結束</th>
															<th v-if="canWrite" class="px-2 py-2 font-medium">操作</th>
														</tr>
													</thead>
													<tbody>
														<tr
															v-for="row in getDevicePlates(opt.id)"
															:key="`${opt.id}-${row.id}`"
															class="border-b border-white/10 last:border-b-0"
														>
															<td class="px-2 py-2">{{ row.licensePlate }}</td>
															<td class="px-2 py-2">
																<span
																	class="rounded-full px-2 py-0.5 text-xs 2xl:text-sm"
																	:class="
																		row.listType === 'allowList'
																			? 'bg-emerald-500/20 text-emerald-200'
																			: 'bg-rose-500/20 text-rose-200'
																	"
																>
																	{{ row.listType === "allowList" ? "授權" : "拒絕" }}
																</span>
															</td>
															<td class="px-2 py-2 text-white/70">
																{{ row.bindPersonLabel || "—" }}
															</td>
															<td class="px-2 py-2 text-white/70">
																{{ formatDisplayTime(row.createTime) }}
															</td>
															<td class="px-2 py-2 text-white/70">
																{{ formatDisplayTime(row.effectiveTime) }}
															</td>
															<td v-if="canWrite" class="px-2 py-2">
																<button
																	type="button"
																	class="mr-3 text-cyan-300 hover:underline"
																	@click="handleOpenPlateForm(opt.id, row)"
																>
																	編輯
																</button>
																<button
																	type="button"
																	class="text-rose-300 hover:underline"
																	@click="handleDeletePlate(opt.id, row)"
																>
																	刪除
																</button>
															</td>
														</tr>
													</tbody>
												</table>
											</div>

											<Transition name="expand">
												<div
													v-if="formDeviceId === opt.id && showPlateForm"
													class="flex min-w-0 items-start gap-2 rounded border border-white/10 bg-white/5 p-2"
												>
													<div class="min-w-0 flex-1">
														<button
															type="button"
															class="mb-3 flex w-full items-center justify-between text-left"
															:aria-expanded="plateFormExpanded"
															@click="plateFormExpanded = !plateFormExpanded"
														>
															<span class="text-base font-medium text-white/90 2xl:text-lg">
																{{ plateFormMode === "add" ? "新增車牌" : "編輯車牌" }}
															</span>
															<svg
																class="h-5 w-5 text-white/70 transition-transform"
																:class="{ 'rotate-90': plateFormExpanded }"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
																aria-hidden="true"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M9 5l7 7-7 7"
																/>
															</svg>
														</button>
														<Transition name="expand">
															<div v-if="plateFormExpanded" class="flex flex-col gap-3">
																<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
																	<label
																		class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
																	>
																		<span>車牌 *</span>
																		<input
																			v-model="plateForm.licensePlate"
																			type="text"
																			class="form-input-small"
																			placeholder="例如：ABC1234"
																			:disabled="plateFormMode === 'modify'"
																		/>
																	</label>
																	<label
																		class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
																	>
																		<span>名單類型</span>
																		<select
																			v-model="plateForm.listType"
																			class="form-input-small"
																		>
																			<option value="allowList">授權名單</option>
																			<option value="blockList">拒絕名單</option>
																		</select>
																	</label>
																	<label
																		class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
																	>
																		<span>開始時間</span>
																		<input
																			v-model="plateForm.createTimeLocal"
																			type="datetime-local"
																			class="form-input-small"
																		/>
																	</label>
																	<label
																		class="flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
																	>
																		<span>結束時間</span>
																		<input
																			v-model="plateForm.effectiveTimeLocal"
																			type="datetime-local"
																			class="form-input-small"
																		/>
																	</label>
																	<label
																		class="col-span-full flex min-w-0 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
																	>
																		<span>綁定人員（選填）</span>
																		<FilterDropdown
																			v-model="plateForm.bindPersonId"
																			:options="personBindOptions"
																			placeholder="不綁定人員"
																			:disabled="isLoadingPersonOptions"
																			text-size="text-sm 2xl:text-base"
																		/>
																	</label>
																</div>
																<div class="flex flex-wrap gap-2 2xl:gap-3">
																	<button
																		type="button"
																		class="btn-secondary"
																		:disabled="isSavingPlate"
																		@click="handleSavePlate(opt.id)"
																	>
																		儲存
																	</button>
																	<button
																		type="button"
																		class="btn-secondary"
																		@click="handleCancelPlateForm"
																	>
																		取消
																	</button>
																</div>
															</div>
														</Transition>
													</div>
												</div>
											</Transition>
										</div>
									</Transition>
								</div>
							</div>
						</div>
					</div>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	VehicleAccessLocation,
	VehicleLicensePlateAuditItem,
	VehicleLicensePlateListType,
} from "~/types/vehicleAccess"
import { useVehicleAccessIsapiDeviceApi } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiDeviceApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useToast } from "~/composables/core/useToast"
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils"
import {
	datetimeLocalToIsapi,
	defaultLicensePlateEndLocal,
	formatPersonBindLabel,
	isoToDatetimeLocal,
} from "~/utils/licensePlateFormUtils"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

interface DeviceOption {
	id: number
	label: string
	laneRole: string
}

const props = defineProps<{
	modelValue: boolean
	location: VehicleAccessLocation | null
	canWrite?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const isapiApi = useVehicleAccessIsapiDeviceApi()
const deviceApi = useDeviceApi()
const personnelApi = usePersonnelApi()
const toast = useToast()

const deviceNameMap = ref<Record<number, string>>({})
const expandedDevices = ref<Set<number>>(new Set())
const platesByDevice = ref<Record<number, VehicleLicensePlateAuditItem[]>>({})
const loadingByDevice = ref<Record<number, boolean>>({})
const errorByDevice = ref<Record<number, string>>({})

const formDeviceId = ref<number | null>(null)
const showPlateForm = ref(false)
const plateFormExpanded = ref(true)
const plateFormMode = ref<"add" | "modify">("add")
const isSavingPlate = ref(false)

const plateForm = ref({
	licensePlate: "",
	listType: "allowList" as VehicleLicensePlateListType,
	createTimeLocal: "",
	effectiveTimeLocal: "",
	bindPersonId: "" as string,
})

const personBindOptions = ref<Array<{ value: string; label: string }>>([])
const isLoadingPersonOptions = ref(false)

const siteId = computed(() => {
	const raw = props.location?.id ?? props.location?.locationId
	const n = Number(raw)
	return Number.isFinite(n) ? n : undefined
})

const channelId = computed(() => {
	const ch = props.location?.cameraChannelId
	return ch != null && Number.isFinite(Number(ch)) ? Math.trunc(Number(ch)) : 1
})

const entrySet = computed(() => new Set((props.location?.entryCameraDeviceIds ?? []).map(Number)))
const exitSet = computed(() => new Set((props.location?.exitCameraDeviceIds ?? []).map(Number)))

const deviceIds = computed(() => {
	const entry = props.location?.entryCameraDeviceIds ?? []
	const exit = props.location?.exitCameraDeviceIds ?? []
	return [...new Set([...entry, ...exit].filter((id) => Number.isFinite(Number(id))))]
})

const deviceOptions = computed((): DeviceOption[] =>
	deviceIds.value.map((id) => {
		const name = deviceNameMap.value[id] || `設備 #${id}`
		const isEntry = entrySet.value.has(id)
		const isExit = exitSet.value.has(id)
		let laneRole = "攝影機"
		if (isEntry && isExit) laneRole = "入口／出口"
		else if (isEntry) laneRole = "入口"
		else if (isExit) laneRole = "出口"
		return { id, label: name, laneRole }
	})
)

const apiParams = computed(() => ({
	siteId: siteId.value,
	channelId: channelId.value,
}))

const isDeviceExpanded = (deviceId: number) => expandedDevices.value.has(deviceId)

const getDevicePlates = (deviceId: number) => platesByDevice.value[deviceId] ?? []

const isLoadingDevice = (deviceId: number) => loadingByDevice.value[deviceId] === true

const getDeviceError = (deviceId: number) => errorByDevice.value[deviceId] ?? ""

const getPlateCountLabel = (deviceId: number) => {
	if (isLoadingDevice(deviceId)) return "載入中…"
	const count = getDevicePlates(deviceId).length
	if (errorByDevice.value[deviceId]) return "載入失敗"
	if (!expandedDevices.value.has(deviceId) && count === 0) return "0 筆"
	return `${count} 筆`
}

const formatDisplayTime = (iso?: string | null): string => {
	if (!iso?.trim()) return "—"
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return iso
	const pad = (n: number) => String(n).padStart(2, "0")
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const loadPersonBindOptions = async () => {
	const groupIds = props.location?.personGroupIds ?? []
	if (groupIds.length === 0) {
		personBindOptions.value = []
		return
	}
	isLoadingPersonOptions.value = true
	try {
		const res = await personnelApi.getPersons({
			personGroupIds: groupIds,
			limit: 200,
			offset: 0,
		})
		personBindOptions.value = (res.items ?? []).map((p) => ({
			value: String(p.id),
			label: formatPersonBindLabel(p.employee_no, p.full_name) || `人員 #${p.id}`,
		}))
	} catch {
		personBindOptions.value = []
	} finally {
		isLoadingPersonOptions.value = false
	}
}

const ensurePersonBindOption = (personId: number, label: string) => {
	const value = String(personId)
	if (personBindOptions.value.some((o) => o.value === value)) return
	personBindOptions.value = [
		...personBindOptions.value,
		{ value, label: label || `人員 #${personId}` },
	]
}

const enrichPlatesWithBindings = async (
	items: VehicleLicensePlateAuditItem[],
): Promise<VehicleLicensePlateAuditItem[]> => {
	const plateNumbers = items.map((i) => i.licensePlate).filter(Boolean)
	if (plateNumbers.length === 0) return items
	try {
		const res = await personnelApi.getLicensePlateBindings(plateNumbers)
		const map = new Map(
			(res.items ?? []).map((b) => [
				String(b.plate_normalized || b.plate_number).toUpperCase(),
				b,
			]),
		)
		return items.map((item) => {
			const key = item.licensePlate.trim().toUpperCase()
			const b = map.get(key)
			if (!b) return item
			const label = formatPersonBindLabel(b.employee_no, b.full_name)
			return {
				...item,
				bindPersonId: b.person_id,
				bindPersonLabel: label,
			}
		})
	} catch {
		return items
	}
}

const loadDeviceNames = async () => {
	if (deviceIds.value.length === 0) return
	try {
		const res = await deviceApi.getDevices({ type_code: "camera", limit: 200 })
		const map: Record<number, string> = {}
		for (const dev of res.devices || []) {
			if (dev.id != null) map[dev.id] = dev.name?.trim() || `設備 #${dev.id}`
		}
		deviceNameMap.value = map
	} catch {
		deviceNameMap.value = {}
	}
}

const loadPlatesForDevice = async (deviceId: number) => {
	loadingByDevice.value = { ...loadingByDevice.value, [deviceId]: true }
	errorByDevice.value = { ...errorByDevice.value, [deviceId]: "" }
	try {
		const res = await isapiApi.searchLicensePlates(deviceId, {
			...apiParams.value,
			maxResults: 200,
		})
		const enriched = await enrichPlatesWithBindings(res.items ?? [])
		platesByDevice.value = { ...platesByDevice.value, [deviceId]: enriched }
	} catch (e) {
		errorByDevice.value = {
			...errorByDevice.value,
			[deviceId]: resolveUserFacingCatchMessage(e, "載入車牌名單失敗"),
		}
		platesByDevice.value = { ...platesByDevice.value, [deviceId]: [] }
	} finally {
		loadingByDevice.value = { ...loadingByDevice.value, [deviceId]: false }
	}
}

const handleToggleDevice = async (deviceId: number) => {
	const next = new Set(expandedDevices.value)
	if (next.has(deviceId)) {
		next.delete(deviceId)
		if (formDeviceId.value === deviceId) handleCancelPlateForm()
	} else {
		next.add(deviceId)
		if (!platesByDevice.value[deviceId] && !loadingByDevice.value[deviceId]) {
			await loadPlatesForDevice(deviceId)
		}
	}
	expandedDevices.value = next
}

const handleOpenPlateForm = (deviceId: number, row?: VehicleLicensePlateAuditItem) => {
	formDeviceId.value = deviceId
	plateFormExpanded.value = true
	if (!expandedDevices.value.has(deviceId)) {
		expandedDevices.value = new Set([...expandedDevices.value, deviceId])
		if (!platesByDevice.value[deviceId]) void loadPlatesForDevice(deviceId)
	}
	if (row) {
		plateFormMode.value = "modify"
		const bindId =
			row.bindPersonId != null && Number.isFinite(Number(row.bindPersonId))
				? String(row.bindPersonId)
				: ""
		if (bindId && row.bindPersonLabel) {
			ensurePersonBindOption(Number(row.bindPersonId), row.bindPersonLabel)
		}
		plateForm.value = {
			licensePlate: row.licensePlate,
			listType: row.listType,
			createTimeLocal: isoToDatetimeLocal(row.createTime),
			effectiveTimeLocal: isoToDatetimeLocal(row.effectiveTime),
			bindPersonId: bindId,
		}
	} else {
		plateFormMode.value = "add"
		plateForm.value = {
			licensePlate: "",
			listType: "allowList",
			createTimeLocal: isoToDatetimeLocal(new Date().toISOString()),
			effectiveTimeLocal: defaultLicensePlateEndLocal(),
			bindPersonId: "",
		}
	}
	showPlateForm.value = true
}

const handleCancelPlateForm = () => {
	showPlateForm.value = false
	formDeviceId.value = null
}

const handleSavePlate = async (deviceId: number) => {
	const plate = plateForm.value.licensePlate.trim()
	if (!plate) {
		toast.warning("請輸入車牌")
		return
	}
	isSavingPlate.value = true
	try {
		const bindRaw = plateForm.value.bindPersonId?.trim()
		const bindPersonId = bindRaw ? Number.parseInt(bindRaw, 10) : undefined
		await isapiApi.upsertLicensePlates(deviceId, {
			...apiParams.value,
			plates: [
				{
					id: plate,
					licensePlate: plate,
					listType: plateForm.value.listType,
					operationType: plateFormMode.value === "add" ? "add" : "modify",
					createTime: datetimeLocalToIsapi(plateForm.value.createTimeLocal),
					effectiveTime: datetimeLocalToIsapi(plateForm.value.effectiveTimeLocal),
					...(Number.isFinite(bindPersonId) ? { bindPersonId } : {}),
				},
			],
		})
		toast.success("已儲存車牌名單")
		handleCancelPlateForm()
		await loadPlatesForDevice(deviceId)
	} catch (e) {
		toast.error(resolveUserFacingCatchMessage(e, "儲存車牌名單失敗"))
	} finally {
		isSavingPlate.value = false
	}
}

const handleDeletePlate = async (deviceId: number, row: VehicleLicensePlateAuditItem) => {
	if (!window.confirm(`確定刪除車牌 ${row.licensePlate}？`)) return
	try {
		await isapiApi.deleteLicensePlates(deviceId, {
			...apiParams.value,
			licensePlates: [row.licensePlate],
		})
		toast.success("已刪除")
		await loadPlatesForDevice(deviceId)
	} catch (e) {
		toast.error(resolveUserFacingCatchMessage(e, "刪除車牌失敗"))
	}
}

const handleClose = () => {
	handleCancelPlateForm()
	emit("update:modelValue", false)
}

const resetState = () => {
	expandedDevices.value = new Set()
	platesByDevice.value = {}
	loadingByDevice.value = {}
	errorByDevice.value = {}
	handleCancelPlateForm()
}

watch(
	() => props.modelValue,
	async (open) => {
		if (!open) return
		resetState()
		await loadDeviceNames()
		await loadPersonBindOptions()
		const first = deviceIds.value[0]
		if (first != null) {
			expandedDevices.value = new Set([first])
			await loadPlatesForDevice(first)
		}
	}
)
</script>
