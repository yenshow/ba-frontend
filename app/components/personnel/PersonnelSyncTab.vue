<template>
	<section
		class="relative rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		:aria-busy="isUiLocked || undefined"
	>
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">可同步地點</h2>
				<p
					v-if="isSyncingAll && activeSyncAllJob"
					class="mt-1 text-sm text-cyan-200/90 2xl:text-base"
				>
					同步全部：{{ allLocationsProgressText }}
				</p>
			</div>
			<button
				type="button"
				class="ms-auto rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 hover:bg-white/20 disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
				:disabled="syncWarnings.length === 0"
				:aria-label="syncWarnings.length === 0 ? '目前沒有可查看的結果' : '查看同步結果與警告'"
				@click="openWarningsDialog"
			>
				查看結果<span v-if="syncWarnings.length > 0" class="ms-2 text-xs text-amber-200 2xl:text-sm"
					>({{ syncWarnings.length }})</span
				>
			</button>
			<PermissionActionButton
				:allowed="
					canDeviceSync &&
					!isSyncingAll &&
					!isSingleLocationSyncing &&
					syncableLocations.length > 0
				"
				aria-label="同步全部地點"
				class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
				enabled-hover-class="hover:bg-emerald-400"
				@click="syncAllLocations"
			>
				{{ isSyncingAll ? "同步中…" : "同步全部" }}
			</PermissionActionButton>
		</div>

		<AsyncPanel
			panel-size="compact"
			:loading="isLoadingSyncable"
			:empty="!isLoadingSyncable && syncableLocations.length === 0"
			empty-title="尚無可同步地點"
			empty-description="請先在人流統計中建立區域與地點並配對門禁設備"
		>
			<div class="w-full">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">地點</th>
							<th :class="tableHeaderClass">入口設備</th>
							<th :class="tableHeaderClass">出口設備</th>
							<th :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<template v-for="loc in syncableLocations" :key="loc.id">
							<tr
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">{{ loc.zone_name }} / {{ loc.name }}</td>
								<td :class="tableCellClass">
									<div class="flex flex-wrap items-center justify-center gap-2 text-left">
										<template v-if="(getLocationDevicesLabel(loc.id).entry || []).length > 0">
											<span
												v-for="name in getLocationDevicesLabel(loc.id).entry"
												:key="`entry-${loc.id}-${name}`"
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85 2xl:text-sm"
												:title="name"
											>
												{{ name }}
											</span>
										</template>
										<span v-else class="text-sm text-white/60 2xl:text-base">—</span>
									</div>
								</td>
								<td :class="tableCellClass">
									<div class="flex flex-wrap items-center justify-center gap-2 text-left">
										<template v-if="(getLocationDevicesLabel(loc.id).exit || []).length > 0">
											<span
												v-for="name in getLocationDevicesLabel(loc.id).exit"
												:key="`exit-${loc.id}-${name}`"
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85 2xl:text-sm"
												:title="name"
											>
												{{ name }}
											</span>
										</template>
										<span v-else class="text-sm text-white/60 2xl:text-base">—</span>
									</div>
								</td>
								<td :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2">
										<PermissionActionButton
											:allowed="canSyncEdit && !isUiLocked"
											aria-label="管理門禁名單"
											class="rounded bg-blue-500/80 px-3 py-1 text-white disabled:bg-blue-500/40 2xl:px-4 2xl:py-2"
											enabled-hover-class="hover:bg-blue-400"
											@click="handleOpenLocationMembersDialog(loc)"
										>
											編輯
										</PermissionActionButton>
										<PermissionActionButton
											:allowed="canDeviceSync && !isLocationSyncButtonDisabled(loc.id)"
											aria-label="同步此地點"
											class="rounded bg-cyan-500/80 px-3 py-1 text-white disabled:opacity-50 2xl:px-4 2xl:py-2"
											enabled-hover-class="hover:bg-cyan-400"
											@click="syncOne(loc.id)"
										>
											{{ isLocationCurrentlySyncing(loc.id) ? "同步中…" : "同步" }}
										</PermissionActionButton>
										<button
											type="button"
											class="rounded border border-white/20 bg-white/10 px-3 py-1 text-white/90 hover:bg-white/20 2xl:px-4 2xl:py-2"
											:class="{
												'border-cyan-400/50 bg-cyan-500/15 text-cyan-100': isSyncLocationExpanded(
													loc.id
												),
											}"
											:disabled="isUiLocked"
											:aria-expanded="isSyncLocationExpanded(loc.id)"
											:aria-label="
												isSyncLocationExpanded(loc.id) ? '收合人員與步驟' : '展開人員與步驟'
											"
											@click="toggleSyncLocationExpand(loc.id)"
										>
											{{ isSyncLocationExpanded(loc.id) ? "收合" : "展開" }}
										</button>
									</div>
								</td>
							</tr>

							<tr v-if="isSyncLocationExpanded(loc.id)" class="border-b border-white/10 bg-white/5">
								<td
									colspan="4"
									class="px-4 py-3 text-left text-sm 2xl:px-6 2xl:py-4 2xl:text-base"
								>
									<!-- 門禁名單管理已改為「操作」欄的 Dialog（管理按鈕） -->

									<div v-if="isSyncLocationCandidatesLoading(loc.id)" class="text-white/60">
										載入該地點人員…
									</div>
									<div
										v-else-if="(syncCandidatesByLocation[loc.id] ?? []).length === 0"
										class="text-white/50"
									>
										此處目前無有門禁權限的啟用人員
									</div>
									<div v-else class="overflow-x-auto">
										<table
											class="w-full min-w-[760px] text-left text-sm text-white/90 2xl:text-base"
										>
											<thead>
												<tr class="border-b border-white/15 text-white/70">
													<th class="py-2 pe-2">ID</th>
													<th class="py-2 pe-2">姓名</th>
													<th class="py-2 pe-2">
														<span title="此人員在此地點（所有綁定設備）的最後同步狀態">已同步</span>
													</th>
													<th class="py-2 pe-2">
														<span title="UserInfo：寫入基本資料（姓名等）">人員</span>
													</th>
													<th class="py-2 pe-2">
														<span title="FDSetUp：寫入人臉（需 face_url 可讀取）">圖片</span>
													</th>
													<th class="py-2 pe-2">
														<span title="CardInfo：寫入卡號（需平台已設定 cardNo）">卡片</span>
													</th>
													<th class="py-2 pe-2">
														<span title="FingerPrint：寫入指紋模板（需平台已擷取模板）">指紋</span>
													</th>
												</tr>
											</thead>
											<tbody>
												<tr
													v-for="row in getSyncPagedRowsCached(loc.id)"
													:key="row.employeeNo"
													class="border-b border-white/10"
												>
													<td class="py-2 pe-2 font-mono text-white/90">{{ row.employeeNo }}</td>
													<td class="py-2 pe-2">{{ row.fullName || "—" }}</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm"
															:class="
																lastSyncPillClass(getCandidateLastSyncLabel(loc.id, row.employeeNo))
															"
															:title="
																getCandidateLastSyncTitle(loc.id, row.employeeNo) || undefined
															"
														>
															{{ getCandidateLastSyncLabel(loc.id, row.employeeNo) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm"
															:class="syncStepPillClass(row.person.status)"
															:title="row.person.message || undefined"
														>
															{{ syncStepShortLabel(row.person) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm"
															:class="syncStepPillClass(row.face.status)"
															:title="row.face.message || undefined"
														>
															{{ syncStepShortLabel(row.face) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm"
															:class="syncStepPillClass(row.card.status)"
															:title="row.card.message || undefined"
														>
															{{ syncStepShortLabel(row.card) }}
														</span>
													</td>
													<td class="py-2 pe-2">
														<span
															class="inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold 2xl:text-sm"
															:class="syncStepPillClass(row.fingerprint.status)"
															:title="row.fingerprint.message || undefined"
														>
															{{ syncStepShortLabel(row.fingerprint) }}
														</span>
													</td>
												</tr>
											</tbody>
										</table>
										<Pagination
											:total="getSyncPagedTotalCached(loc.id)"
											:offset="getSyncPagedOffsetCached(loc.id)"
											:limit="SYNC_CANDIDATES_PAGE_SIZE"
											:disabled="isUiLocked || isSyncLocationCandidatesLoading(loc.id)"
											:show="getSyncPagedTotalCached(loc.id) > SYNC_CANDIDATES_PAGE_SIZE"
											@previous="goPrevSyncPage(loc.id)"
											@next="goNextSyncPage(loc.id)"
										/>
									</div>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>
		</AsyncPanel>

		<LocationMembersDialog
			v-model="showLocationMembersDialog"
			:location-id="activeLocationMembersLocationId"
			:location-name="activeLocationMembersLocationName"
			:can-edit="canSyncEdit"
			:sync-tab="props.syncTab"
		/>

		<PersonnelSyncWarningsDialog
			v-model="showWarningsDialog"
			:sync-warnings="syncWarnings"
			:sync-warning-type-label="syncWarningTypeLabel"
		/>

		<div
			v-if="isUiLocked"
			class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
			role="status"
			aria-live="polite"
		>
			<div class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3">
				<div
					class="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/80 2xl:h-8 2xl:w-8"
					aria-hidden="true"
				/>
				<p class="text-lg text-white/85 2xl:text-xl">同步中，請稍候…</p>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import Pagination from "~/components/common/Pagination.vue"
import LocationMembersDialog from "~/components/personnel/dialogs/LocationMembersDialog.vue"
import PersonnelSyncWarningsDialog from "~/components/personnel/dialogs/PersonnelSyncWarningsDialog.vue"
import type { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab"

const props = defineProps<{
	canDeviceSync: boolean
	canSyncEdit: boolean
	tableHeaderClass: string
	tableCellClass: string
	syncTab: ReturnType<typeof usePersonnelSyncTab>
}>()

const {
	syncableLocations,
	isLoadingSyncable,
	isSyncingAll,
	showWarningsDialog,
	activeSyncAllJob,
	allLocationsProgressText,
	isSingleLocationSyncing,

	getLocationDevicesLabel,
	isSyncLocationExpanded,
	isLocationSyncButtonDisabled,
	isLocationCurrentlySyncing,

	getSyncStepRowsForLocation,
	getPagedSyncStepRowsForLocation,
	syncCandidatesByLocation,
	isSyncLocationCandidatesLoading,

	syncStepPillClass,
	syncStepShortLabel,
	getCandidateLastSyncLabel,
	getCandidateLastSyncTitle,

	syncWarnings,
	syncWarningTypeLabel,
	openWarningsDialog,

	SYNC_CANDIDATES_PAGE_SIZE,
	goPrevSyncPage,
	goNextSyncPage,

	syncAllLocations,
	syncOneLocation: syncOne,
	toggleSyncLocationExpand,
} = props.syncTab

const isUiLocked = computed(() => Boolean(isSyncingAll.value || isSingleLocationSyncing.value))

const lastSyncPillClass = (label: string) => {
	if (label === "成功") return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
	if (label === "失敗") return "border-rose-400/30 bg-rose-500/15 text-rose-100"
	if (label === "待同步") return "border-amber-400/30 bg-amber-500/15 text-amber-100"
	return "border-white/15 bg-white/5 text-white/70"
}

const showLocationMembersDialog = ref(false)
const activeLocationMembersLocationId = ref<number>(0)
const activeLocationMembersLocationName = ref("")

const handleOpenLocationMembersDialog = (loc: { id: number; name: string; zone_name: string }) => {
	activeLocationMembersLocationId.value = loc.id
	activeLocationMembersLocationName.value = `${loc.zone_name} / ${loc.name}`
	showLocationMembersDialog.value = true
}

const getSyncPagedRows = (locationId: number) => getPagedSyncStepRowsForLocation(locationId).rows
const getSyncPagedTotal = (locationId: number) => getPagedSyncStepRowsForLocation(locationId).total
const getSyncPagedOffset = (locationId: number) =>
	getPagedSyncStepRowsForLocation(locationId).offset

const pagedByLocationId = computed(() => {
	const map: Record<
		number,
		{
			rows: ReturnType<typeof getPagedSyncStepRowsForLocation>["rows"]
			total: number
			offset: number
		}
	> = {}
	for (const loc of syncableLocations.value || []) {
		// 只對展開的地點計算（避免 buildSyncPersonStepRows 被重複觸發）
		if (!isSyncLocationExpanded(loc.id)) continue
		map[loc.id] = getPagedSyncStepRowsForLocation(loc.id)
	}
	return map
})

const getSyncPaged = (locationId: number) =>
	pagedByLocationId.value[locationId] ?? {
		rows: [],
		total: 0,
		offset: 0,
		limit: SYNC_CANDIDATES_PAGE_SIZE,
	}

const getSyncPagedRowsCached = (locationId: number) => getSyncPaged(locationId).rows
const getSyncPagedTotalCached = (locationId: number) => getSyncPaged(locationId).total
const getSyncPagedOffsetCached = (locationId: number) => getSyncPaged(locationId).offset
</script>
