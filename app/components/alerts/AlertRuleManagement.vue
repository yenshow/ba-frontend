<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<AsyncPanel
			:loading="isRulesLoading"
			:empty="!isRulesLoading && !rulesLoadError && rules.length === 0"
			:error="rulesLoadError"
			empty-title="目前沒有警報定義"
		>
			<div :key="`rules-${ruleOffset}-${rules.length}`">
				<table class="w-full text-center">
					<thead>
						<tr class="border-b border-white/20">
							<th :class="tableHeaderClass">#</th>
							<th :class="tableHeaderClass">目標</th>
							<th :class="tableHeaderClass">條件</th>
							<th :class="tableHeaderClass">類型</th>
							<th :class="tableHeaderClass">層級</th>
							<th :class="tableHeaderClass">狀態</th>
							<th :class="tableHeaderClass">連動</th>
							<th :class="tableHeaderClass">操作</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="(rule, index) in paginatedRules"
							:key="rule.id"
							class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
						>
							<td :class="tableCellClass">{{ ruleOffset + index + 1 }}</td>
							<td :class="[tableCellClass, 'text-white/70']">
								{{ getRuleTargetText(rule) }}
							</td>
							<td :class="[tableCellClass, 'text-white/70']">
								{{ formatAlertRuleConditionDisplay(rule) }}
							</td>
							<td :class="tableCellClass">
								<span
									:class="[
										getAlertTypeBadgeClass(rule.alert_type),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
									]"
								>
									{{ getAlertTypeLabel(rule.alert_type) }}
								</span>
							</td>
							<td :class="tableCellClass">
								<span
									:class="[
										getSeverityBadgeClass(rule.severity),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
									]"
								>
									{{ getSeverityLabel(rule.severity) }}
								</span>
							</td>
							<td :class="tableCellClass">
								<span
									:class="[
										getRuleStatusBadgeClass(rule.enabled),
										'rounded px-2 py-1 2xl:px-3 2xl:py-1.5',
									]"
								>
									{{ rule.enabled ? "啟用" : "停用" }}
								</span>
							</td>
							<td :class="tableCellClass">
								<div class="flex flex-wrap items-center justify-center gap-1.5">
									<template v-if="getIntegrationSummary(rule.id).hasAny">
										<span
											v-if="getIntegrationSummary(rule.id).cameraEnabled"
											class="rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-100 2xl:text-sm"
											>攝影機</span
										>
										<span
											v-if="getIntegrationSummary(rule.id).emailEnabled"
											class="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-100 2xl:text-sm"
										>
											Email
										</span>
									</template>
									<span v-else class="text-sm text-white/40">—</span>
								</div>
							</td>
							<td :class="tableCellClass">
								<div class="flex flex-wrap gap-2 2xl:gap-3">
									<PermissionActionButton
										:allowed="canUpdateRule"
										aria-label="編輯警報規則"
										class="btn-list-edit"
										@click="openEditRuleDialog(rule)"
										>編輯</PermissionActionButton
									>
									<PermissionActionButton
										:allowed="canDeleteRule"
										aria-label="刪除警報規則"
										class="btn-list-delete"
										@click="handleDeleteRule(rule)"
										>刪除</PermissionActionButton
									>
								</div>
							</td>
						</tr>
					</tbody>
				</table>

				<Pagination
					v-if="rules.length > ruleLimit"
					:total="rules.length"
					:offset="ruleOffset"
					:limit="ruleLimit"
					:disabled="isRulesLoading"
					@previous="goToPreviousRulePage"
					@next="goToNextRulePage"
				/>
			</div>
		</AsyncPanel>
	</section>

	<AlertRuleDialog
		v-model="showRuleDialog"
		:editing-rule="editingRule"
		:is-submitting="isRuleSaving"
		:source-options="ruleSourceOptions"
		@submit="handleSubmitRule"
		@update:model-value="
			(value) => {
				if (!value) {
					closeRuleDialog()
				}
			}
		"
	/>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		:confirm-text="confirmDialogConfig.confirmText"
		:cancel-text="confirmDialogConfig.cancelText"
		@confirm="handleConfirmDeleteRule"
		@cancel="handleCancelDeleteRule"
	/>
</template>

<script setup lang="ts">
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import type {
	AlertSource,
	AlertRule,
	AlertSeverity,
	AlertType,
	AlertRuleIntegrationSummary,
	CreateAlertRulePayload,
	UpdateAlertRulePayload,
} from "~/types/alert"
import type { UnifiedZone } from "~/types/location"
import AsyncPanel from "~/components/common/AsyncPanel.vue"
import Pagination from "~/components/common/Pagination.vue"
import AlertRuleDialog from "~/components/alerts/AlertRuleDialog.vue"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import { useZonesCache } from "~/composables/location/cache/useZonesCache"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useAlertRuleIntegrationsStore } from "~/composables/systems/alerts/useAlertRuleIntegrationsStore"
import { useAlertRules } from "~/composables/monitoring/useAlertRules"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import {
	alertSourceToSystemType,
	formatAlertRuleConditionDisplay,
	getSeverityLabel,
} from "~/utils/alertUtils"
import { useAlertLogRbac } from "~/composables/core/useAccessGate"

const { canUpdateRule, canDeleteRule } = useAlertLogRbac()

const alertApi = useAlertApi()
const zonesCache = useZonesCache()
const integrationsStore = useAlertRuleIntegrationsStore()
const alertRules = useAlertRules()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()

const confirmDialog = useConfirmDialog()
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})
const confirmDialogConfig = computed(() => confirmDialog.config.value)
const pendingDeleteRuleId = ref<number | null>(null)

const zonesBySource = ref<Partial<Record<AlertSource, UnifiedZone[]>>>({})

const loadZonesForRulesSources = async () => {
	const sources = [...new Set(rules.value.map((r) => r.source))]
	const sourcesToFetch = sources.filter((source) => zonesBySource.value[source] == null)
	if (sourcesToFetch.length === 0) return
	const updates: Partial<Record<AlertSource, UnifiedZone[]>> = {}
	await Promise.all(
		sourcesToFetch.map(async (source) => {
			const systemType = alertSourceToSystemType(source)
			if (!systemType) return
			try {
				const zones = await zonesCache.getZones(systemType)
				updates[source] = zones || []
			} catch {
				updates[source] = []
			}
		})
	)
	zonesBySource.value = { ...zonesBySource.value, ...updates }
}

const selectedRuleSource = defineModel<"" | AlertSource>("selectedRuleSource", { default: "" })
const selectedRuleType = defineModel<"" | AlertType>("selectedRuleType", {
	default: "",
})

const isRulesLoading = ref(false)
const rulesLoadError = ref<string | null>(null)
const isRuleSaving = ref(false)
const rules = ref<AlertRule[]>([])
const showRuleDialog = ref(false)
const editingRule = ref<AlertRule | null>(null)
const ruleOffset = ref(0)
const ruleLimit = 10

const ruleSourceOptions = [
	{ value: "", label: "全部系統" },
	{ value: "device", label: "設備系統" },
	{ value: "environment", label: "環境系統" },
	{ value: "people_counting", label: "人流統計" },
	{ value: "surveillance", label: "影像監控" },
	{ value: "vehicle_access", label: "車輛進出" },
]

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const getIntegrationSummary = (ruleId: number): AlertRuleIntegrationSummary =>
	integrationsStore.getSummary(ruleId)

const sortRulesList = (list: AlertRule[]): AlertRule[] =>
	list
		.filter(
			(rule, index, arr) => arr.findIndex((candidate) => candidate.id === rule.id) === index
		)
		.sort((a, b) => {
			const aTime = Number.isFinite(Date.parse(a.created_at)) ? Date.parse(a.created_at) : null
			const bTime = Number.isFinite(Date.parse(b.created_at)) ? Date.parse(b.created_at) : null
			if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime
			return a.id - b.id
		})

const rulePassesCurrentFilters = (rule: AlertRule): boolean =>
	(selectedRuleSource.value === "" || rule.source === selectedRuleSource.value) &&
	(selectedRuleType.value === "" || rule.alert_type === selectedRuleType.value)

const loadRules = async () => {
	isRulesLoading.value = true
	rulesLoadError.value = null
	try {
		const shouldLoadAllSources = selectedRuleSource.value === ""
		const mergedRules = shouldLoadAllSources
			? (await alertApi.getAllAlertRules()).rules
			: (await alertApi.getAlertRules(selectedRuleSource.value)).rules
		const filteredRules =
			selectedRuleType.value === ""
				? mergedRules
				: mergedRules.filter((r) => r.alert_type === selectedRuleType.value)

		rules.value = sortRulesList(filteredRules)
		ruleOffset.value = 0
	} catch (error) {
		rulesLoadError.value = handleApiError(error, "載入警報規則失敗") || "載入警報規則失敗"
	} finally {
		isRulesLoading.value = false
	}
	await loadZonesForRulesSources()
	await integrationsStore.prefetch(paginatedRules.value.map((r) => r.id))
}

const getRuleTargetText = (rule: AlertRule): string => {
	if (!rule.target_type || rule.target_id == null) return "全域"
	if (rule.target_type === "system") return `systemId=${rule.target_id}`

	const zones = zonesBySource.value[rule.source]
	if (rule.target_type === "zone") {
		const zone = zones?.find((z) => Number(z.id) === Number(rule.target_id))
		if (zone) return `${zone.name} - 區域`
		return `zoneId=${rule.target_id}`
	}
	if (rule.target_type === "location") {
		for (const z of zones || []) {
			const loc = (z.locations || []).find((l) => Number(l.id) === Number(rule.target_id))
			if (loc) return `${z.name} - ${loc.name}`
		}
		return `locationId=${rule.target_id}`
	}
	return "全域"
}

const openCreateRuleDialog = () => {
	editingRule.value = null
	showRuleDialog.value = true
}

defineExpose({ openCreateRuleDialog })

const openEditRuleDialog = (rule: AlertRule) => {
	editingRule.value = rule
	showRuleDialog.value = true
}

const closeRuleDialog = () => {
	showRuleDialog.value = false
	editingRule.value = null
}

const handleSubmitRule = async (payload: {
	rule: CreateAlertRulePayload
	integrations: Partial<{
		cameraLinkage: unknown
		emailSubscription: unknown
	}>
}) => {
	isRuleSaving.value = true
	try {
		const rulePayload = payload.rule
		const integrationsBody = payload.integrations || {}
		let ruleId: number | undefined

		if (editingRule.value) {
			ruleId = editingRule.value.id
			const updateRes = await alertApi.updateAlertRule(
				editingRule.value.id,
				rulePayload as UpdateAlertRulePayload
			)
			await alertApi.updateAlertRuleIntegrations(editingRule.value.id, integrationsBody as any)
			alertRules.clearCache(rulePayload.source)
			integrationsStore.invalidate(ruleId)

			if (updateRes?.rule) {
				const idx = rules.value.findIndex((r) => r.id === ruleId)
				if (idx !== -1) {
					if (rulePassesCurrentFilters(updateRes.rule)) {
						rules.value[idx] = updateRes.rule
					} else {
						rules.value.splice(idx, 1)
					}
				} else {
					await loadRules()
					closeRuleDialog()
					await integrationsStore.prefetch([ruleId])
					toast.success("警報定義已更新", 3000)
					return
				}
			} else {
				await loadRules()
				closeRuleDialog()
				await integrationsStore.prefetch([ruleId])
				toast.success("警報定義已更新", 3000)
				return
			}
			toast.success("警報定義已更新", 3000)
		} else {
			const created = await alertApi.createAlertRule(rulePayload)
			const newRule = created?.rule
			ruleId = newRule?.id
			if (ruleId) {
				await alertApi.updateAlertRuleIntegrations(ruleId, integrationsBody as any)
				integrationsStore.invalidate(ruleId)
			}
			alertRules.clearCache(rulePayload.source)

			if (newRule) {
				if (rulePassesCurrentFilters(newRule)) {
					rules.value = sortRulesList([...rules.value, newRule])
				}
			} else {
				await loadRules()
				closeRuleDialog()
				if (ruleId) await integrationsStore.prefetch([ruleId])
				toast.success("警報定義已建立", 3000)
				return
			}
			toast.success("警報定義已建立", 3000)
		}

		if (ruleId) await integrationsStore.prefetch([ruleId])
		await loadZonesForRulesSources()
		closeRuleDialog()
	} catch (error) {
		handleApiError(error, editingRule.value ? "更新警報定義失敗" : "建立警報定義失敗")
	} finally {
		isRuleSaving.value = false
	}
}

const handleDeleteRule = (rule: AlertRule) => {
	pendingDeleteRuleId.value = rule.id
	confirmDialog.show({
		title: "確認刪除",
		message: "確定要刪除此警報設定嗎？",
		details: "此操作無法復原。",
		type: "danger",
		confirmText: "刪除",
		cancelText: "取消",
	})
}

const handleConfirmDeleteRule = async () => {
	const id = pendingDeleteRuleId.value
	if (id == null) return
	const rule = rules.value.find((r) => r.id === id)
	if (!rule) {
		pendingDeleteRuleId.value = null
		return
	}
	try {
		await alertApi.deleteAlertRule(rule.id)
		alertRules.clearCache(rule.source)
		integrationsStore.invalidate(rule.id)
		toast.success("警報定義已刪除", 3000)
		await loadRules()
	} catch (error) {
		handleApiError(error, "刪除警報定義失敗")
	} finally {
		pendingDeleteRuleId.value = null
	}
}

const handleCancelDeleteRule = () => {
	pendingDeleteRuleId.value = null
}

const paginatedRules = computed(() =>
	rules.value.slice(ruleOffset.value, ruleOffset.value + ruleLimit)
)

watch(
	paginatedRules,
	(next) => {
		void integrationsStore.prefetch(next.map((r) => r.id))
	},
	{ immediate: true }
)

const getRuleStatusBadgeClass = (enabled: boolean) =>
	enabled ? "bg-emerald-500/20 text-emerald-100" : "bg-yellow-500/20 text-yellow-200"

const getAlertTypeBadgeClass = (type: AlertType) => {
	const classes: Record<AlertType, string> = {
		offline: "bg-gray-500/20 text-gray-200",
		error: "bg-red-500/20 text-red-200",
		threshold: "bg-blue-500/20 text-blue-200",
	}
	return classes[type] ?? "bg-gray-500/20 text-gray-200"
}

const getAlertTypeLabel = (type: AlertType) => {
	const labels: Record<AlertType, string> = {
		offline: "設備狀態警報",
		threshold: "環境參數警報",
		error: "系統錯誤警報",
	}
	return labels[type] ?? String(type)
}

const getSeverityBadgeClass = (severity: AlertSeverity) => {
	const classes: Record<AlertSeverity, string> = {
		warning: "bg-yellow-500/20 text-yellow-200",
		error: "bg-red-500/20 text-red-200",
		critical: "bg-red-500/30 text-red-100",
	}
	return classes[severity] ?? "bg-gray-500/20 text-gray-200"
}

const goToPreviousRulePage = () => {
	ruleOffset.value = Math.max(0, ruleOffset.value - ruleLimit)
}

const goToNextRulePage = () => {
	const nextOffset = ruleOffset.value + ruleLimit
	if (nextOffset >= rules.value.length) {
		return
	}
	ruleOffset.value = nextOffset
}

watch([selectedRuleSource, selectedRuleType], () => {
	ruleOffset.value = 0
	void loadRules()
})

onMounted(() => {
	void loadRules()
})
</script>
