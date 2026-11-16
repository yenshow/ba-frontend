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
							許可時段
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉對話框"
							@click="handleClose"
						>
							&times;
						</button>
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
										<span class="text-sm font-medium text-white/85 2xl:text-base">點位</span>
									</div>
									<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-2.5 2xl:p-3">
										<div
											v-if="zoneGroups.length === 0"
											class="py-10 text-center text-sm text-white/60 2xl:text-base"
										>
											尚無保全點位，請先於樓層管理新增並儲存
										</div>
										<ul v-else class="space-y-2.5" role="tree" aria-label="保全點位列表">
											<li
												v-for="group in zoneGroups"
												:key="group.zoneKey"
												class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
												role="treeitem"
												:aria-expanded="true"
											>
												<div class="px-3 py-2 text-xs font-medium text-white/55 2xl:text-sm">
													{{ group.zoneName }}
												</div>
												<ul class="space-y-1 px-2 pb-2" role="group">
													<li v-for="row in group.locations" :key="row.key">
														<button
															type="button"
															class="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition-colors 2xl:text-base"
															:class="
																selectedKey === row.key
																	? 'bg-cyan-500/25 text-white ring-1 ring-cyan-400/35'
																	: 'text-white/80 hover:bg-white/10'
															"
															:aria-current="selectedKey === row.key ? 'true' : undefined"
															@click="handleSelectLocation(row)"
														>
															{{ row.locationName }}
														</button>
													</li>
												</ul>
											</li>
										</ul>
									</div>
								</div>
							</aside>

							<section
								class="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/15 bg-white/5 lg:col-span-8"
								aria-label="許可時段詳細設定"
							>
								<div class="show-scrollbar min-h-0 flex-1 overflow-y-auto p-4 2xl:p-5">
									<div
										v-if="!selectedRow"
										class="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center"
									>
										<p class="text-sm font-medium text-white/85 2xl:text-base">
											請從左側選擇點位
										</p>
										<p class="mt-1 text-xs text-white/55 2xl:text-sm">
											選取後即可編輯該點許可時段
										</p>
									</div>

									<template v-else>
										<div class="mb-3 space-y-1">
											<h4 class="text-base font-medium text-white 2xl:text-lg">
												{{ selectedLabel }}
											</h4>
											<p class="text-xs leading-relaxed text-white/55 2xl:text-sm">
												時段內不告警；時段外活動寫入警報。可跨日（如 22:00–06:00）。無規則＝不依時段告警。
											</p>
										</div>

										<p v-if="loading" class="text-sm text-white/60 2xl:text-base">載入中…</p>

										<div v-else class="space-y-3">
											<div
												v-for="(rule, idx) in rules"
												:key="`rule-${idx}`"
												class="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
												:class="rule.enabled ? '' : 'opacity-60'"
											>
												<div
													class="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2 2xl:px-4"
												>
													<span
														class="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-cyan-500/20 px-1.5 text-xs font-medium text-cyan-100"
													>
														{{ idx + 1 }}
													</span>
													<span
														class="min-w-0 flex-1 truncate text-sm text-white/85 2xl:text-base"
													>
														{{ rule.name?.trim() || `時段 ${idx + 1}` }}
													</span>
													<label
														class="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-white/75 2xl:text-sm"
													>
														<input
															v-model="rule.enabled"
															type="checkbox"
															class="h-3.5 w-3.5 accent-cyan-400"
															:disabled="!canEdit"
															:aria-label="`啟用時段 ${idx + 1}`"
														/>
														啟用
													</label>
													<PermissionActionButton
														:allowed="canEdit"
														class="shrink-0 rounded-md px-2 py-1 text-xs text-rose-300/90 transition-colors enabled:hover:bg-rose-500/15 enabled:hover:text-rose-200 2xl:text-sm"
														:aria-label="`移除時段 ${idx + 1}`"
														@click="handleRemoveRule(idx)"
													>
														移除
													</PermissionActionButton>
												</div>

												<div class="space-y-3 p-3 2xl:space-y-4 2xl:p-4">
													<div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
														<label
															class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 sm:col-span-5 2xl:text-base"
														>
															<span>名稱</span>
															<input
																v-model="rule.name"
																type="text"
																class="form-input-small"
																placeholder="選填，例如：平日白天"
																:disabled="!canEdit"
																:aria-label="`時段 ${idx + 1} 名稱`"
															/>
														</label>
														<div
															class="grid grid-cols-2 gap-3 sm:col-span-7"
															role="group"
															:aria-label="`時段 ${idx + 1} 時間範圍`"
														>
															<label
																class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 2xl:text-base"
															>
																<span>開始<span class="required-mark">*</span></span>
																<input
																	v-model="rule.windowStart"
																	type="time"
																	class="form-input-small w-full"
																	:aria-label="`時段 ${idx + 1} 開始時間`"
																	:disabled="!canEdit"
																/>
															</label>
															<label
																class="flex min-w-0 flex-col gap-1.5 text-sm text-white/80 2xl:text-base"
															>
																<span>結束<span class="required-mark">*</span></span>
																<input
																	v-model="rule.windowEnd"
																	type="time"
																	class="form-input-small w-full"
																	:aria-label="`時段 ${idx + 1} 結束時間`"
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
																	:aria-label="`時段 ${idx + 1} 全選星期`"
																	@click="handleSetAllDow(idx, true)"
																>
																	全選
																</button>
																<button
																	type="button"
																	class="text-white/45 underline-offset-2 transition-colors hover:text-white/70 hover:underline disabled:opacity-40"
																	:disabled="!canEdit"
																	:aria-label="`時段 ${idx + 1} 清除星期`"
																	@click="handleSetAllDow(idx, false)"
																>
																	清除
																</button>
															</div>
														</div>
														<div
															class="grid grid-cols-7 gap-1.5"
															role="group"
															:aria-label="`時段 ${idx + 1} 適用星期`"
														>
															<button
																v-for="d in DOW_OPTIONS"
																:key="d.value"
																type="button"
																class="rounded-lg border px-1 py-2 text-center text-xs transition-colors 2xl:text-sm"
																:class="
																	rule.daysOfWeek.includes(d.value)
																		? 'border-cyan-400/55 bg-cyan-500/25 font-medium text-white'
																		: 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/10 hover:text-white/80'
																"
																:aria-pressed="rule.daysOfWeek.includes(d.value)"
																:disabled="!canEdit"
																:aria-label="`時段 ${idx + 1} 星期${d.label}`"
																@click="
																	handleToggleDow(
																		idx,
																		d.value,
																		!rule.daysOfWeek.includes(d.value)
																	)
																"
															>
																{{ d.label }}
															</button>
														</div>
													</div>
												</div>
											</div>

											<div
												v-if="rules.length === 0"
												class="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-10 text-center"
											>
												<p class="text-sm font-medium text-white/75 2xl:text-base">
													尚無時段規則
												</p>
												<p class="mt-1 text-xs text-white/45 2xl:text-sm">
													未設定時不依時段告警；新增後僅時段外活動會寫入警報
												</p>
												<PermissionActionButton
													:allowed="canEdit"
													class="btn-secondary mt-4 px-3 py-1.5 text-sm"
													aria-label="新增時段"
													@click="handleAddRule"
												>
													＋ 新增時段
												</PermissionActionButton>
											</div>

											<PermissionActionButton
												v-if="rules.length > 0"
												:allowed="canEdit"
												class="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-3 py-2.5 text-sm text-cyan-100/90 transition-colors enabled:hover:border-cyan-400/40 enabled:hover:bg-cyan-500/10 2xl:text-base"
												aria-label="新增時段"
												@click="handleAddRule"
											>
												＋ 新增時段
											</PermissionActionButton>
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
							:allowed="canEdit && !!selectedRow"
							:disabled="saving || loading || !selectedRow"
							aria-label="儲存時段"
							class="btn-primary"
							@click="handleSave"
						>
							{{ saving ? "儲存中…" : "儲存時段" }}
						</PermissionActionButton>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { SecurityZone } from "~/types/security"
import { useSecurityApi } from "~/composables/systems/security/useSecurityApi"
import { useToast } from "~/composables/core/useToast"
import { TOAST } from "~/config/toastCatalog"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"

interface ScheduleDraft {
	name: string
	daysOfWeek: number[]
	windowStart: string
	windowEnd: string
	enabled: boolean
}

interface LocationRow {
	key: string
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
	/** 由頁面傳入，避免對話框重複查權限 */
	canEdit?: boolean
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
}>()

const securityApi = useSecurityApi()
const toast = useToast()

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

const selectedKey = ref("")
const rules = ref<ScheduleDraft[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref("")

const zoneGroups = computed((): ZoneGroup[] => {
	const groups: ZoneGroup[] = []
	for (const zone of props.zones || []) {
		const locations: LocationRow[] = []
		for (const loc of zone.locations || []) {
			const id = Number(loc.id)
			if (!Number.isFinite(id) || id <= 0) continue
			locations.push({
				key: `${zone.id || zone.name}-${id}`,
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

const selectedRow = computed(
	() => locationRows.value.find((r) => r.key === selectedKey.value) ?? null
)

const selectedLabel = computed(() => {
	const row = selectedRow.value
	return row ? `${row.zoneName}／${row.locationName}` : ""
})

const toDraft = (r: {
	name?: string
	daysOfWeek?: number[]
	windowStart?: string
	windowEnd?: string
	enabled?: boolean
}): ScheduleDraft => ({
	name: r.name || "",
	daysOfWeek:
		Array.isArray(r.daysOfWeek) && r.daysOfWeek.length ? r.daysOfWeek : [...ALL_DOW],
	windowStart: String(r.windowStart || "00:00").slice(0, 5),
	windowEnd: String(r.windowEnd || "23:59").slice(0, 5),
	enabled: r.enabled !== false,
})

const toHhMmSs = (t: string) => (t.length === 5 ? `${t}:00` : t)

const loadRules = async (locationId: number) => {
	loading.value = true
	errorMessage.value = ""
	try {
		const res = await securityApi.getSchedules(locationId)
		rules.value = (res.rules || []).map(toDraft)
	} catch (err: unknown) {
		errorMessage.value = err instanceof Error ? err.message : "載入時段失敗"
		rules.value = []
	} finally {
		loading.value = false
	}
}

const handleSelectLocation = (row: LocationRow) => {
	selectedKey.value = row.key
	void loadRules(row.locationId)
}

const handleClose = () => emit("update:modelValue", false)

const handleAddRule = () => {
	rules.value.push({
		name: "",
		daysOfWeek: [1, 2, 3, 4, 5],
		windowStart: "08:00",
		windowEnd: "18:00",
		enabled: true,
	})
}

const handleRemoveRule = (idx: number) => {
	rules.value.splice(idx, 1)
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

const handleSave = async () => {
	const row = selectedRow.value
	if (!row || !canEdit.value) return

	const emptyDow = rules.value.findIndex((r) => !r.daysOfWeek.length)
	if (emptyDow >= 0) {
		errorMessage.value = `時段 ${emptyDow + 1} 須至少選擇一天`
		return
	}

	saving.value = true
	errorMessage.value = ""
	try {
		const res = await securityApi.putSchedules(
			row.locationId,
			rules.value.map((r) => ({
				name: r.name,
				daysOfWeek: r.daysOfWeek,
				windowStart: toHhMmSs(r.windowStart),
				windowEnd: toHhMmSs(r.windowEnd),
				enabled: r.enabled,
			}))
		)
		rules.value = (res.rules || []).map(toDraft)
		toast.success(TOAST.SETTINGS_SAVED)
	} catch (err: unknown) {
		errorMessage.value = err instanceof Error ? err.message : "儲存時段失敗"
		toast.error(errorMessage.value)
	} finally {
		saving.value = false
	}
}

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		errorMessage.value = ""
		const first = locationRows.value[0]
		if (first) handleSelectLocation(first)
		else {
			selectedKey.value = ""
			rules.value = []
		}
	}
)
</script>
