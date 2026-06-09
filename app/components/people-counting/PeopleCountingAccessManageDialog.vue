<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="pc-access-manage-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
					:aria-busy="isUiLocked || undefined"
				>
					<header class="flex flex-wrap items-start justify-between gap-3 pr-7 2xl:pr-8">
						<div class="min-w-0">
							<h3
								id="pc-access-manage-title"
								class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								門禁管理
							</h3>
							<p v-if="locationName" class="mt-1 truncate text-sm text-white/70 2xl:text-base">
								{{ locationName }}
							</p>
							<div
								v-if="locationId != null"
								class="mt-2 flex flex-wrap gap-2 text-xs text-white/75 2xl:text-sm"
							>
								<span
									v-for="name in deviceLabels.entry"
									:key="`entry-${name}`"
									class="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5"
								>
									入口：{{ name }}
								</span>
								<span
									v-for="name in deviceLabels.exit"
									:key="`exit-${name}`"
									class="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5"
								>
									出口：{{ name }}
								</span>
							</div>
						</div>
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

					<div class="flex gap-2 pr-7 2xl:pr-8">
						<button
							v-for="tab in tabs"
							:key="tab.id"
							type="button"
							class="rounded-lg border px-4 py-2 text-sm transition-colors 2xl:text-base"
							:class="
								activeTab === tab.id
									? 'border-cyan-400/60 bg-cyan-500/20 text-white'
									: 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
							"
							:aria-selected="activeTab === tab.id"
							role="tab"
							@click="activeTab = tab.id"
						>
							{{ tab.label }}
						</button>
					</div>

					<div class="show-scrollbar relative min-h-[320px] flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div v-if="locationId == null" class="py-12 text-center text-white/60">請先選擇地點</div>

						<div v-else-if="activeTab === 'members'" class="space-y-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<h4 class="text-sm font-medium text-white/85 2xl:text-base">地點名單</h4>
								<span class="text-xs text-white/60 2xl:text-sm">
									已選 {{ selectedCount }} 人
								</span>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									class="btn-secondary text-xs 2xl:text-sm"
									:disabled="candidates.length === 0 || !canEdit"
									@click="handleToggleSelectAllMembersPage"
								>
									{{ isAllMembersPageKept ? "取消全選" : "全選" }}
								</button>
								<input
									v-model="candidatesQuery"
									type="text"
									class="form-input w-full md:max-w-[220px]"
									placeholder="搜尋 ID / 姓名"
									aria-label="搜尋可選人員"
									@keydown.enter="handleSearchCandidates"
								/>
								<button type="button" class="btn-secondary text-xs 2xl:text-sm" @click="handleSearchCandidates">
									搜尋
								</button>
							</div>
							<div v-if="isLoadingMembers" class="py-8 text-center text-white/60">載入中…</div>
							<div
								v-else
								class="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto"
							>
								<label
									v-for="p in candidates"
									:key="p.id"
									class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
								>
									<span class="flex min-w-0 items-center gap-2">
										<input
											:checked="isMemberKept(p.id)"
											type="checkbox"
											class="h-4 w-4 accent-cyan-400"
											:disabled="!canEdit || isApplying"
											@change="toggleKeepMember(p.id, $event)"
										/>
										<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
											<span class="font-mono">{{ p.employee_no }}</span>
											<span class="ms-2">{{ p.full_name || "—" }}</span>
										</span>
									</span>
								</label>
							</div>
							<p v-if="membersError" class="text-sm text-rose-300" role="alert">{{ membersError }}</p>
							<p v-else-if="membersSuccess" class="text-sm text-emerald-200" role="status">
								{{ membersSuccess }}
							</p>
							<div class="flex justify-end">
								<PermissionActionButton
									:allowed="canEdit && !isApplying"
									class="btn-primary"
									aria-label="套用名單變更"
									@click="handleApplyMembers"
								>
									{{ isApplying ? "處理中…" : "套用名單" }}
								</PermissionActionButton>
							</div>
						</div>

						<div v-else class="space-y-4">
							<div class="flex flex-wrap items-center justify-between gap-3">
								<h4 class="text-sm font-medium text-white/85 2xl:text-base">設備同步狀態</h4>
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										class="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/20 disabled:opacity-50"
										:disabled="syncWarnings.length === 0"
										@click="openWarningsDialog"
									>
										查看警告
										<span v-if="syncWarnings.length > 0" class="ms-1 text-amber-200">
											({{ syncWarnings.length }})
										</span>
									</button>
									<PermissionActionButton
										:allowed="canDeviceSync && !isSyncButtonDisabled"
										class="rounded-xl bg-cyan-500/80 px-4 py-1.5 text-sm text-white enabled:hover:bg-cyan-400"
										aria-label="同步此地點至門禁設備"
										@click="handleSync"
									>
										{{ isCurrentlySyncing ? "同步中…" : "同步此地點" }}
									</PermissionActionButton>
								</div>
							</div>

							<div v-if="isSyncCandidatesLoading" class="py-8 text-center text-white/60">
								載入同步狀態…
							</div>
							<div v-else-if="syncRows.length === 0" class="py-8 text-center text-white/50">
								此地點尚無門禁名單人員
							</div>
							<div v-else class="overflow-x-auto">
								<table class="w-full min-w-[760px] text-left text-sm text-white/90 2xl:text-base">
									<thead>
										<tr class="border-b border-white/15 text-white/70">
											<th class="py-2 pe-2">ID</th>
											<th class="py-2 pe-2">姓名</th>
											<th class="py-2 pe-2">已同步</th>
											<th class="py-2 pe-2">人員</th>
											<th class="py-2 pe-2">圖片</th>
											<th class="py-2 pe-2">卡片</th>
											<th class="py-2 pe-2">指紋</th>
										</tr>
									</thead>
									<tbody>
										<tr
											v-for="row in syncRows"
											:key="row.employeeNo"
											class="border-b border-white/10"
										>
											<td class="py-2 pe-2 font-mono">{{ row.employeeNo }}</td>
											<td class="py-2 pe-2">{{ row.fullName || "—" }}</td>
											<td class="py-2 pe-2">
												<span
													class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
													:class="lastSyncPillClass(getLastSyncLabel(row.employeeNo))"
												>
													{{ getLastSyncLabel(row.employeeNo) }}
												</span>
											</td>
											<td class="py-2 pe-2">
												<span
													class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
													:class="syncStepPillClass(row.person.status)"
												>
													{{ syncStepShortLabel(row.person) }}
												</span>
											</td>
											<td class="py-2 pe-2">
												<span
													class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
													:class="syncStepPillClass(row.face.status)"
												>
													{{ syncStepShortLabel(row.face) }}
												</span>
											</td>
											<td class="py-2 pe-2">
												<span
													class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
													:class="syncStepPillClass(row.card.status)"
												>
													{{ syncStepShortLabel(row.card) }}
												</span>
											</td>
											<td class="py-2 pe-2">
												<span
													class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
													:class="syncStepPillClass(row.fingerprint.status)"
												>
													{{ syncStepShortLabel(row.fingerprint) }}
												</span>
											</td>
										</tr>
									</tbody>
								</table>
								<Pagination
									:total="syncPaged.total"
									:offset="syncPaged.offset"
									:limit="syncPaged.limit"
									:disabled="isUiLocked || isSyncCandidatesLoading"
									:show="syncPaged.total > syncPaged.limit"
									@previous="handlePrevSyncPage"
									@next="handleNextSyncPage"
								/>
							</div>
						</div>

						<div
							v-if="isUiLocked"
							class="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(5,24,40,0.45)]"
							role="status"
						>
							<div class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
								<div
									class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/80"
									aria-hidden="true"
								/>
								<p class="text-white/85">同步中，請稍候…</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<PersonnelSyncWarningsDialog
		v-model="showWarningsDialog"
		:sync-warnings="syncWarnings"
		:sync-warning-type-label="syncWarningTypeLabel"
	/>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import Pagination from "~/components/common/Pagination.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { useLocationAccessSync } from "~/composables/systems/personnel/useLocationAccessSync"
import { usePageSelectAll } from "~/composables/systems/personnel/usePageSelectAll"
import type { Person } from "~/types/personnel"

const lastSyncPillClass = (label: string) => {
	if (label === "成功") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
	if (label === "失敗") return "border-rose-400/30 bg-rose-500/15 text-rose-100"
	if (label === "待同步") return "border-amber-400/30 bg-amber-500/15 text-amber-100"
	return "border-white/15 bg-white/5 text-white/70"
}

const props = defineProps<{
	modelValue: boolean
	locationId: number | null
	locationName?: string | null
	canEdit: boolean
	canDeviceSync: boolean
	accessSync: ReturnType<typeof useLocationAccessSync>
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	synced: []
	membersUpdated: []
}>()

const activeTab = ref<"members" | "sync">("members")
const tabs = [
	{ id: "members" as const, label: "地點名單" },
	{ id: "sync" as const, label: "設備同步" },
]

const {
	isSingleLocationSyncing,
	showWarningsDialog,
	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,
	getLocationDevicesLabel,
	prepareLocationDialog,
	syncOneLocation,
	isSyncLocationCandidatesLoading,
	getPagedSyncStepRowsForLocation,
	syncStepPillClass,
	syncStepShortLabel,
	getCandidateLastSyncLabel,
	isLocationCurrentlySyncing,
	isLocationSyncButtonDisabled,
	goPrevSyncPage,
	goNextSyncPage,
	isLocationMembersLoading,
	isLocationMembersApplying,
	getLocationMembersError,
	getLocationMembersSuccess,
	getLocationMembersSelectedCount,
	isLocationMemberKept,
	toggleManyLocationMembers,
	toggleKeepLocationMember,
	isLocationCandidatesLoading,
	getLocationCandidatesItems,
	getLocationCandidatesQuery,
	setLocationCandidatesQuery,
	loadLocationCandidates,
	applyLocationMembers,
} = props.accessSync

const handleClose = () => emit("update:modelValue", false)

const deviceLabels = computed(() =>
	props.locationId != null ? getLocationDevicesLabel(props.locationId) : { entry: [], exit: [] }
)

const isUiLocked = computed(() => isSingleLocationSyncing.value)
const isLoadingMembers = computed(() =>
	props.locationId != null ? isLocationMembersLoading(props.locationId) : false
)
const isApplying = computed(() =>
	props.locationId != null ? isLocationMembersApplying(props.locationId) : false
)
const membersError = computed(() =>
	props.locationId != null ? getLocationMembersError(props.locationId) : null
)
const membersSuccess = computed(() =>
	props.locationId != null ? getLocationMembersSuccess(props.locationId) : null
)
const selectedCount = computed(() =>
	props.locationId != null ? getLocationMembersSelectedCount(props.locationId) : 0
)
const candidates = computed<Person[]>(() =>
	props.locationId != null ? getLocationCandidatesItems(props.locationId) : []
)
const candidatesQuery = computed({
	get: () => (props.locationId != null ? getLocationCandidatesQuery(props.locationId) : ""),
	set: (v: string) => {
		if (props.locationId != null) setLocationCandidatesQuery(props.locationId, v)
	},
})

const isMemberKept = (personId: number) =>
	props.locationId != null ? isLocationMemberKept(props.locationId, personId) : false
const toggleKeepMember = (personId: number, e: Event) => {
	if (props.locationId == null) return
	toggleKeepLocationMember(props.locationId, personId, e)
}

const pageSelectAll = usePageSelectAll<Person>({
	items: candidates,
	isSelected: (id) => isMemberKept(id),
	setMany: (ids, checked) => {
		if (props.locationId == null) return
		toggleManyLocationMembers(props.locationId, ids, checked)
	},
})
const isAllMembersPageKept = pageSelectAll.isAllSelectedOnPage
const handleToggleSelectAllMembersPage = pageSelectAll.toggleSelectAllOnPage

const handleSearchCandidates = async () => {
	if (props.locationId == null) return
	await loadLocationCandidates(props.locationId)
}

const handleApplyMembers = async () => {
	if (props.locationId == null) return
	await applyLocationMembers(props.locationId)
	if (!membersError.value) emit("membersUpdated")
}

const isSyncCandidatesLoading = computed(() =>
	props.locationId != null ? isSyncLocationCandidatesLoading(props.locationId) : false
)
const syncPaged = computed(() =>
	props.locationId != null
		? getPagedSyncStepRowsForLocation(props.locationId)
		: { rows: [], total: 0, offset: 0, limit: 10 }
)
const syncRows = computed(() => syncPaged.value.rows)
const isCurrentlySyncing = computed(() =>
	props.locationId != null ? isLocationCurrentlySyncing(props.locationId) : false
)
const isSyncButtonDisabled = computed(() =>
	props.locationId != null ? isLocationSyncButtonDisabled(props.locationId) : true
)

const getLastSyncLabel = (employeeNo: string) =>
	props.locationId != null ? getCandidateLastSyncLabel(props.locationId, employeeNo) : "—"

const handleSync = async () => {
	if (props.locationId == null) return
	await syncOneLocation(props.locationId)
	emit("synced")
}

const handlePrevSyncPage = () => {
	if (props.locationId == null) return
	goPrevSyncPage(props.locationId)
}
const handleNextSyncPage = () => {
	if (props.locationId == null) return
	goNextSyncPage(props.locationId)
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open || props.locationId == null) return
		void prepareLocationDialog(props.locationId)
	}
)
</script>
