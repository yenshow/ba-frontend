<template>
	<DeviceManageDialogShell
		:model-value="modelValue"
		title="週曆排班"
		:title-meta="locationName"
		title-id="roll-call-assignment-title"
		panel-max-width-class="max-w-[92vw] 2xl:max-w-[96rem]"
		:is-ui-locked="saving || importing"
		@close="handleClose"
	>
		<template #header-actions>
			<FormChangeIndicator
				:has-changes="isDirty"
				:changed-fields="[]"
				message="有未儲存的變更"
			/>
		</template>

		<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

		<div v-else class="flex min-h-0 flex-1 flex-col gap-4">
			<p v-if="rules.length === 0 && !loading" class="text-sm text-amber-200/90">
				請先於地點管理新增時段規則（班別）後再排班
			</p>

			<div
				class="flex min-h-0 flex-1 flex-col rounded-xl border border-white/15 bg-white/5 p-4 2xl:p-5"
			>
				<div class="grid min-h-0 flex-1 grid-cols-12 items-stretch gap-4 2xl:gap-5">
					<PersonnelGroupBrowseTree
						:group-tree="groupTree"
						:selected-child-id="selectedChildGroupId"
						:member-count-by-child-id="memberCountByChildId"
						:loading="isGroupTreeLoading"
						:error="groupTreeError"
						:show-ungrouped="hasUngroupedCandidates"
						:panel-height-class="LOCATION_MEMBERS_PANEL_HEIGHT"
						@select-child="handleSelectChildGroup"
					/>

					<section
						class="col-span-12 flex min-h-0 flex-col lg:col-span-8"
						:class="LOCATION_MEMBERS_PANEL_HEIGHT"
					>
						<div class="mb-3 flex flex-nowrap items-end gap-2 overflow-x-auto">
							<label class="flex w-[14.5rem] shrink-0 flex-col gap-1 text-sm text-white/70 2xl:text-base">
								<span class="inline-flex items-center gap-2">
									排班週次
									<span
										v-if="loading"
										class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/75"
										aria-hidden="true"
									/>
								</span>
								<select
									class="form-input-small form-select w-full"
									:disabled="busy"
									:value="weekStart"
									aria-label="選擇排班週次"
									@change="handleWeekSelect"
								>
									<option v-for="option in weekOptions" :key="option.value" :value="option.value">
										{{ option.label }}
									</option>
								</select>
							</label>
							<label class="flex min-w-0 flex-1 flex-col gap-1 text-sm text-white/70 2xl:text-base">
								搜尋工號／姓名
								<input
									id="roll-call-assignment-members-search"
									v-model="membersQuery"
									type="search"
									class="form-input-small min-w-0"
									:disabled="busy"
									aria-label="搜尋工號或姓名"
									@keydown.enter.prevent="handleSearch"
								/>
							</label>
							<button type="button" class="btn-secondary shrink-0" :disabled="busy" @click="handleSearch">
								搜尋
							</button>
							<div class="mx-0.5 h-8 w-px shrink-0 bg-white/20" aria-hidden="true" />
							<button
								type="button"
								class="btn-secondary shrink-0"
								:disabled="busy"
								@click="handleDownloadTemplate"
							>
								{{ downloadingTemplate ? "下載中..." : "下載 Excel 範本" }}
							</button>
							<input
								ref="excelInputRef"
								type="file"
								accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								class="hidden"
								aria-label="匯入排班 Excel"
								@change="handleImportFile"
							/>
							<button
								type="button"
								class="btn-secondary shrink-0"
								:disabled="busy"
								@click="excelInputRef?.click()"
							>
								{{ importing ? "匯入中..." : "匯入 Excel" }}
							</button>
						</div>

						<div
							ref="tableScrollRef"
							class="show-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10"
							role="region"
							aria-label="週曆排班表"
							:aria-busy="loading || importing"
						>
							<table
								class="w-full table-fixed border-collapse text-base text-white/90 transition-opacity duration-200"
								:class="tableDimmed ? 'pointer-events-none opacity-40' : 'opacity-100'"
							>
								<colgroup>
									<col class="w-[11%]" />
									<col class="w-[11%]" />
									<col v-for="day in DAY_KEYS" :key="`col-${day}`" class="w-[11.14%]" />
								</colgroup>
								<thead class="sticky top-0 z-10 bg-[#0a2a3d]">
									<tr class="border-b border-white/15 text-left text-white/70">
										<th class="px-2 py-2 font-medium">工號</th>
										<th class="px-2 py-2 font-medium">姓名</th>
										<th
											v-for="(day, index) in DAY_KEYS"
											:key="day"
											class="px-1 py-2 text-center font-medium"
										>
											<div>{{ day }}</div>
											<div
												:key="`${weekStart}-${day}`"
												class="text-sm font-normal text-white/45 transition-opacity duration-200"
											>
												{{ addDaysYmd(weekStart, index).slice(5) }}
											</div>
										</th>
									</tr>
								</thead>
								<tbody>
									<tr v-if="showInitialLoading">
										<td :colspan="9" class="px-3 py-10 text-center text-white/50">載入中…</td>
									</tr>
									<tr v-else-if="!loading && pagedRows.length === 0">
										<td :colspan="9" class="px-3 py-10 text-center text-white/50">
											{{ members.length === 0 ? "此地點尚無門禁名單人員" : "目前篩選無人員，請改群組或搜尋" }}
										</td>
									</tr>
									<tr
										v-for="row in pagedRows"
										:key="row.personId"
										class="border-b border-white/10 hover:bg-white/5"
									>
										<td
											class="truncate px-2 py-1.5 font-mono text-sm 2xl:text-base"
											:title="row.employeeNo || undefined"
										>
											{{ row.employeeNo || "—" }}
										</td>
										<td
											class="truncate px-2 py-1.5 text-sm 2xl:text-base"
											:title="row.fullName || undefined"
										>
											{{ row.fullName || "—" }}
										</td>
										<td v-for="day in DAY_KEYS" :key="`${row.personId}-${day}`" class="px-1 py-1">
											<select
												class="form-input-small form-select roll-call-day-select w-full"
												:aria-label="`${row.employeeNo || row.fullName} ${day} 班別`"
												:disabled="busy || !canEdit"
												:value="ruleSelectValue(row.days[day])"
												@change="handleDayChange(row.personId, day, $event)"
											>
												<option value="">休</option>
												<option v-for="rule in rules" :key="rule.id" :value="String(rule.id)">
													{{ rule.name }}
												</option>
											</select>
										</td>
									</tr>
								</tbody>
							</table>
							<div
								v-if="tableDimmed"
								class="pointer-events-none absolute inset-0 flex items-center justify-center"
								aria-hidden="true"
							>
								<div
									class="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white/80"
								/>
							</div>
						</div>

						<div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/55">
							<span>
								顯示 {{ pageRangeLabel }}／共 {{ filteredRows.length
								}}{{ filteredRows.length !== rows.length ? `（名單 ${rows.length}）` : "" }}
							</span>
							<div class="flex items-center gap-2">
								<button
									type="button"
									class="btn-secondary"
									:disabled="busy || page <= 1"
									aria-label="上一頁"
									@click="page -= 1"
								>
									上一頁
								</button>
								<span class="tabular-nums">{{ page }}／{{ totalPages }}</span>
								<button
									type="button"
									class="btn-secondary"
									:disabled="busy || page >= totalPages"
									aria-label="下一頁"
									@click="page += 1"
								>
									下一頁
								</button>
							</div>
						</div>
					</section>
				</div>

				<p v-if="loadError" class="form-error-text mt-3" role="alert">
					{{ loadError }}
				</p>
			</div>

			<footer class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-white/55">
					每人每日一格；空週預設第一個班別，可改休（休假仍顯示、不計應到）。須「儲存本週」後主畫面才生效。大量調班用群組／搜尋／分頁或 Excel。
				</p>
				<div class="flex gap-3">
					<button type="button" class="btn-secondary" :disabled="busy" @click="handleClose">取消</button>
					<button
						type="button"
						class="btn-primary"
						:disabled="busy || rules.length === 0 || rows.length === 0"
						@click="handleSave"
					>
						{{ saving ? "儲存中..." : "儲存本週" }}
					</button>
				</div>
			</footer>
		</div>
	</DeviceManageDialogShell>

	<ConfirmDialog
		v-model="showDiscardDialog"
		:title="discardDialogConfig.title"
		:message="discardDialogConfig.message"
		:details="discardDialogConfig.details"
		:type="discardDialogConfig.type"
		@confirm="handleDiscardConfirm"
		@cancel="handleDiscardCancel"
	/>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Person } from "~/types/personnel";
import type {
	RollCallAssignmentDayKey,
	RollCallAssignmentRowDraft,
	RollCallRule
} from "~/types/rollCall";
import ConfirmDialog from "~/components/common/ConfirmDialog.vue";
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue";
import DeviceManageDialogShell from "~/components/personnel/device-sync/DeviceManageDialogShell.vue";
import PersonnelGroupBrowseTree from "~/components/personnel/PersonnelGroupBrowseTree.vue";
import { useConfirmDialog } from "~/composables/core/useConfirmDialog";
import { LOCATION_MEMBERS_PANEL_HEIGHT } from "~/composables/systems/personnel/useLocationMembersStep";
import { useRollCallApi } from "~/composables/systems/rollCall/useRollCallApi";
import { usePersonnelApi } from "~/composables/systems/personnel/usePersonnelApi";
import { usePersonnelCandidateGroupFilter } from "~/composables/systems/personnel/usePersonnelCandidateGroupFilter";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { FORM_UNSAVED_CLOSE_CONFIRM } from "~/utils/formDialog";
import { fetchAllPaged } from "~/utils/pagingUtils";
import { ALL_PERSON_GROUP_FILTER_ID } from "~/utils/personnelUtils";

const DAY_KEYS: RollCallAssignmentDayKey[] = ["一", "二", "三", "四", "五", "六", "日"];
const PAGE_SIZE = 50;
const WEEKDAY_OFFSET: Record<string, number> = {
	Mon: 0,
	Tue: 1,
	Wed: 2,
	Thu: 3,
	Fri: 4,
	Sat: 5,
	Sun: 6,
};

const formatYmdUtc = (date: Date) => {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
};

const addDaysYmd = (ymd: string, delta: number) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) return ymd;
	const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta);
	return formatYmdUtc(new Date(utc));
};

const addMonthsYmd = (ymd: string, deltaMonths: number) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) return ymd;
	const utc = Date.UTC(
		Number(match[1]),
		Number(match[2]) - 1 + deltaMonths,
		Number(match[3]),
	);
	return formatYmdUtc(new Date(utc));
};

/** 日字串（UTC 曆日）對齊到該週週一 */
const mondayOfYmd = (ymd: string) => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) return ymd;
	const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
	const dow = new Date(utc).getUTCDay(); // 0=Sun … 1=Mon
	const delta = dow === 0 ? -6 : 1 - dow;
	return addDaysYmd(ymd, delta);
};

const todayYmdTaipei = () => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Taipei",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
	return `${get("year")}-${get("month")}-${get("day")}`;
};

const mondayOf = (date: Date) => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Taipei",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		weekday: "short",
	}).formatToParts(date);
	const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
	return addDaysYmd(
		`${get("year")}-${get("month")}-${get("day")}`,
		-(WEEKDAY_OFFSET[get("weekday")] ?? 0),
	);
};

const serializeRows = (list: RollCallAssignmentRowDraft[]) =>
	list
		.map(row => {
			const days = DAY_KEYS.map(day => `${day}:${row.days[day] ?? ""}`).join(",");
			return `${row.personId}|${days}`;
		})
		.join(";");

const ruleSelectValue = (ruleId: number | null) => (ruleId == null ? "" : String(ruleId));

const props = defineProps<{
	modelValue: boolean;
	locationId: number | null;
	locationName?: string;
}>();

const emit = defineEmits<{
	"update:modelValue": [value: boolean];
	saved: [];
}>();

const rollCallApi = useRollCallApi();
const personnelApi = usePersonnelApi();
const { showToast } = useToast();
const { handleError: handleApiError } = useErrorHandler();
const discardDialog = useConfirmDialog();
const showDiscardDialog = discardDialog.showDialog;
const discardDialogConfig = discardDialog.config;

const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const downloadingTemplate = ref(false);
const loadError = ref<string | null>(null);
const rules = ref<RollCallRule[]>([]);
const members = ref<Person[]>([]);
const rows = ref<RollCallAssignmentRowDraft[]>([]);
const weekStart = ref(mondayOf(new Date()));
const membersQuery = ref("");
const searchApplied = ref("");
const page = ref(1);
const baselineSerialized = ref("");
const excelInputRef = ref<HTMLInputElement | null>(null);
const tableScrollRef = ref<HTMLElement | null>(null);
const pendingDiscardAction = ref<null | (() => void)>(null);

const {
	groupTree,
	isGroupTreeLoading,
	groupTreeError,
	selectedChildGroupId,
	memberCountByChildId,
	hasUngroupedCandidates,
	groupFilteredCandidates,
	selectChildGroup,
	prepareGroupFilter
} = usePersonnelCandidateGroupFilter({ candidates: members });

const weekEnd = computed(() => addDaysYmd(weekStart.value, 6));
const busy = computed(
	() => loading.value || saving.value || importing.value || downloadingTemplate.value
);
const canEdit = computed(() => !busy.value && rules.value.length > 0);
const isDirty = computed(() => serializeRows(rows.value) !== baselineSerialized.value);
/** 首次／無資料時的整表載入文案；切週時改淡出＋轉圈，避免表格閃掉 */
const showInitialLoading = computed(() => loading.value && rows.value.length === 0);
const tableDimmed = computed(
	() => (loading.value || importing.value) && rows.value.length > 0
);

const scrollTableToTop = () => {
	const el = tableScrollRef.value;
	if (el) el.scrollTop = 0;
};

/** 例：2026/11/02–11/08（比完整 yyyy-mm-dd 短，避免下拉被截斷） */
const formatWeekLabel = (start: string) => {
	const end = addDaysYmd(start, 6);
	return `${start.replace(/-/g, "/")}–${end.slice(5).replace("-", "/")}`;
};

const weekOptions = computed(() => {
	const today = todayYmdTaipei();
	// 本週起往後兩個月（不含過去週）
	const minStart = mondayOfYmd(today);
	const maxStart = mondayOfYmd(addMonthsYmd(today, 2));
	const byValue = new Map<string, string>();
	let cursor = minStart;
	while (cursor <= maxStart) {
		byValue.set(cursor, formatWeekLabel(cursor));
		cursor = addDaysYmd(cursor, 7);
	}
	// 目前選取若不在範圍內仍顯示，避免受控 select 空白
	if (!byValue.has(weekStart.value)) {
		byValue.set(weekStart.value, formatWeekLabel(weekStart.value));
	}
	return [...byValue.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([value, label]) => ({ value, label }));
});

const filteredMembers = computed(() => {
	const q = searchApplied.value.trim().toLowerCase();
	const list = groupFilteredCandidates.value;
	if (!q) return list;
	return list.filter(person => {
		const no = String(person.employee_no || "").toLowerCase();
		const name = String(person.full_name || "").toLowerCase();
		return no.includes(q) || name.includes(q);
	});
});

const filteredRows = computed(() => {
	const allowed = new Set(filteredMembers.value.map(person => person.id));
	return rows.value.filter(row => allowed.has(row.personId));
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));

const pagedRows = computed(() => {
	const start = (page.value - 1) * PAGE_SIZE;
	return filteredRows.value.slice(start, start + PAGE_SIZE);
});

const pageRangeLabel = computed(() => {
	if (filteredRows.value.length === 0) return "0–0";
	const start = (page.value - 1) * PAGE_SIZE + 1;
	const end = Math.min(page.value * PAGE_SIZE, filteredRows.value.length);
	return `${start}–${end}`;
});

const syncBaseline = () => {
	baselineSerialized.value = serializeRows(rows.value);
};

const requestDiscardOrRun = (action: () => void) => {
	if (!isDirty.value) {
		action();
		return;
	}
	pendingDiscardAction.value = action;
	discardDialog.show(FORM_UNSAVED_CLOSE_CONFIRM);
};

const handleDiscardConfirm = () => {
	const action = pendingDiscardAction.value;
	pendingDiscardAction.value = null;
	discardDialog.hide();
	action?.();
};

const handleDiscardCancel = () => {
	pendingDiscardAction.value = null;
	discardDialog.hide();
};

const handleClose = () => {
	if (saving.value || importing.value) return;
	requestDiscardOrRun(() => emit("update:modelValue", false));
};

const handleWeekSelect = (event: Event) => {
	const select = event.target as HTMLSelectElement;
	const next = select.value;
	if (!next || next === weekStart.value) return;
	// 先還原選單；確認放棄後才真正換週（避免取消後畫面／資料不一致）
	select.value = weekStart.value;
	requestDiscardOrRun(() => {
		weekStart.value = next;
	});
};

const handleSearch = () => {
	searchApplied.value = membersQuery.value;
	page.value = 1;
	scrollTableToTop();
};

const handleSelectChildGroup = (childId: number) => {
	selectChildGroup(childId);
	page.value = 1;
	scrollTableToTop();
};

const handleDayChange = (personId: number, day: RollCallAssignmentDayKey, event: Event) => {
	const raw = (event.target as HTMLSelectElement).value;
	const nextRuleId = raw === "" ? null : Number(raw);
	rows.value = rows.value.map(row => {
		if (row.personId !== personId) return row;
		return { ...row, days: { ...row.days, [day]: nextRuleId } };
	});
};

/** 本週尚無排班列：缺日＝第一個班別；已有排班：缺日＝休 */
const buildRowsFromMembers = (
	memberList: Person[],
	assignmentByKey: Map<string, number>,
	start: string,
	fallbackRuleId: number | null
): RollCallAssignmentRowDraft[] => {
	const missingFallback = assignmentByKey.size === 0 ? fallbackRuleId : null;
	return memberList.map(person => {
		const days = {} as RollCallAssignmentRowDraft["days"];
		DAY_KEYS.forEach((day, index) => {
			const ruleId = assignmentByKey.get(`${person.id}:${addDaysYmd(start, index)}`);
			days[day] = ruleId != null ? ruleId : missingFallback;
		});
		return {
			personId: person.id,
			employeeNo: String(person.employee_no || ""),
			fullName: String(person.full_name || ""),
			days
		};
	});
};

const loadData = async () => {
	if (!props.locationId) return;
	loading.value = true;
	loadError.value = null;
	try {
		const [rulesRes, memberRows, assignmentsRes] = await Promise.all([
			rollCallApi.listRules(props.locationId),
			fetchAllPaged(params =>
				personnelApi.getLocationMembers(props.locationId!, {
					...params,
					status: "active"
				})
			),
			rollCallApi.listAssignments(props.locationId, weekStart.value, weekEnd.value)
		]);
		rules.value = rulesRes.rules || [];
		members.value = (memberRows || []) as Person[];
		const assignmentByKey = new Map<string, number>();
		for (const item of assignmentsRes.assignments || []) {
			assignmentByKey.set(`${item.personId}:${item.assignmentDate}`, Number(item.ruleId));
		}
		rows.value = buildRowsFromMembers(
			members.value,
			assignmentByKey,
			weekStart.value,
			rules.value[0]?.id ?? null
		);
		syncBaseline();
		await prepareGroupFilter();
		selectedChildGroupId.value = ALL_PERSON_GROUP_FILTER_ID;
		searchApplied.value = "";
		membersQuery.value = "";
		page.value = 1;
	} catch (error) {
		members.value = [];
		rules.value = [];
		rows.value = [];
		syncBaseline();
		loadError.value = "載入排班資料失敗，請稍後再試";
		handleApiError(error, "載入排班資料失敗，請稍後再試");
	} finally {
		loading.value = false;
	}
};

const handleSave = async () => {
	if (!props.locationId) return;
	saving.value = true;
	try {
		const assignments: Array<{
			personId: number;
			assignmentDate: string;
			ruleId: number;
		}> = [];
		for (const row of rows.value) {
			DAY_KEYS.forEach((day, index) => {
				const ruleId = row.days[day];
				if (ruleId == null || !Number.isFinite(ruleId)) return;
				assignments.push({
					personId: row.personId,
					assignmentDate: addDaysYmd(weekStart.value, index),
					ruleId
				});
			});
		}
		await rollCallApi.replaceAssignments(props.locationId, {
			startDate: weekStart.value,
			endDate: weekEnd.value,
			assignments
		});
		syncBaseline();
		showToast("success", "本週排班已儲存");
		emit("saved");
		emit("update:modelValue", false);
	} catch (error) {
		handleApiError(error, "儲存排班失敗，請稍後再試");
	} finally {
		saving.value = false;
	}
};

const handleDownloadTemplate = async () => {
	if (!props.locationId) return;
	downloadingTemplate.value = true;
	try {
		const blob = await rollCallApi.downloadAssignmentTemplate(props.locationId);
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "roll_call_assignments_template.xlsx";
		anchor.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		handleApiError(error, "下載排班範本失敗，請稍後再試");
	} finally {
		downloadingTemplate.value = false;
	}
};

const handleImportFile = async (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file || !props.locationId) return;
	const runImport = async () => {
		importing.value = true;
		try {
			const form = new FormData();
			form.append("excel", file);
			await rollCallApi.importAssignments(props.locationId!, form);
			showToast("success", "排班已匯入");
			await loadData();
			emit("saved");
		} catch (error) {
			handleApiError(error, "匯入排班失敗，請稍後再試");
		} finally {
			importing.value = false;
		}
	};
	if (!isDirty.value) {
		await runImport();
		return;
	}
	pendingDiscardAction.value = () => {
		void runImport();
	};
	discardDialog.show(FORM_UNSAVED_CLOSE_CONFIRM);
};

watch(
	() => filteredRows.value.length,
	() => {
		if (page.value > totalPages.value) page.value = totalPages.value;
	}
);

watch(page, () => {
	scrollTableToTop();
});

watch(
	() => [props.modelValue, props.locationId, weekStart.value] as const,
	([open]) => {
		if (open && props.locationId) {
			scrollTableToTop();
			void loadData();
		}
	},
	{ immediate: true }
);
</script>

<style scoped>
/* 沿用 form-input-small 字級，僅收左右 padding 並留箭頭空間 */
.roll-call-day-select {
	box-sizing: border-box;
	min-width: 0;
	max-width: 100%;
	padding-right: 1.65rem;
	padding-left: 0.55rem;
}
</style>
