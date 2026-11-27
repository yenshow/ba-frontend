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
				<div
					ref="detailPanelRef"
					class="monitoring-detail-panel monitoring-panel rounded-2xl p-4 2xl:p-6"
				>
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
						class="btn-monitoring-overlay absolute left-8 top-2"
						@click="showLocationDialog = true"
					>
						地點管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selected"
						:allowed="canOpenAccessManage"
						aria-label="門禁管理"
						class="btn-monitoring-overlay absolute left-32 top-2 2xl:left-36"
						@click="showAccessManageDialog = true"
					>
						門禁管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selected"
						:allowed="canOpenAssignments"
						aria-label="週曆排班"
						class="btn-monitoring-overlay absolute left-56 top-2 2xl:left-64"
						@click="showAssignmentDialog = true"
					>
						排班管理
					</PermissionActionButton>
					<PermissionActionButton
						v-show="selected"
						:allowed="canResetStatistics"
						aria-label="重置簽到統計"
						class="btn-monitoring-overlay absolute right-32 top-2 2xl:right-36"
						@click="handleResetStats"
					>
						重置統計
					</PermissionActionButton>
					<PermissionActionButton
						:allowed="true"
						aria-label="開啟完整報表"
						class="btn-monitoring-overlay absolute right-8 top-2"
						@click="handleOpenReport"
					>
						完整報表
					</PermissionActionButton>
					<MonitoringDetailShell
						:empty="!selected"
						:enlarged="isOverviewCollapsed"
						empty-title="請選擇地點"
						empty-description="請在地點管理新增時段簽到地點"
						content-class="gap-4 2xl:gap-5"
					>
						<template v-if="selected">
							<p
								v-if="activeSummary?.status === 'closed'"
								class="shrink-0 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-sm text-white/80 2xl:text-base"
								role="status"
							>
								目前為已結場快照；統計不再隨門禁名單變更。
							</p>
							<LocationStatsPanel class="shrink-0" :items="statCards" />
							<RollCallSessionSwitcher
								:model-value="selectedSessionKey"
								:sessions="selected.sessions || []"
								@update:model-value="handleSelectSession"
							/>
							<div class="flex min-h-0 min-w-0 flex-1 gap-3 2xl:gap-4">
								<RollCallGroupFilter
									v-model:selected-group-id="selectedGroupId"
									:filter-items="groupFilterItems"
									:compact="!isOverviewCollapsed"
								/>
								<RollCallAttendanceCards
									:rows="filteredAttendance"
									:session-status="activeSummary?.status ?? null"
									:empty-message="attendanceEmptyMessage"
									:compact="!isOverviewCollapsed"
								/>
							</div>
						</template>
					</MonitoringDetailShell>
				</div>
			</section>
			<aside
				class="overview-sidebar"
				:class="isOverviewCollapsed ? 'overview-sidebar--collapsed' : 'overview-sidebar--expanded'"
				:style="asideHeightStyle"
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
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
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
											'ring-2 ring-cyan-400': selectedLocationId === location.locationId
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
		<RollCallAssignmentDialog
			v-if="showAssignmentDialog"
			v-model="showAssignmentDialog"
			:location-id="selectedLocationId"
			:location-name="selected?.name"
			:allow-edit="canEditAssignments"
			@saved="handleAccessManageSynced"
		/>
		<PeopleCountingAccessManageDialog
			v-model="showAccessManageDialog"
			:location-id="selectedLocationId"
			:location-name="selected?.name"
			data-source="access_control"
			purpose="roll_call"
			:can-edit-members="canEditAccessMembers"
			:can-device-sync="canResyncAccessDevices"
			:access-sync="accessSync"
			@synced="handleAccessManageSynced"
			@members-updated="handleAccessMembersUpdated"
		/>
		<SimulationFrame v-model="showReportFrame" title="時段簽到 - 完整報表">
			<RollCallSimulation
				:sessions="reportSessions"
				:attendance="reportAttendance"
				:location-options="reportLocationOptions"
				:time-range="reportTimeRange"
				:loading="reportLoading"
				@update:time-range="handleReportTimeRangeUpdate"
			/>
		</SimulationFrame>
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
import { onScopeDispose, computed, ref } from "vue";
import MonitoringDetailShell from "~/components/common/MonitoringDetailShell.vue";
import { useMonitoringAsideHeightSync } from "~/composables/monitoring/useMonitoringAsideHeightSync";
import PermissionActionButton from "~/components/common/PermissionActionButton.vue";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import ZoneManagementDialog from "~/components/location/ZoneManagementDialog.vue";
import LocationStatsPanel from "~/components/people-counting/LocationStatsPanel.vue";
import RollCallOverviewCard from "~/components/roll-call/RollCallOverviewCard.vue";
import RollCallAttendanceCards from "~/components/roll-call/RollCallAttendanceCards.vue";
import RollCallGroupFilter from "~/components/roll-call/RollCallGroupFilter.vue";
import RollCallSessionSwitcher from "~/components/roll-call/RollCallSessionSwitcher.vue";
import RollCallSimulation from "~/components/roll-call/RollCallSimulation.vue";
import RollCallAssignmentDialog from "~/components/roll-call/RollCallAssignmentDialog.vue";
import SimulationFrame from "~/components/common/SimulationFrame.vue";
import PeopleCountingAccessManageDialog from "~/components/people-counting/PeopleCountingAccessManageDialog.vue";
import { useLocationModuleRbac, useRollCallAccessRbac } from "~/composables/core/useAccessGate";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import {
	useZoneManagement,
	ZONE_DIALOG_BATCH_SAVE_OPTIONS
} from "~/composables/location/management/useZoneManagement";
import { useRollCallLocationApi } from "~/composables/location/api/useRollCallLocationApi";
import { useRollCallApi } from "~/composables/systems/rollCall/useRollCallApi";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { useLocationApi } from "~/composables/location/api/useLocationApi";
import { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { setupDebouncedRefetchListeners } from "~/composables/websocket/useWebSocket";
import { normalizeRollCallStatLabels } from "~/utils/statLabels";
import { PERM } from "~/config/permissionCodes";
import { TOAST } from "~/config/toastCatalog";
import { ROLL_CALL_RESET_STATS_CONFIRM } from "~/utils/confirmCopy";
import { getTimeRangeUTC, isoRangeToInclusiveYmd } from "~/utils/dateUtils";
import { createRollCallRuleDraft, ruleToDraft } from "~/types/rollCall";
import type {
	RollCallAttendanceRow,
	RollCallLocation,
	RollCallReportAttendanceRow,
	RollCallReportSession,
	RollCallRuleDraft,
	RollCallSessionDetail,
	RollCallSessionSummary,
	RollCallTodayLocation,
	RollCallZone
} from "~/types/rollCall";
import { UNGROUPED_PERSON_GROUP_ID } from "~/utils/personnelUtils";

const { canManageLocation, canCreateLocation, canUpdateLocation, canDeleteLocation } =
	useLocationModuleRbac(PERM.rollCall);
const {
	canOpenAccessManage,
	canEditAccessMembers,
	canResyncAccessDevices,
	canResetStatistics,
	canOpenAssignments,
	canEditAssignments
} = useRollCallAccessRbac();

const locationApi = useRollCallLocationApi();
const rollCallApi = useRollCallApi();
const personnelApi = usePersonnelApi();
const sharedLocationApi = useLocationApi();
const { showToast } = useToast();
const { handleError: handleApiError } = useErrorHandler();
const confirmDialog = useConfirmDialog();
const showConfirmDialog = confirmDialog.showDialog;
const confirmDialogConfig = confirmDialog.config;
const accessSync = useLocationAccessSync({
	personnelApi,
	locationApi: sharedLocationApi,
	toast: {
		success: (m: string) => showToast("success", m),
		error: (m: string) => showToast("error", m)
	},
	handleApiError,
	canDeviceSync: canResyncAccessDevices
});

const zones = ref<RollCallZone[]>([]);
const todayLocations = ref<RollCallTodayLocation[]>([]);
const selectedLocationId = ref<number | null>(null);
/** 手動選班：`${ruleId}:${sessionDate}`；null＝跟主場次 */
const selectedSessionKey = ref<string | null>(null);
const detail = ref<RollCallSessionDetail | null>(null);
const previewAttendance = ref<RollCallAttendanceRow[]>([]);
const selectedGroupId = ref<number | null>(null);
const isOverviewCollapsed = ref(false);
const { detailPanelRef, asideHeightStyle } = useMonitoringAsideHeightSync();
const showLocationDialog = ref(false);
const showReportFrame = ref(false);
const showAccessManageDialog = ref(false);
const showAssignmentDialog = ref(false);
const reportLoading = ref(false);
const reportTimeRange = ref({
	startDate: "",
	endDate: "",
	preset: "today"
});
const reportSessions = ref<RollCallReportSession[]>([]);
const reportAttendance = ref<RollCallReportAttendanceRow[]>([]);

const reportLocationOptions = computed(() => {
	const opts: Array<{
		locationId: number;
		label: string;
		zoneName: string;
		locationName: string;
		statLabels?: { expected?: string; present?: string; absent?: string };
	}> = [];
	for (const zone of zones.value) {
		for (const loc of zone.locations || []) {
			const locationId = loc.id != null ? Number(loc.id) : NaN;
			if (!Number.isFinite(locationId) || locationId <= 0) continue;
			const zoneName = zone.name || "";
			const locationName = loc.name || "";
			opts.push({
				locationId,
				label: [zoneName, locationName].filter(Boolean).join("-") || String(locationId),
				zoneName,
				locationName,
				statLabels: loc.statLabels
			});
		}
	}
	return opts;
});

const loadReport = async () => {
	reportLoading.value = true;
	try {
		const { startDate, endDate } = isoRangeToInclusiveYmd(
			reportTimeRange.value.startDate,
			reportTimeRange.value.endDate
		);
		const res = await rollCallApi.getReport({ startDate, endDate });
		reportSessions.value = res.sessions || [];
		reportAttendance.value = res.attendance || [];
	} catch (error) {
		handleApiError(error, "載入完整報表失敗");
		reportSessions.value = [];
		reportAttendance.value = [];
	} finally {
		reportLoading.value = false;
	}
};

const handleOpenReport = async () => {
	const { start, end } = getTimeRangeUTC("today");
	reportTimeRange.value = {
		startDate: start.toISOString(),
		endDate: end.toISOString(),
		preset: "today"
	};
	showReportFrame.value = true;
	await loadReport();
};

const handleReportTimeRangeUpdate = (v: { startDate: string; endDate: string; preset: string }) => {
	reportTimeRange.value = v;
	void loadReport();
};

const sessionKeyOf = (session: RollCallSessionSummary) =>
	`${session.ruleId}:${session.sessionDate}`;

const pickPrimarySession = (sessions: RollCallSessionSummary[] = []) =>
	sessions.find(item => item.status === "open") ||
	sessions.find(item => item.status === "closed") ||
	sessions[0] ||
	null;

const selected = computed(
	() => todayLocations.value.find(item => item.locationId === selectedLocationId.value) || null
);

const activeSummary = computed(() => {
	const sessions = selected.value?.sessions || [];
	if (selectedSessionKey.value) {
		const picked = sessions.find(item => sessionKeyOf(item) === selectedSessionKey.value);
		if (picked) return picked;
	}
	return pickPrimarySession(sessions);
});

const statCards = computed(() => {
	const labels = normalizeRollCallStatLabels(selected.value?.statLabels);
	return [
		{ label: labels.expected, value: activeSummary.value?.expectedCount ?? 0 },
		{ label: labels.present, value: activeSummary.value?.presentCount ?? 0 },
		{ label: labels.absent, value: activeSummary.value?.absentCount ?? 0 }
	];
});

const attendanceEmptyMessage = computed(() => {
	if (activeSummary.value?.status === "not_started") {
		return previewAttendance.value.length === 0 ? "時段尚未開始，尚無應到預覽" : "時段尚未開始";
	}
	if (!activeSummary.value) return "今日無簽到時段";
	if (selectedGroupId.value != null && filteredAttendance.value.length === 0) {
		return "此檢視群組尚無人員";
	}
	return "尚無簽到紀錄";
});

const attendanceRows = computed((): RollCallAttendanceRow[] => {
	if (activeSummary.value?.status === "not_started") return previewAttendance.value;
	return detail.value?.attendance || [];
});

const filteredAttendance = computed(() => {
	const rows = attendanceRows.value;
	const filtered =
		selectedGroupId.value == null
			? [...rows]
			: rows.filter(row => (row.groupId ?? UNGROUPED_PERSON_GROUP_ID) === selectedGroupId.value);
	// 已簽到（present）優先；其餘維持原相對順序
	return filtered.sort((a, b) => {
		const rank = (status: RollCallAttendanceRow["status"]) => {
			if (status === "present") return 0;
			if (status === "leave") return 2;
			return 1;
		};
		return rank(a.status) - rank(b.status);
	});
});

const groupFilterItems = computed(() => {
	const rows = attendanceRows.value;
	const tallies = new Map<number, { name: string; presentCount: number; totalCount: number }>();
	for (const row of rows) {
		const id = row.groupId ?? UNGROUPED_PERSON_GROUP_ID;
		const cur = tallies.get(id) || {
			name: row.groupName || "未分組",
			presentCount: 0,
			totalCount: 0
		};
		if (row.status !== "leave") cur.totalCount += 1;
		if (row.status === "present") cur.presentCount += 1;
		tallies.set(id, cur);
	}

	const units = selected.value?.units || [];
	const primary = pickPrimarySession(selected.value?.sessions || []);
	const viewingPrimary =
		!primary ||
		!activeSummary.value ||
		sessionKeyOf(primary) === sessionKeyOf(activeSummary.value);
	// 有出勤列或非主場次：以目前場次名單計數（today.units 僅對齊主場次）
	const items =
		rows.length > 0 || !viewingPrimary || units.length === 0
			? [...tallies.entries()]
					.sort(([a], [b]) => {
						if (a === UNGROUPED_PERSON_GROUP_ID) return 1;
						if (b === UNGROUPED_PERSON_GROUP_ID) return -1;
						return (tallies.get(a)?.name || "").localeCompare(
							tallies.get(b)?.name || "",
							"zh-Hant"
						);
					})
					.map(([id, t]) => ({
						id,
						name: t.name,
						presentCount: t.presentCount,
						totalCount: t.totalCount
					}))
			: units.map(unit => {
					const t = tallies.get(unit.id);
					return {
						id: unit.id,
						name: unit.name,
						presentCount: t?.presentCount ?? unit.currentCount ?? 0,
						totalCount: t?.totalCount ?? unit.totalCount ?? 0
					};
				});

	const allPresent = items.reduce((sum, item) => sum + item.presentCount, 0);
	const allTotal = items.reduce((sum, item) => sum + item.totalCount, 0);
	return [
		{
			id: null as number | null,
			name: "全部",
			presentCount: rows.length > 0 ? rows.filter(r => r.status === "present").length : allPresent,
			totalCount: rows.length > 0 ? rows.filter(r => r.status !== "leave").length : allTotal
		},
		...items
	];
});

const attachRulesToZones = (
	zoneList: RollCallZone[],
	rules: Awaited<ReturnType<typeof rollCallApi.listRules>>["rules"]
): RollCallZone[] => {
	const byLocation = new Map<number, RollCallRuleDraft[]>();
	for (const rule of rules || []) {
		const list = byLocation.get(rule.locationId) || [];
		list.push(ruleToDraft(rule));
		byLocation.set(rule.locationId, list);
	}
	return (zoneList || []).map(zone => ({
		...zone,
		locations: (zone.locations || []).map(loc => {
			const locId = Number(loc.id);
			const existing = Number.isFinite(locId) ? byLocation.get(locId) || [] : loc.rules || [];
			return {
				...loc,
				rules: existing.length > 0 ? existing : [createRollCallRuleDraft({ name: "規則 1" })]
			};
		})
	}));
};

const loadZones = async () => {
	const [zoneRes, ruleRes] = await Promise.all([locationApi.getZones(), rollCallApi.listRules()]);
	zones.value = attachRulesToZones(zoneRes.zones || [], ruleRes.rules || []);
};

const persistLocationRules = async (
	savedLocations: RollCallLocation[],
	draftRulesByIndex: RollCallRuleDraft[][]
) => {
	const saved: Awaited<ReturnType<typeof rollCallApi.listRules>>["rules"] = [];
	for (let i = 0; i < savedLocations.length; i++) {
		const locId = Number(savedLocations[i]?.id);
		if (!Number.isFinite(locId) || locId <= 0) continue;
		const drafts = draftRulesByIndex[i] || [];
		const res = await rollCallApi.replaceLocationRules(locId, drafts);
		saved.push(...(res.rules || []));
	}
	return saved;
};

const loadSessionDetail = async (summary: RollCallSessionSummary | null) => {
	previewAttendance.value = [];
	if (!summary) {
		detail.value = null;
		return;
	}
	if (summary.status === "not_started" || summary.id == null) {
		detail.value = null;
		const locationId = selectedLocationId.value;
		if (locationId == null) return;
		try {
			const preview = await rollCallApi.getExpectedRoster(locationId, {
				ruleId: summary.ruleId,
				date: summary.sessionDate
			});
			previewAttendance.value = preview.attendance || [];
		} catch (error) {
			handleApiError(error, "載入應到預覽失敗");
			previewAttendance.value = [];
		}
		return;
	}
	const res = await rollCallApi.getSession(summary.id);
	detail.value = res.session;
};

const syncSelectedSessionKey = () => {
	const sessions = selected.value?.sessions || [];
	if (sessions.length === 0) {
		selectedSessionKey.value = null;
		return;
	}
	if (
		selectedSessionKey.value &&
		sessions.some(item => sessionKeyOf(item) === selectedSessionKey.value)
	) {
		return;
	}
	const primary = pickPrimarySession(sessions);
	selectedSessionKey.value = primary ? sessionKeyOf(primary) : null;
};

const loadToday = async () => {
	const res = await rollCallApi.getToday();
	todayLocations.value = res.locations || [];
	if (
		selectedLocationId.value == null ||
		!todayLocations.value.some(item => item.locationId === selectedLocationId.value)
	) {
		selectedLocationId.value = todayLocations.value[0]?.locationId ?? null;
		selectedGroupId.value = null;
		selectedSessionKey.value = null;
	}
	syncSelectedSessionKey();
	await loadSessionDetail(activeSummary.value);
};

const handleSelectLocation = async (locationId: number) => {
	selectedLocationId.value = locationId;
	selectedGroupId.value = null;
	selectedSessionKey.value = null;
	syncSelectedSessionKey();
	await loadSessionDetail(activeSummary.value);
};

const handleSelectSession = async (key: string) => {
	if (selectedSessionKey.value === key) return;
	selectedSessionKey.value = key;
	selectedGroupId.value = null;
	await loadSessionDetail(activeSummary.value);
};

const handleResetStats = () => {
	if (!selected.value) return;
	confirmDialog.show(ROLL_CALL_RESET_STATS_CONFIRM);
};

const handleConfirmResetStats = async () => {
	if (!selectedLocationId.value) return;
	try {
		await rollCallApi.resetLocationStats(selectedLocationId.value);
		showToast("success", TOAST.ROLL_CALL_RESET);
		await loadToday();
	} catch (error) {
		showToast("error", error instanceof Error ? error.message : TOAST.STATS_RESET_FAILED);
	}
};

const handleAccessManageSynced = async () => {
	await loadToday();
};

const handleAccessMembersUpdated = async () => {
	await loadToday();
	const expected = activeSummary.value?.expectedCount ?? 0;
	showToast("success", `${TOAST.ROLL_CALL_MEMBERS_ALIGNED}（應到 ${expected}）`);
};

const { handleSaveZone: baseHandleSaveZone, handleDeleteZone: baseHandleDeleteZone } =
	useZoneManagement<RollCallLocation, RollCallZone>();

const handleSaveZone = async (zone: RollCallZone) => {
	const draftRulesByIndex = (zone.locations || []).map(loc => loc.rules || []);
	await baseHandleSaveZone(
		zone,
		zones,
		async (item: RollCallZone) => {
			const isValidId = item.id && !item.id.startsWith("temp-") && /^\d+$/.test(item.id);
			const result = isValidId
				? await locationApi.updateZone(item.id!, {
						name: item.name,
						sortOrder: item.sortOrder,
						locations: item.locations
					})
				: await locationApi.createZone({
						name: item.name,
						sortOrder: item.sortOrder,
						locations: item.locations
					});
			const savedZone = {
				...result.zone,
				id: result.zone.id || item.id
			} as RollCallZone & { id: string };
			const savedRules = await persistLocationRules(savedZone.locations || [], draftRulesByIndex);
			const withRules = attachRulesToZones([savedZone], savedRules)[0];
			return {
				merged: result.merged,
				message: result.message,
				zone: withRules as RollCallZone & { id: string }
			};
		},
		{ ...ZONE_DIALOG_BATCH_SAVE_OPTIONS }
	);
};

const handleDeleteZone = async (zoneId: string) => {
	await baseHandleDeleteZone(zoneId, zones, locationApi.deleteZone, {
		systemType: "roll_call",
		onAfterDelete: async () => {
			await loadZones();
			await loadToday();
		}
	});
};

const handleZonesSaved = async () => {
	await loadZones();
	await loadToday();
};

const cleanupWebSocket = setupDebouncedRefetchListeners(
	() => loadToday(),
	[{ event: "people-counting:access-control:event" }],
	500,
	"RollCall"
);
onScopeDispose(cleanupWebSocket);

onMounted(() => {
	void loadZones();
	void loadToday();
});
</script>
