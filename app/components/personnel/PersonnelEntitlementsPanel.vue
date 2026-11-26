<template>
	<div class="flex flex-col gap-4 2xl:gap-5">
		<div v-if="loading" class="py-10 text-center text-white/70">載入中…</div>
		<div
			v-else-if="loadError"
			class="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200"
			role="alert"
		>
			{{ loadError }}
		</div>
		<template v-else-if="entitlements">
			<section
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4"
				aria-label="平台資料摘要"
			>
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h4 class="text-sm font-medium text-white 2xl:text-base">平台資料摘要</h4>
					<p class="text-xs text-white/55 2xl:text-sm">
						{{ entitlements.employeeNo }}
						{{ entitlements.fullName ? `／${entitlements.fullName}` : "" }}
					</p>
				</div>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					<div
						v-for="chip in credentialChips"
						:key="chip.label"
						class="rounded-lg border px-3 py-2"
						:class="
							chip.ok
								? 'border-cyan-400/25 bg-cyan-500/10'
								: 'border-white/10 bg-black/10'
						"
					>
						<p class="text-[11px] text-white/50 2xl:text-xs">{{ chip.label }}</p>
						<p
							class="mt-0.5 text-sm font-semibold tabular-nums 2xl:text-base"
							:class="chip.ok ? 'text-white' : 'text-white/45'"
						>
							{{ chip.value }}
						</p>
					</div>
				</div>
			</section>

			<section v-if="canEditAccess" class="flex flex-col gap-2">
				<div class="flex flex-col gap-0.5">
					<h4 class="text-sm font-medium text-white 2xl:text-base">可進出地點</h4>
					<p class="text-xs text-white/50">人流門禁／時段簽到／車輛進出</p>
				</div>
				<div class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
					<label
						v-for="loc in editableLocations"
						:key="loc.locationId"
						class="flex cursor-pointer items-center gap-3 border-b border-white/5 px-3 py-2.5 text-sm text-white last:border-b-0 hover:bg-white/5"
					>
						<input
							v-model="draftGranted"
							type="checkbox"
							class="shrink-0"
							:value="loc.locationId"
						/>
						<span class="min-w-0 flex-1">
							<span class="block font-medium">{{ loc.locationName }}</span>
							<span class="mt-0.5 block text-xs text-white/45">
								{{ loc.zoneName || "未分區" }}
								<span class="text-white/25"> · </span>
								{{ formatFlags(loc.flags) }}
							</span>
						</span>
						<button
							type="button"
							class="shrink-0 text-xs text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
							@click.prevent="handleOpenLocationManage(loc)"
						>
							地點管理
						</button>
					</label>
					<p
						v-if="editableLocations.length === 0"
						class="p-4 text-center text-sm text-white/50"
					>
						目前沒有可授權的地點，或缺少編輯權限
					</p>
				</div>
			</section>

			<section v-if="showElevator" class="flex flex-col gap-2">
				<div class="flex flex-col gap-0.5">
					<h4 class="text-sm font-medium text-white 2xl:text-base">電梯樓層</h4>
					<p class="text-xs text-white/50">勾選可搭乘樓層；套用時一併同步梯控</p>
				</div>
				<div
					v-for="cand in elevatorCandidates"
					:key="cand.locationId"
					class="rounded-xl border border-white/10 bg-white/[0.03] p-3"
				>
					<div class="mb-3 flex items-center justify-between gap-2">
						<div class="min-w-0">
							<p class="truncate text-sm font-medium text-white">{{ cand.locationName }}</p>
							<p v-if="cand.zoneName" class="text-xs text-white/45">{{ cand.zoneName }}</p>
						</div>
						<button
							type="button"
							class="shrink-0 text-xs text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
							@click="handleNavigate('/access-control/elevator')"
						>
							樓層設定
						</button>
					</div>
					<div class="flex flex-wrap gap-1.5">
						<label
							v-for="floor in cand.floors"
							:key="`${cand.locationId}-${floor.floorIndex}`"
							class="inline-flex cursor-pointer items-center rounded-lg border px-2.5 py-1 text-xs transition-colors"
							:class="
								isFloorSelected(cand.locationId, floor.floorIndex)
									? 'border-cyan-400/50 bg-cyan-500/20 text-white'
									: 'border-white/10 bg-white/5 text-white/75 hover:border-white/25'
							"
						>
							<input
								v-model="draftElevatorFloors[cand.locationId]"
								type="checkbox"
								class="sr-only"
								:value="floor.floorIndex"
							/>
							{{ floor.code || floor.name }}
						</label>
					</div>
				</div>
				<p v-if="elevatorCandidates.length === 0" class="text-sm text-white/50">
					尚無電梯地點
				</p>
			</section>

			<section
				v-if="syncJob"
				class="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2.5 text-sm text-white/90"
				:aria-busy="syncJob.status !== 'completed'"
			>
				<p class="font-medium">設備同步：{{ syncStatusLabel }}</p>
				<p class="mt-1 text-xs text-white/65">
					進度 {{ syncProgress.completed }}/{{ syncProgress.total || "—" }}
					<span v-if="syncJob.progress?.waitMessage">
						· {{ syncJob.progress.waitMessage }}
					</span>
					<span v-else-if="syncJob.progress?.currentStage">
						· {{ formatStage(syncJob.progress.currentStage) }}
					</span>
				</p>
				<p v-if="(syncJob.itemsMeta?.issuesTotal || 0) > 0" class="mt-1 text-xs text-amber-200">
					有 {{ syncJob.itemsMeta?.issuesTotal }} 筆問題，請至對應地點管理查看同步明細
				</p>
			</section>

			<footer class="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
				<button
					v-if="canEditAccess || showElevator"
					type="button"
					class="btn-primary disabled:opacity-50"
					:disabled="saving || syncing"
					@click="handleApply"
				>
					{{ saving || syncing ? "套用並同步中…" : "套用授權" }}
				</button>
			</footer>
		</template>
	</div>
</template>

<script setup lang="ts">
import { PERM } from "~/config/permissionCodes"
import { useAuth } from "~/composables/core/useAuth"
import { useLicense } from "~/composables/core/useLicense"
import { useToast } from "~/composables/core/useToast"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import type {
	ElevatorCandidateLocation,
	PersonEntitlementLocation,
	PersonEntitlements,
	SyncLocationJob,
} from "~/types/personnel"

const props = defineProps<{
	personId: number
	active?: boolean
}>()

const emit = defineEmits<{
	applied: []
	leave: [path: string]
}>()

const personnelApi = usePersonnelApi()
const { hasPermission } = useAuth()
const { hasFeature } = useLicense()
const { handleError } = useErrorHandler()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const syncing = ref(false)
const loadError = ref<string | null>(null)
const entitlements = ref<PersonEntitlements | null>(null)
const elevatorCandidates = ref<ElevatorCandidateLocation[]>([])
const draftGranted = ref<number[]>([])
const draftElevatorFloors = ref<Record<number, number[]>>({})
const syncJob = ref<SyncLocationJob | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const canEditPeopleCounting = computed(
	() => hasPermission(PERM.peopleCounting.syncEdit),
)
const canEditRollCall = computed(() => hasPermission(PERM.rollCall.syncEdit))
const canEditVehicle = computed(() => hasPermission(PERM.vehicleAccess.plateManage))
const canEditAccess = computed(
	() => canEditPeopleCounting.value || canEditRollCall.value || canEditVehicle.value,
)
const canFloorManage = computed(() => hasPermission(PERM.elevator.floorManage))
const showElevator = computed(
	() => hasFeature("elevator") && canFloorManage.value,
)

const editableLocations = computed(() => {
	const list = entitlements.value?.locations || []
	return list.filter((loc) => {
		if (loc.flags.peopleCounting && canEditPeopleCounting.value) return true
		if (loc.flags.rollCall && canEditRollCall.value) return true
		if (loc.flags.vehiclePlates && canEditVehicle.value) return true
		return false
	})
})

const credentialChips = computed(() => {
	const c = entitlements.value?.credentials
	if (!c) return []
	return [
		{ label: "人臉", value: c.hasFace ? "有" : "無", ok: c.hasFace },
		{ label: "卡號", value: String(c.cardCount), ok: c.cardCount > 0 },
		{ label: "指紋", value: String(c.fingerprintCount), ok: c.fingerprintCount > 0 },
		{ label: "車牌", value: String(c.plateCount), ok: c.plateCount > 0 },
	]
})

const syncProgress = computed(() => {
	const p = syncJob.value?.progress
	return {
		completed: Number(p?.completed) || 0,
		total: Number(p?.total) || 0,
	}
})

const syncStatusLabel = computed(() => {
	const status = syncJob.value?.status
	if (status === "queued") return "排隊中"
	if (status === "running") return "進行中"
	if (status === "completed") return "已完成"
	return status || "—"
})

const formatStage = (stage: string) => {
	const map: Record<string, string> = {
		plates: "車牌",
		elevator: "電梯",
		access: "門禁",
		face: "人臉",
		card: "卡號",
	}
	return map[stage] || stage
}

const isFloorSelected = (locationId: number, floorIndex: number) => {
	const list = draftElevatorFloors.value[locationId] || []
	return list.map(Number).includes(Number(floorIndex))
}

const formatFlags = (flags: PersonEntitlementLocation["flags"]) => {
	const parts: string[] = []
	if (flags.peopleCounting) parts.push("人流門禁")
	if (flags.rollCall) parts.push("時段簽到")
	if (flags.vehiclePlates) parts.push("車輛")
	return parts.join("／") || "—"
}

const stopPoll = () => {
	if (pollTimer) {
		clearInterval(pollTimer)
		pollTimer = null
	}
}

const pollJob = async (personId: number, jobId: string) => {
	stopPoll()
	syncing.value = true
	const tick = async () => {
		try {
			const job = await personnelApi.getPersonSyncJob(personId, jobId, {
				includeIssues: true,
			})
			syncJob.value = job
			if (job.status === "completed") {
				stopPoll()
				syncing.value = false
				toast.success("授權已同步至設備")
				await load()
			}
		} catch (err) {
			stopPoll()
			syncing.value = false
			handleError(err, "查詢同步進度失敗")
		}
	}
	await tick()
	pollTimer = setInterval(() => {
		void tick()
	}, 5000)
}

const load = async () => {
	loading.value = true
	loadError.value = null
	try {
		const data = await personnelApi.getPersonEntitlements(props.personId)
		entitlements.value = data
		draftGranted.value = data.locations.filter((l) => l.granted).map((l) => l.locationId)
		const floorsMap: Record<number, number[]> = {}
		for (const row of data.elevator || []) {
			floorsMap[row.locationId] = [...(row.floorIndexes || [])]
		}
		draftElevatorFloors.value = floorsMap
		if (showElevator.value) {
			const elev = await personnelApi.getElevatorCandidateLocations()
			elevatorCandidates.value = elev.items || []
			for (const cand of elevatorCandidates.value) {
				if (!draftElevatorFloors.value[cand.locationId]) {
					draftElevatorFloors.value[cand.locationId] = []
				}
			}
		} else {
			elevatorCandidates.value = []
		}
		const activeJob = data.activeJobs?.[0]
		if (activeJob?.jobId) {
			await pollJob(props.personId, activeJob.jobId)
		}
	} catch (err) {
		loadError.value = String(handleError(err, "載入授權失敗") || "載入授權失敗")
	} finally {
		loading.value = false
	}
}

const handleNavigate = (path: string) => {
	stopPoll()
	emit("leave", path)
}

const handleOpenLocationManage = (loc: PersonEntitlementLocation) => {
	if (loc.flags.rollCall && hasFeature("roll_call")) {
		handleNavigate("/access-control/roll-call")
		return
	}
	if (loc.flags.vehiclePlates && !loc.flags.peopleCounting) {
		handleNavigate("/access-control/vehicle-access")
		return
	}
	handleNavigate("/access-control/people-counting")
}

const handleApply = async () => {
	if (!entitlements.value) return
	saving.value = true
	try {
		const original = new Set(
			entitlements.value.locations.filter((l) => l.granted).map((l) => l.locationId),
		)
		const next = new Set(draftGranted.value)
		const grantLocationIds = [...next].filter((id) => !original.has(id))
		const revokeLocationIds = [...original].filter((id) => !next.has(id))

		let jobId: string | null = null
		if (grantLocationIds.length || revokeLocationIds.length) {
			const result = await personnelApi.patchPersonLocationAccess(props.personId, {
				grantLocationIds,
				revokeLocationIds,
				sync: true,
			})
			jobId = result.deviceSync?.jobId || null
		}

		if (showElevator.value) {
			const byLocation: Record<string, number[]> = {}
			for (const [locId, floors] of Object.entries(draftElevatorFloors.value)) {
				const list = (floors || []).map(Number).filter((n) => Number.isFinite(n) && n > 0)
				if (list.length) byLocation[String(locId)] = list
			}
			const hasAny = Object.keys(byLocation).length > 0
			const elevResult = await personnelApi.replacePersonLadderCard(
				props.personId,
				hasAny ? { floors: { byLocation }, sync: true } : { clear: true },
			)
			const elevJob = (elevResult as { deviceSync?: { jobId?: string } })?.deviceSync?.jobId
			if (elevJob) jobId = elevJob
		}

		toast.success(jobId ? "授權已套用，正在同步設備…" : "授權已套用")
		emit("applied")
		if (jobId) await pollJob(props.personId, jobId)
		else await load()
	} catch (err) {
		handleError(err, "套用授權失敗")
	} finally {
		saving.value = false
	}
}

watch(
	() => [props.active, props.personId] as const,
	([active]) => {
		if (active) void load()
		else stopPoll()
	},
	{ immediate: true },
)

onBeforeUnmount(() => stopPoll())
</script>
