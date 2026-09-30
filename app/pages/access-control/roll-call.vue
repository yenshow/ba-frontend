<template>
	<div>
		<div
			class="monitoring-page-layout"
			:class="isOverviewCollapsed ? 'gap-0' : 'gap-4 xl:gap-6 2xl:gap-8'"
		>
			<section class="monitoring-detail-section">
				<Transition name="fade" mode="out-in">
					<button
						v-if="isOverviewCollapsed"
						key="overview-expand-tab"
						type="button"
						class="absolute -right-px top-24 z-20 flex flex-col items-center gap-2 rounded-l-xl border-2 border-r-0 border-white/80 bg-white/30 px-2.5 py-4 text-white shadow-md transition-colors hover:bg-white/40 2xl:top-32"
						aria-label="展開總覽"
						title="展開總覽"
						@click="isOverviewCollapsed = false"
					>
						<span
							class="text-sm font-semibold tracking-[0.35em] text-white xl:text-base"
							style="writing-mode: vertical-rl"
						>
							總覽
						</span>
					</button>
				</Transition>
				<div class="monitoring-detail-panel monitoring-panel rounded-2xl p-4 2xl:p-6">
					<div class="monitoring-location-title">
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selected" class="ps-[12px] text-[24px] 2xl:text-[36px]">
								{{ selected.zoneName }}
							</span>
						</div>
						<div class="monitoring-location-title__divider"></div>
						<div class="flex w-[200px] items-center justify-center">
							<span v-if="selected" class="pe-[12px] text-[24px] 2xl:text-[36px]">
								{{ selected.name }}
							</span>
						</div>
					</div>
					<PermissionActionButton
						:allowed="canManageLocation"
						aria-label="地點管理"
						class="absolute left-8 top-2 btn-monitoring-overlay"
						@click="showLocationDialog = true"
					>
						地點管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selected"
						:allowed="canOpenAccessManage"
						aria-label="門禁管理"
						class="absolute left-32 2xl:left-36 top-2 btn-monitoring-overlay"
						@click="showAccessManageDialog = true"
					>
						門禁管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selected"
						:allowed="canResetStatistics"
						aria-label="重置簽到統計"
						class="absolute right-32 2xl:right-36 top-2 btn-monitoring-overlay"
						@click="handleResetStats"
					>
						重置統計
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="true"
						aria-label="完整報表"
						class="absolute right-8 top-2 btn-monitoring-overlay"
						@click="showHistoryDialog = true"
					>
						完整報表
					</PermissionActionButton>
					<MonitoringDetailShell
						:empty="!selected"
						:enlarged="isOverviewCollapsed"
						empty-title="請選擇地點"
						empty-description="請在地點管理新增時段簽到地點"
						content-class="gap-12"
					>
						<template v-if="selected">
							<LocationStatsPanel class="shrink-0" :items="statCards" />
							<div class="grid min-h-0 min-w-0 flex-1 grid-cols-2 items-stretch gap-4">
								<div class="flex min-h-0 min-w-0 flex-col">
									<RollCallAttendanceLogTable
										:rows="detail?.attendance || []"
										:can-mark="canMark"
										:can-mark-rows="Boolean(detail?.canMark && canMark)"
										:empty-message="attendanceEmptyMessage"
										@mark="handleMark"
									/>
								</div>
								<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
									<div class="relative mb-3 shrink-0">
										<h3
											class="people-detail-side-title monitoring-chip-bg py-1 text-center text-lg font-semibold text-white 2xl:text-xl"
										>
											人員群組
										</h3>
									</div>
									<PeopleUnitGroupPanel
										:units="unitSummaries"
										:selected-unit-id="selectedUnitId"
										hide-title
										@select="handleUnitSelect"
									/>
								</div>
							</div>
						</template>
					</MonitoringDetailShell>
				</div>
			</section>
			<aside
				class="overview-sidebar"
				:class="isOverviewCollapsed ? 'overview-sidebar--collapsed' : 'overview-sidebar--expanded'"
				:aria-hidden="isOverviewCollapsed"
			>
				<div
					class="monitoring-panel relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl py-8"
				>
					<Transition name="fade" mode="out-in">
						<div
							v-if="!isOverviewCollapsed"
							key="overview-panel"
							class="flex h-full min-h-0 flex-col overflow-hidden"
						>
							<button
								type="button"
								class="absolute right-4 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 text-white transition-colors hover:bg-white/20 2xl:h-12 2xl:w-12"
								aria-expanded="true"
								aria-label="收縮總覽"
								title="收縮總覽"
								@click="isOverviewCollapsed = true"
							>
								<svg
									class="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
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
							<h2
								class="mb-4 text-center text-xl font-semibold tracking-[12px] text-white xl:text-2xl 2xl:text-3xl"
								style="padding-left: 12px"
							>
								總覽
							</h2>
							<div class="show-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
								<template v-if="todayLocations.length > 0">
									<RollCallOverviewCard
										v-for="location in todayLocations"
										:key="location.locationId"
										:location="location"
										class="cursor-pointer transition-all hover:ring-2 hover:ring-cyan-300/50"
										:class="{
											'ring-2 ring-cyan-400': selectedLocationId === location.locationId,
										}"
										@click="handleSelectLocation(location.locationId)"
									/>
								</template>
								<div v-else class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無地點資料</p>
									<p class="mt-2 text-sm 2xl:text-base">請在「地點管理」中新增地點</p>
								</div>
							</div>
						</div>
					</Transition>
				</div>
			</aside>
		</div>
		<ZoneManagementDialog
			v-model="showLocationDialog"
			:zones="zones"
			system-type="roll_call"
			:can-create-zone="canCreateLocation"
			:can-update-zone="canUpdateLocation"
			:can-delete-zone="canDeleteLocation"
			:on-save-zone="handleSaveZone"
			@delete="handleDeleteZone"
			@saved="handleZonesSaved"
		/>
		<PeopleCountingAccessManageDialog
			v-model="showAccessManageDialog"
			:location-id="selectedLocationId"
			:location-name="selected?.name"
			data-source="access_control"
			:can-edit-members="canEditAccessMembers"
			:can-device-sync="canResyncAccessDevices"
			:access-sync="accessSync"
			@synced="handleAccessManageSynced"
			@members-updated="handleAccessManageSynced"
		/>
		<RollCallHistoryDialog v-model="showHistoryDialog" />
		<UnitPersonnelDialog
			v-model="showUnitPersonnelDialog"
			:unit-name="selectedUnitName"
			:personnel="unitPersonnel"
		/>
		<ConfirmDialog
			v-model="showConfirmDialog"
			:title="confirmDialogConfig.title"
			:message="confirmDialogConfig.message"
			:details="confirmDialogConfig.details"
			:type="confirmDialogConfig.type"
			@confirm="handleConfirmResetStats"
		/>
	</div>
</template>

<script setup lang="ts">
import { onScopeDispose, computed, ref } from "vue"
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue"
import LocationStatsPanel from "~/components/people-counting/LocationStatsPanel.vue"
import PeopleUnitGroupPanel from "~/components/people-counting/PeopleUnitGroupPanel.vue"
import UnitPersonnelDialog from "~/components/people-counting/UnitPersonnelDialog.vue"
import RollCallHistoryDialog from "~/components/roll-call/RollCallHistoryDialog.vue"
import RollCallOverviewCard from "~/components/roll-call/RollCallOverviewCard.vue"
import RollCallAttendanceLogTable from "~/components/roll-call/RollCallAttendanceLogTable.vue"
import PeopleCountingAccessManageDialog from "~/components/people-counting/PeopleCountingAccessManageDialog.vue"
import { useAuth } from "~/composables/core/useAuth"
import { useLocationModuleRbac, useRollCallAccessRbac } from "~/composables/core/useAccessGate"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS,
} from "~/composables/location/management/useZoneManagement"
import { useRollCallLocationApi } from "~/composables/location/api/useRollCallLocationApi"
import { useRollCallApi } from "~/composables/systems/rollCall/useRollCallApi"
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket"
import { PERM } from "~/config/permissionCodes"
import { TOAST } from "~/config/toastCatalog"
import { ROLL_CALL_RESET_STATS_CONFIRM } from "~/utils/confirmCopy"
import { createRollCallRuleDraft, ruleToDraft } from "~/types/rollCall"
import type {
	RollCallAttendanceRow,
	RollCallLocation,
	RollCallRuleDraft,
	RollCallSessionDetail,
	RollCallSessionSummary,
	RollCallTodayLocation,
	RollCallZone,
} from "~/types/rollCall"
import type { PeopleCountingPersonnel, PeopleCountingUnit } from "~/types/peopleCounting"
import {
	resolvePersonGroupId,
	UNGROUPED_PERSON_GROUP_ID,
} from "~/utils/personnelUtils"

const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.rollCall)
const {
	canOpenAccessManage,
	canEditAccessMembers,
	canResyncAccessDevices,
	canResetStatistics,
} = useRollCallAccessRbac()
const { useHasPermission } = useAuth()
const canMark = useHasPermission(PERM.rollCall.attendanceMark)

const locationApi = useRollCallLocationApi()
const rollCallApi = useRollCallApi()
const personnelApi = usePersonnelApi()
const sharedLocationApi = useLocationApi()
const { showToast } = useToast()
const { handleError: handleApiError } = useErrorHandler()
const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog
const confirmDialogConfig = confirmDialog.config
const accessSync = useLocationAccessSync({
	personnelApi,
	locationApi: sharedLocationApi,
	toast: {
		success: (m: string) => showToast("success", m),
		error: (m: string) => showToast("error", m),
	},
	handleApiError,
	canDeviceSync: canResyncAccessDevices,
})

const zones = ref<RollCallZone[]>([])
const todayLocations = ref<RollCallTodayLocation[]>([])
const selectedLocationId = ref<number | null>(null)
const detail = ref<RollCallSessionDetail | null>(null)
const selectedUnitId = ref<number | null>(null)
const showUnitPersonnelDialog = ref(false)
const unitPersonnel = ref<PeopleCountingPersonnel[]>([])
const isOverviewCollapsed = ref(false)
const showLocationDialog = ref(false)
const showHistoryDialog = ref(false)
const showAccessManageDialog = ref(false)

const pickPrimarySession = (sessions: RollCallSessionSummary[] = []) =>
	sessions.find((item) => item.status === "open") ||
	sessions.find((item) => item.status === "closed") ||
	sessions[0] ||
	null

const selected = computed(
	() => todayLocations.value.find((item) => item.locationId === selectedLocationId.value) || null,
)
const activeSummary = computed(() => pickPrimarySession(selected.value?.sessions))
const statCards = computed(() => [
	{ label: "應到人數", value: activeSummary.value?.expectedCount ?? 0 },
	{ label: "實到人數", value: activeSummary.value?.presentCount ?? 0 },
	{ label: "未到人數", value: activeSummary.value?.absentCount ?? 0 },
])

/** 對齊人流 PeopleUnitGroupPanel：直接使用 today.units */
const unitSummaries = computed((): PeopleCountingUnit[] => {
	const locationId = selected.value?.locationId ?? 0
	return (selected.value?.units || []).map((u) => ({
		id: u.id,
		locationId,
		name: u.name,
		capacity: u.totalCount,
		currentCount: u.currentCount,
	}))
})

const selectedUnitName = computed(() => {
	const unit = unitSummaries.value.find((u) => u.id === selectedUnitId.value)
	return unit?.name || "人員群組"
})

const attendanceEmptyMessage = computed(() => {
	if (activeSummary.value?.status === "not_started") return "時段尚未開始"
	if (!activeSummary.value) return "今日無簽到時段"
	return "尚無簽到紀錄"
})

const formatCheckedInParts = (checkedInAt: string | null | undefined) => {
	if (!checkedInAt) return { lastEntryDate: undefined as string | undefined, entryTime: undefined as string | undefined }
	const d = new Date(checkedInAt)
	if (Number.isNaN(d.getTime())) return { lastEntryDate: undefined, entryTime: undefined }
	const pad = (n: number) => String(n).padStart(2, "0")
	return {
		lastEntryDate: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
		entryTime: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
	}
}

const mapAttendanceToPersonnel = (
	rows: RollCallAttendanceRow[],
	unitId: number,
): PeopleCountingPersonnel[] =>
	rows
		.filter((row) => (row.groupId ?? UNGROUPED_PERSON_GROUP_ID) === unitId)
		.map((row) => {
			const parts = formatCheckedInParts(row.checkedInAt)
			return {
				id: row.personId,
				unitId,
				employeeId: row.employeeNo,
				name: row.fullName || row.employeeNo,
				photoUrl: row.photoUrl || undefined,
				isPresent: row.status === "present",
				lastEntryDate: parts.lastEntryDate,
				entryTime: parts.entryTime,
			}
		})

const attachRulesToZones = (
	zoneList: RollCallZone[],
	rules: Awaited<ReturnType<typeof rollCallApi.listRules>>["rules"],
): RollCallZone[] => {
	const byLocation = new Map<number, RollCallRuleDraft[]>()
	for (const rule of rules || []) {
		const list = byLocation.get(rule.locationId) || []
		list.push(ruleToDraft(rule))
		byLocation.set(rule.locationId, list)
	}
	return (zoneList || []).map((zone) => ({
		...zone,
		locations: (zone.locations || []).map((loc) => {
			const locId = Number(loc.id)
			const existing = Number.isFinite(locId)
				? byLocation.get(locId) || []
				: loc.rules || []
			return {
				...loc,
				rules: existing.length > 0 ? existing : [createRollCallRuleDraft({ name: "規則 1" })],
			}
		}),
	}))
}

const loadZones = async () => {
	const [zoneRes, ruleRes] = await Promise.all([locationApi.getZones(), rollCallApi.listRules()])
	zones.value = attachRulesToZones(zoneRes.zones || [], ruleRes.rules || [])
}

const persistLocationRules = async (
	savedLocations: RollCallLocation[],
	draftRulesByIndex: RollCallRuleDraft[][],
) => {
	const saved: Awaited<ReturnType<typeof rollCallApi.listRules>>["rules"] = []
	for (let i = 0; i < savedLocations.length; i++) {
		const locId = Number(savedLocations[i]?.id)
		if (!Number.isFinite(locId) || locId <= 0) continue
		const drafts = draftRulesByIndex[i] || []
		const res = await rollCallApi.replaceLocationRules(locId, drafts)
		saved.push(...(res.rules || []))
	}
	return saved
}

const loadSessionDetail = async (summary: RollCallSessionSummary | null) => {
	selectedUnitId.value = null
	showUnitPersonnelDialog.value = false
	unitPersonnel.value = []
	if (!summary?.id || summary.status === "not_started") {
		detail.value = null
		return
	}
	const res = await rollCallApi.getSession(summary.id)
	detail.value = res.session
}

const loadToday = async () => {
	const res = await rollCallApi.getToday()
	todayLocations.value = res.locations || []
	if (
		selectedLocationId.value == null ||
		!todayLocations.value.some((item) => item.locationId === selectedLocationId.value)
	) {
		selectedLocationId.value = todayLocations.value[0]?.locationId ?? null
	}
	await loadSessionDetail(activeSummary.value)
}

const handleSelectLocation = async (locationId: number) => {
	selectedLocationId.value = locationId
	const location = todayLocations.value.find((item) => item.locationId === locationId)
	await loadSessionDetail(pickPrimarySession(location?.sessions))
}

const handleUnitSelect = async (unitId: number) => {
	selectedUnitId.value = unitId
	const attendanceRows = detail.value?.attendance || []
	if (attendanceRows.length > 0) {
		unitPersonnel.value = mapAttendanceToPersonnel(attendanceRows, unitId)
		showUnitPersonnelDialog.value = true
		return
	}
	const locationId = selectedLocationId.value
	if (locationId == null) {
		unitPersonnel.value = []
		showUnitPersonnelDialog.value = true
		return
	}
	try {
		const res = await personnelApi.getLocationMembers(locationId, { limit: 500, status: "active" })
		const items = res.items || []
		unitPersonnel.value = items
			.filter((person) => resolvePersonGroupId(person) === unitId)
			.map((person) => ({
				id: person.id,
				unitId,
				employeeId: person.employee_no,
				name: person.full_name || person.employee_no,
				photoUrl: person.face_url || undefined,
				isPresent: false,
			}))
	} catch (error) {
		handleApiError(error, "載入群組名單失敗")
		unitPersonnel.value = []
	}
	showUnitPersonnelDialog.value = true
}

const handleMark = async (personId: number, status: "present" | "absent") => {
	if (!detail.value?.canMark || !canMark.value) return
	const res = await rollCallApi.markAttendance(detail.value.id, personId, status)
	detail.value = res.session
	await loadToday()
}

const handleResetStats = () => {
	if (!selected.value) return
	confirmDialog.show(ROLL_CALL_RESET_STATS_CONFIRM)
}

const handleConfirmResetStats = async () => {
	if (!selectedLocationId.value) return
	try {
		await rollCallApi.resetLocationStats(selectedLocationId.value)
		showToast("success", TOAST.ROLL_CALL_RESET)
		await loadToday()
	} catch (error) {
		showToast("error", error instanceof Error ? error.message : TOAST.STATS_RESET_FAILED)
	}
}

const handleAccessManageSynced = async () => {
	await loadToday()
}

const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<RollCallLocation, RollCallZone>()

const handleSaveZone = async (zone: RollCallZone) => {
	const draftRulesByIndex = (zone.locations || []).map((loc) => loc.rules || [])
	await baseHandleSaveZone(
		zone,
		zones,
		async (item: RollCallZone) => {
			const isValidId = item.id && !item.id.startsWith("temp-") && /^\d+$/.test(item.id)
			const result = isValidId
				? await locationApi.updateZone(item.id!, {
						name: item.name,
						sortOrder: item.sortOrder,
						locations: item.locations,
					})
				: await locationApi.createZone({
						name: item.name,
						sortOrder: item.sortOrder,
						locations: item.locations,
					})
			const savedZone = {
				...result.zone,
				id: result.zone.id || item.id,
			} as RollCallZone & { id: string }
			const savedRules = await persistLocationRules(
				savedZone.locations || [],
				draftRulesByIndex,
			)
			const withRules = attachRulesToZones([savedZone], savedRules)[0]
			return {
				merged: result.merged,
				message: result.message,
				zone: withRules as RollCallZone & { id: string },
			}
		},
		{ ...ZONE_DIALOG_BATCH_SAVE_OPTIONS },
	)
}

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, zones, locationApi.deleteZone, {
		systemType: "roll_call",
		onAfterDelete: async () => {
			await loadZones()
			await loadToday()
		},
	})
}

const handleZonesSaved = async () => {
	await loadZones()
	await loadToday()
}

const cleanupWebSocket = setupDebouncedRefetchListeners(
	() => loadToday(),
	[{ event: "people-counting:access-control:event" }],
	500,
	"RollCall",
)
onScopeDispose(cleanupWebSocket)

onMounted(() => {
	void loadZones()
	void loadToday()
})
</script>
