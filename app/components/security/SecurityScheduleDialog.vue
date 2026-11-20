<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
				role="dialog"
				aria-modal="true"
				aria-labelledby="security-schedule-title"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] min-h-0 w-full max-w-6xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3
							id="security-schedule-title"
							class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
						>
							時間排程
						</h3>
						<div class="flex items-center gap-3">
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
								:show-reset="true"
								@reset="handleDiscard"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="flex min-h-0 flex-1 flex-col overflow-hidden pr-7 2xl:pr-8">
						<p v-if="errorMessage" class="mb-3 form-error-text-lg" role="alert">
							{{ errorMessage }}
						</p>

						<div class="grid min-h-0 flex-1 grid-cols-12 gap-4 2xl:gap-5">
							<aside
								class="col-span-12 flex max-h-64 min-h-0 flex-col lg:col-span-4 lg:max-h-none"
							>
								<div
									class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5"
								>
									<div
										class="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 2xl:px-4"
									>
										<span class="text-sm font-medium text-white/85 2xl:text-base">規則</span>
										<PermissionActionButton
											:allowed="canEdit"
											class="rounded-md px-2 py-1 text-xs text-cyan-100/90 transition-colors enabled:hover:bg-cyan-500/15 2xl:text-sm"
											aria-label="新增排程規則"
											@click="handleAddRule"
										>
											＋ 新增
										</PermissionActionButton>
									</div>
									<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5 2xl:p-3">
										<p v-if="loading" class="py-6 text-center text-sm text-white/60">載入中…</p>
										<div
											v-else-if="rules.length === 0"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
										>
											尚無排程規則
										</div>
										<ul v-else class="space-y-1" role="listbox" aria-label="保全排程規則列表">
											<li v-for="(rule, idx) in rules" :key="`rule-nav-${idx}`">
												<button
													type="button"
													class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors 2xl:text-base"
													:class="
														selectedIdx === idx
															? 'bg-cyan-500/25 text-white ring-1 ring-cyan-400/35'
															: 'text-white/80 hover:bg-white/10'
													"
													:aria-selected="selectedIdx === idx"
													@click="selectedIdx = idx"
												>
													<span
														class="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-cyan-500/20 px-1.5 text-xs font-medium text-cyan-100"
													>
														{{ idx + 1 }}
													</span>
													<span class="min-w-0 flex-1 truncate">
														{{ rule.name?.trim() || `規則 ${idx + 1}` }}
													</span>
													<span
														v-if="!rule.enabled"
														class="shrink-0 text-xs text-white/40"
													>
														停用
													</span>
												</button>
											</li>
										</ul>
									</div>
								</div>
							</aside>

							<section
								class="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5 lg:col-span-8"
								aria-label="時間排程詳細設定"
							>
								<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-4 2xl:p-5">
									<div
										v-if="!selectedRule"
										class="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center"
									>
										<p class="text-sm font-medium text-white/85 2xl:text-base">
											請新增或選擇規則
										</p>
										<p class="mt-1 text-xs text-white/55 2xl:text-sm">
											設定許可時段、適用星期與綁定保全地點
										</p>
										<PermissionActionButton
											:allowed="canEdit"
											class="btn-secondary mt-4 px-3 py-1.5 text-sm"
											aria-label="新增排程規則"
											@click="handleAddRule"
										>
											＋ 新增規則
										</PermissionActionButton>
									</div>

									<template v-else>
										<div
											class="mb-3 flex items-center gap-3"
											:class="selectedRule.enabled ? '' : 'opacity-60'"
										>
											<h4 class="min-w-0 flex-1 truncate text-base font-medium text-white 2xl:text-lg">
												{{ selectedRule.name?.trim() || `規則 ${selectedIdx + 1}` }}
											</h4>
											<label
												class="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-white/75 2xl:text-sm"
											>
												<input
													v-model="selectedRule.enabled"
													type="checkbox"
													class="h-3.5 w-3.5 accent-cyan-400"
													:disabled="!canEdit"
													:aria-label="`啟用規則 ${selectedIdx + 1}`"
												/>
												啟用
											</label>
											<IconTrashButton
												:allowed="canEdit"
												size="sm"
												title="移除規則"
												:aria-label="`移除規則 ${selectedIdx + 1}`"
												@click="handleRemoveRule(selectedIdx)"
											/>
										</div>

										<div class="space-y-3 2xl:space-y-4">
											<div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
												<label
													class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:col-span-5 2xl:text-base"
												>
													<span>名稱</span>
													<input
														v-model="selectedRule.name"
														type="text"
														class="form-input-small"
														placeholder="選填，例如：平日白天"
														:disabled="!canEdit"
														:aria-label="`規則 ${selectedIdx + 1} 名稱`"
													/>
												</label>
												<div
													class="grid grid-cols-2 gap-3 sm:col-span-7"
													role="group"
													:aria-label="`規則 ${selectedIdx + 1} 時間範圍`"
												>
													<label
														class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 2xl:text-base"
													>
														<span>開始<span class="required-mark">*</span></span>
														<input
															v-model="selectedRule.windowStart"
															type="time"
															class="form-input-small w-full [color-scheme:dark]"
															:aria-label="`規則 ${selectedIdx + 1} 開始時間`"
															:disabled="!canEdit"
														/>
													</label>
													<label
														class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 2xl:text-base"
													>
														<span>結束<span class="required-mark">*</span></span>
														<input
															v-model="selectedRule.windowEnd"
															type="time"
															class="form-input-small w-full [color-scheme:dark]"
															:aria-label="`規則 ${selectedIdx + 1} 結束時間`"
															:disabled="!canEdit"
														/>
													</label>
												</div>
											</div>

											<div class="space-y-1.5">
												<div class="flex items-center justify-between gap-2">
													<span class="text-sm text-white/80 2xl:text-base">適用星期</span>
													<div class="flex gap-2 text-xs 2xl:text-sm">
														<button
															type="button"
															class="text-cyan-200/80 underline-offset-2 transition-colors hover:text-cyan-100 hover:underline disabled:opacity-40"
															:disabled="!canEdit"
															:aria-label="`規則 ${selectedIdx + 1} 全選星期`"
															@click="handleSetAllDow(selectedIdx, true)"
														>
															全選
														</button>
														<button
															type="button"
															class="text-white/45 underline-offset-2 transition-colors hover:text-white/70 hover:underline disabled:opacity-40"
															:disabled="!canEdit"
															:aria-label="`規則 ${selectedIdx + 1} 清除星期`"
															@click="handleSetAllDow(selectedIdx, false)"
														>
															清除
														</button>
													</div>
												</div>
												<div
													class="grid grid-cols-7 gap-1.5"
													role="group"
													:aria-label="`規則 ${selectedIdx + 1} 適用星期`"
												>
													<button
														v-for="d in DOW_OPTIONS"
														:key="d.value"
														type="button"
														class="rounded-lg border px-1 py-2 text-center text-xs transition-colors 2xl:text-sm"
														:class="
															selectedRule.daysOfWeek.includes(d.value)
																? 'border-cyan-400/55 bg-cyan-500/25 font-medium text-white'
																: 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/10 hover:text-white/80'
														"
														:aria-pressed="selectedRule.daysOfWeek.includes(d.value)"
														:disabled="!canEdit"
														:aria-label="`規則 ${selectedIdx + 1} 星期${d.label}`"
														@click="
															handleToggleDow(
																selectedIdx,
																d.value,
																!selectedRule.daysOfWeek.includes(d.value)
															)
														"
													>
														{{ d.label }}
													</button>
												</div>
											</div>

											<div class="space-y-1.5">
												<div class="flex items-center justify-between gap-2">
													<span class="text-sm text-white/80 2xl:text-base">
														綁定保全地點<span class="required-mark">*</span>
													</span>
													<div class="flex gap-2 text-xs 2xl:text-sm">
														<button
															type="button"
															class="text-cyan-200/80 underline-offset-2 transition-colors hover:text-cyan-100 hover:underline disabled:opacity-40"
															:disabled="!canEdit || locationRows.length === 0"
															:aria-label="`規則 ${selectedIdx + 1} 全選地點`"
															@click="handleSetAllLocations(selectedIdx, true)"
														>
															全選
														</button>
														<button
															type="button"
															class="text-white/45 underline-offset-2 transition-colors hover:text-white/70 hover:underline disabled:opacity-40"
															:disabled="!canEdit"
															:aria-label="`規則 ${selectedIdx + 1} 清除地點`"
															@click="handleSetAllLocations(selectedIdx, false)"
														>
															清除
														</button>
													</div>
												</div>
												<div
													v-if="zoneGroups.length === 0"
													class="rounded-lg border border-dashed border-white/15 px-3 py-6 text-center text-xs text-white/50 2xl:text-sm"
												>
													尚無保全地點，請先於樓層管理新增並儲存
												</div>
												<div
													v-else
													class="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-2 show-scrollbar"
													role="group"
													:aria-label="`規則 ${selectedIdx + 1} 綁定地點`"
												>
													<div
														v-for="group in zoneGroups"
														:key="group.zoneKey"
														class="overflow-hidden rounded-lg border border-white/10"
													>
														<div class="px-3 py-1.5 text-xs font-medium text-white/55 2xl:text-sm">
															{{ group.zoneName }}
														</div>
														<ul class="space-y-0.5 px-2 pb-2">
															<li v-for="row in group.locations" :key="row.locationId">
																<label
																	class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 2xl:text-base"
																>
																	<input
																		type="checkbox"
																		class="h-3.5 w-3.5 accent-cyan-400"
																		:checked="
																			selectedRule.locationIds.includes(row.locationId)
																		"
																		:disabled="!canEdit"
																		:aria-label="`${group.zoneName}／${row.locationName}`"
																		@change="
																			handleToggleLocation(
																				selectedIdx,
																				row.locationId,
																				($event.target as HTMLInputElement).checked
																			)
																		"
																	/>
																	<span class="truncate">{{ row.locationName }}</span>
																</label>
															</li>
														</ul>
													</div>
												</div>
											</div>
										</div>
									</template>
								</div>
							</section>
						</div>
					</div>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<PermissionActionButton
							:allowed="canEdit"
							:disabled="!hasUnsavedChanges || saving || loading"
							aria-label="儲存時間排程"
							class="btn-primary"
							@click="handleSave"
						>
							{{ saving ? "儲存中…" : "儲存排程" }}
						</PermissionActionButton>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialog.config.value.title"
		:message="confirmDialog.config.value.message"
		:details="confirmDialog.config.value.details"
		:type="confirmDialog.config.value.type"
		@confirm="closeDialog"
	/>
</template>

<script setup lang="ts">
import type { SecurityZone } from "~/types/security"
import {
	useSecurityApi,
	type SecurityScheduleRule,
} from "~/composables/systems/security/useSecurityApi"
import { useToast } from "~/composables/core/useToast"
import { TOAST } from "~/config/toastCatalog"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { FORM_UNSAVED_CLOSE_CONFIRM } from "~/utils/formDialog"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"

interface ScheduleDraft {
	name: string
	daysOfWeek: number[]
	windowStart: string
	windowEnd: string
	enabled: boolean
	locationIds: number[]
}

interface LocationRow {
	locationId: number
	locationName: string
	zoneName: string
}

interface ZoneGroup {
	zoneKey: string
	zoneName: string
	locations: LocationRow[]
}

const props = defineProps<{
	modelValue: boolean
	zones: SecurityZone[]
	canEdit?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const securityApi = useSecurityApi()
const toast = useToast()
const confirmDialog = useConfirmDialog()
const showConfirmDialog = confirmDialog.showDialog

const canEdit = computed(() => Boolean(props.canEdit))

const DOW_OPTIONS = [
	{ value: 1, label: "一" },
	{ value: 2, label: "二" },
	{ value: 3, label: "三" },
	{ value: 4, label: "四" },
	{ value: 5, label: "五" },
	{ value: 6, label: "六" },
	{ value: 0, label: "日" },
] as const

const ALL_DOW = DOW_OPTIONS.map((d) => d.value)

const rules = ref<ScheduleDraft[]>([])
const baselineRules = ref<ScheduleDraft[]>([])
const selectedIdx = ref(0)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref("")

const cloneRules = (list: ScheduleDraft[]): ScheduleDraft[] =>
	list.map((r) => ({
		name: r.name,
		daysOfWeek: [...r.daysOfWeek],
		windowStart: r.windowStart,
		windowEnd: r.windowEnd,
		enabled: r.enabled,
		locationIds: [...r.locationIds],
	}))

const rulesSignature = (list: ScheduleDraft[]) =>
	JSON.stringify(
		list.map((r) => ({
			name: (r.name || "").trim(),
			daysOfWeek: [...r.daysOfWeek].sort((a, b) => a - b),
			windowStart: r.windowStart,
			windowEnd: r.windowEnd,
			enabled: r.enabled !== false,
			locationIds: [...r.locationIds].sort((a, b) => a - b),
		}))
	)

const hasUnsavedChanges = computed(
	() => rulesSignature(rules.value) !== rulesSignature(baselineRules.value)
)

const changedFieldsList = computed(() =>
	hasUnsavedChanges.value ? ["排程規則"] : []
)

const changeSummary = computed(() =>
	hasUnsavedChanges.value ? "有未儲存的變更" : ""
)

const commitBaseline = () => {
	baselineRules.value = cloneRules(rules.value)
}

const zoneGroups = computed((): ZoneGroup[] => {
	const groups: ZoneGroup[] = []
	for (const zone of props.zones || []) {
		const locations: LocationRow[] = []
		for (const loc of zone.locations || []) {
			const id = Number(loc.id)
			if (!Number.isFinite(id) || id <= 0) continue
			locations.push({
				locationId: id,
				locationName: loc.name || `點位 #${id}`,
				zoneName: zone.name || "區域",
			})
		}
		if (locations.length === 0) continue
		groups.push({
			zoneKey: String(zone.id || zone.name || groups.length),
			zoneName: zone.name || "區域",
			locations,
		})
	}
	return groups
})

const locationRows = computed(() => zoneGroups.value.flatMap((g) => g.locations))

const selectedRule = computed(() => {
	if (selectedIdx.value < 0 || selectedIdx.value >= rules.value.length) return null
	return rules.value[selectedIdx.value] ?? null
})

const toDraft = (r: SecurityScheduleRule | ScheduleDraft): ScheduleDraft => ({
	name: r.name || "",
	daysOfWeek:
		Array.isArray(r.daysOfWeek) && r.daysOfWeek.length ? r.daysOfWeek.map(Number) : [...ALL_DOW],
	windowStart: String(r.windowStart || "08:00").slice(0, 5),
	windowEnd: String(r.windowEnd || "18:00").slice(0, 5),
	enabled: r.enabled !== false,
	locationIds: Array.isArray(r.locationIds)
		? r.locationIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
		: [],
})

const toHhMmSs = (t: string) => (t.length === 5 ? `${t}:00` : t)

const loadRules = async () => {
	loading.value = true
	errorMessage.value = ""
	try {
		const res = await securityApi.getSchedules()
		rules.value = (res.rules || []).map(toDraft)
		selectedIdx.value = rules.value.length > 0 ? 0 : -1
		commitBaseline()
	} catch (err: unknown) {
		errorMessage.value = err instanceof Error ? err.message : "載入排程失敗"
		rules.value = []
		selectedIdx.value = -1
		commitBaseline()
	} finally {
		loading.value = false
	}
}

const closeDialog = () => {
	errorMessage.value = ""
	emit("update:modelValue", false)
}

const handleClose = () => {
	if (hasUnsavedChanges.value) {
		confirmDialog.show(FORM_UNSAVED_CLOSE_CONFIRM)
		return
	}
	closeDialog()
}

const handleDiscard = () => {
	rules.value = cloneRules(baselineRules.value)
	if (rules.value.length === 0) {
		selectedIdx.value = -1
	} else if (selectedIdx.value < 0 || selectedIdx.value >= rules.value.length) {
		selectedIdx.value = 0
	}
	errorMessage.value = ""
}

const handleAddRule = () => {
	rules.value.push({
		name: "",
		daysOfWeek: [1, 2, 3, 4, 5],
		windowStart: "08:00",
		windowEnd: "18:00",
		enabled: true,
		locationIds: [],
	})
	selectedIdx.value = rules.value.length - 1
}

const handleRemoveRule = (idx: number) => {
	rules.value.splice(idx, 1)
	if (rules.value.length === 0) {
		selectedIdx.value = -1
		return
	}
	selectedIdx.value = Math.min(idx, rules.value.length - 1)
}

const handleToggleDow = (idx: number, day: number, checked: boolean) => {
	const rule = rules.value[idx]
	if (!rule) return
	const set = new Set(rule.daysOfWeek)
	if (checked) set.add(day)
	else set.delete(day)
	rule.daysOfWeek = [...set].sort((a, b) => a - b)
}

const handleSetAllDow = (idx: number, selectAll: boolean) => {
	const rule = rules.value[idx]
	if (!rule) return
	rule.daysOfWeek = selectAll ? [...ALL_DOW] : []
}

const handleToggleLocation = (idx: number, locationId: number, checked: boolean) => {
	const rule = rules.value[idx]
	if (!rule) return
	const set = new Set(rule.locationIds)
	if (checked) set.add(locationId)
	else set.delete(locationId)
	rule.locationIds = [...set].sort((a, b) => a - b)
}

const handleSetAllLocations = (idx: number, selectAll: boolean) => {
	const rule = rules.value[idx]
	if (!rule) return
	rule.locationIds = selectAll
		? locationRows.value.map((r) => r.locationId)
		: []
}

const handleSave = async () => {
	if (!canEdit.value) return

	const emptyDow = rules.value.findIndex((r) => !r.daysOfWeek.length)
	if (emptyDow >= 0) {
		errorMessage.value = `規則 ${emptyDow + 1} 須至少選擇一天`
		selectedIdx.value = emptyDow
		return
	}
	const emptyLoc = rules.value.findIndex((r) => !r.locationIds.length)
	if (emptyLoc >= 0) {
		errorMessage.value = `規則 ${emptyLoc + 1} 須至少綁定一個保全地點`
		selectedIdx.value = emptyLoc
		return
	}
	const sameTime = rules.value.findIndex(
		(r) => toHhMmSs(r.windowStart) === toHhMmSs(r.windowEnd)
	)
	if (sameTime >= 0) {
		errorMessage.value = `規則 ${sameTime + 1} 時段起迄不可相同`
		selectedIdx.value = sameTime
		return
	}

	saving.value = true
	errorMessage.value = ""
	try {
		const res = await securityApi.putSchedules(
			rules.value.map((r) => ({
				name: r.name,
				daysOfWeek: r.daysOfWeek,
				windowStart: toHhMmSs(r.windowStart),
				windowEnd: toHhMmSs(r.windowEnd),
				enabled: r.enabled,
				locationIds: r.locationIds,
			}))
		)
		rules.value = (res.rules || []).map(toDraft)
		if (selectedIdx.value >= rules.value.length) {
			selectedIdx.value = rules.value.length > 0 ? 0 : -1
		}
		commitBaseline()
		toast.success(TOAST.SETTINGS_SAVED)
	} catch (err: unknown) {
		errorMessage.value = err instanceof Error ? err.message : "儲存排程失敗"
	} finally {
		saving.value = false
	}
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		errorMessage.value = ""
		void loadRules()
	}
)
</script>
