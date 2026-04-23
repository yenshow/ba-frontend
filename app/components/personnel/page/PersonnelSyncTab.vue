<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
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
				v-if="canEdit"
				type="button"
				class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
				:disabled="isSyncingAll || isSingleLocationSyncing || syncableLocations.length === 0"
				@click="syncAllLocations"
			>
				{{ isSyncingAll ? "同步中…" : "同步全部" }}
			</button>
		</div>

		<Transition name="fade" mode="out-in">
			<div v-if="syncableLocations.length > 0" key="sync-list" class="min-h-[200px] w-full">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">區域</th>
							<th :class="tableHeaderClass">地點名稱</th>
							<th :class="tableHeaderClass">摘要</th>
							<th v-if="canEdit" :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<template v-for="loc in syncableLocations" :key="loc.id">
							<tr
								class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
							>
								<td :class="tableCellClass">{{ loc.zone_name }}</td>
								<td :class="tableCellClass">{{ loc.name }}</td>
								<td :class="tableCellClass">
									<div class="flex flex-col items-center justify-center gap-1">
										<div class="flex flex-wrap items-center justify-center gap-2">
											<span
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85 2xl:text-sm"
												:title="'此地點具門禁權限且啟用的人員數'"
											>
												人員 {{ getLocationSummary(loc.id).people }}
											</span>
											<span
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 2xl:text-sm"
												:title="'臉(平台)：face_url 有值的人員數（不是設備端是否已有）'"
											>
												人臉 {{ getLocationSummary(loc.id).face }}
											</span>
											<span
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 2xl:text-sm"
												:title="'卡(平台)：config.access_control.cardNo 有值的人員數（不是設備端是否已有）'"
											>
												卡片 {{ getLocationSummary(loc.id).card }}
											</span>
											<span
												class="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 2xl:text-sm"
												:title="'指(平台)：有指紋模板（fingerData）的人員數（不是設備端是否已有）'"
											>
												指紋 {{ getLocationSummary(loc.id).fingerprint }}
											</span>
										</div>
									</div>
								</td>
								<td v-if="canEdit" :class="tableCellClass">
									<div class="flex flex-wrap justify-center gap-2">
										<button
											type="button"
											class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
											:disabled="false"
											aria-label="管理門禁名單"
											@click="handleOpenLocationMembersDialog(loc)"
										>
											編輯
										</button>
										<button
											type="button"
											class="rounded bg-cyan-500/80 px-3 py-1 text-white hover:bg-cyan-400 disabled:opacity-50 2xl:px-4 2xl:py-2"
											:disabled="isLocationSyncButtonDisabled(loc.id)"
											@click="syncOne(loc.id)"
										>
											{{ isLocationCurrentlySyncing(loc.id) ? "同步中…" : "同步" }}
										</button>
										<button
											type="button"
											class="rounded border border-white/20 bg-white/10 px-3 py-1 text-white/90 hover:bg-white/20 2xl:px-4 2xl:py-2"
											:class="{
												'border-cyan-400/50 bg-cyan-500/15 text-cyan-100': isSyncLocationExpanded(
													loc.id
												),
											}"
											:disabled="false"
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
									:colspan="canEdit ? 4 : 3"
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
													<th class="py-2 pe-2">工號</th>
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
													v-for="row in getSyncStepRowsForLocation(loc.id)"
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
									</div>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>
			<div v-else key="empty-sync" class="min-h-[200px] py-12 text-center text-white/60">
				<p class="text-base 2xl:text-lg">
					{{
						isLoadingSyncable
							? "載入中…"
							: "尚無可同步地點，請先在人流統計中建立區域與地點並配對門禁設備"
					}}
				</p>
			</div>
		</Transition>

		<LocationMembersDialog
			v-model="showLocationMembersDialog"
			:location-id="activeLocationMembersLocationId"
			:location-name="activeLocationMembersLocationName"
			:can-edit="canEdit"
			:sync-tab="props.syncTab"
		/>

		<div class="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<p class="text-sm font-medium text-white/85 2xl:text-base">結果與警告</p>
					<span
						class="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70 2xl:text-sm"
						:title="'包含人臉/卡片/指紋或設備清單等部分失敗明細'"
					>
						{{ filteredWarnings.length }} / {{ syncWarnings.length }}
					</span>
				</div>
			</div>

			<div class="mt-3 space-y-3">
				<div class="flex flex-wrap items-center gap-2">
					<div class="w-full max-w-[260px]">
						<FilterDropdown
							v-model="localWarningsLocationFilter"
							:options="warningsLocationFilterOptions"
							placeholder="全部地點"
							text-size="text-sm 2xl:text-base"
						/>
					</div>
					<input
						:value="warningsQuery"
						type="text"
						class="form-input w-full max-w-[320px] border-white/30 bg-white/10 py-1.5 text-xs text-white placeholder:text-white/40 2xl:py-2 2xl:text-sm"
						placeholder="搜尋工號 / 訊息"
						aria-label="搜尋警告"
						@input="handleWarningsQueryInput"
					/>
					<button
						type="button"
						class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 2xl:text-sm"
						:disabled="filteredWarnings.length === 0"
						@click="handleCopyWarnings"
					>
						複製明細
					</button>
				</div>

				<div v-if="syncWarnings.length === 0" class="text-sm text-white/50 2xl:text-base">
					尚無警告（同步完成後，若有部分失敗會顯示在此）
				</div>
				<div
					v-else
					class="max-h-[240px] overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80 2xl:text-sm"
					role="status"
				>
					<ul class="list-inside list-disc space-y-1">
						<li v-for="(w, i) in filteredWarnings" :key="i" class="break-words">
							<span v-if="w.locationName" class="text-white/90">{{ w.locationName }}：</span>
							<span v-if="w.employeeNo" class="text-white/90">員工 {{ w.employeeNo }}</span>
							<span class="text-amber-200">{{ syncWarningTypeLabel(w.type) }}</span>
							<span class="text-white/70"> — {{ w.message }}</span>
						</li>
					</ul>
					<div v-if="filteredWarnings.length === 0" class="py-6 text-center text-white/50">
						無符合篩選結果
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import LocationMembersDialog from "~/components/personnel/LocationMembersDialog.vue"
import type { usePersonnelSyncTab } from "~/composables/systems/personnel/usePersonnelSyncTab"

const props = defineProps<{
	canEdit: boolean
	tableHeaderClass: string
	tableCellClass: string
	syncTab: ReturnType<typeof usePersonnelSyncTab>
}>()

const {
	syncableLocations,
	isLoadingSyncable,
	isSyncingAll,
	activeSyncAllJob,
	allLocationsProgressText,
	isSingleLocationSyncing,

	getLocationSummary,
	isSyncLocationExpanded,
	isLocationSyncButtonDisabled,
	isLocationCurrentlySyncing,

	getSyncStepRowsForLocation,
	syncCandidatesByLocation,
	isSyncLocationCandidatesLoading,

	syncStepPillClass,
	syncStepShortLabel,
	getCandidateLastSyncLabel,
	getCandidateLastSyncTitle,

	syncWarnings,
	filteredWarnings,
	syncWarningTypeLabel,
	warningsLocationFilter,
	warningsLocationFilterOptions,
	warningsQuery,
	handleCopyWarnings,

	syncAllLocations,
	syncOneLocation: syncOne,
	toggleSyncLocationExpand,
} = props.syncTab

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

const localWarningsLocationFilter = computed<string>({
	get: () => warningsLocationFilter.value,
	set: (v) => (warningsLocationFilter.value = v),
})

const handleWarningsQueryInput = (e: Event) => {
	const value = (e.target as HTMLInputElement | null)?.value ?? ""
	warningsQuery.value = value
}
</script>
