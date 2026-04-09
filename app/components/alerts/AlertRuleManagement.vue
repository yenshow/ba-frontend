<template>
	<section class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8">
		<div class="min-h-[500px]">
			<div v-if="isRulesLoading" class="py-16 text-center text-white/70">警報定義載入中...</div>
			<div
				v-else-if="rules.length === 0"
				class="flex min-h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-white/5 p-10 text-center text-white/80"
			>
				目前沒有警報定義
			</div>
			<Transition v-else name="fade" mode="out-in">
				<div :key="`rules-${ruleOffset}-${rules.length}`">
					<table class="w-full text-center">
						<thead>
							<tr class="border-b border-white/20">
								<th :class="tableHeaderClass">#</th>
								<th :class="tableHeaderClass">目標</th>
								<th :class="tableHeaderClass">條件</th>
								<th :class="tableHeaderClass">類型</th>
								<th :class="tableHeaderClass">狀態</th>
								<th :class="tableHeaderClass">狀態</th>
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
										{{ rule.alert_type }}
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
									<div class="flex flex-wrap gap-2 2xl:gap-3">
										<button
											type="button"
											class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
											@click="openEditRuleDialog(rule)"
										>
											編輯
										</button>
										<button
											type="button"
											class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
											@click="handleDeleteRule(rule)"
										>
											刪除
										</button>
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
			</Transition>
		</div>
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
</template>

<script setup lang="ts">
import type {
	AlertSource,
	AlertRule,
	AlertSeverity,
	AlertType,
	CreateAlertRulePayload,
	UpdateAlertRulePayload,
} from "~/types/alert"
import type { UnifiedZone } from "~/types/location"
import Pagination from "~/components/common/Pagination.vue"
import AlertRuleDialog from "~/components/alerts/AlertRuleDialog.vue"
import { useLocationApi } from "~/composables/location/api/useLocationApi"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import {
	alertSourceToSystemType,
	formatAlertRuleConditionDisplay,
	getSeverityLabel,
} from "~/utils/alertUtils"

const alertApi = useAlertApi()
const locationApi = useLocationApi()
const toast = useToast()
const { handleError: handleApiError } = useErrorHandler()

const zonesBySource = ref<Partial<Record<AlertSource, UnifiedZone[]>>>({})

const loadZonesForRulesSources = async () => {
	const sources = [...new Set(rules.value.map((r) => r.source))]
	const updates: Partial<Record<AlertSource, UnifiedZone[]>> = {}
	await Promise.all(
		sources.map(async (source) => {
			const systemType = alertSourceToSystemType(source)
			if (!systemType) return
			try {
				const result = await locationApi.getZones(systemType)
				updates[source] = result.zones || []
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
	{ value: "lighting", label: "照明系統" },
	{ value: "drainage", label: "衛生排水系統" },
	{ value: "power", label: "電力系統" },
	{ value: "people_counting", label: "人流系統" },
	{ value: "hvac", label: "空調系統" },
	{ value: "fire", label: "消防系統" },
	{ value: "emergency_rescue", label: "緊急求救系統" },
	{ value: "security", label: "安防系統" },
]

const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80"
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6"

const loadRules = async () => {
	isRulesLoading.value = true
	try {
		const sourcesToLoad = selectedRuleSource.value
			? [selectedRuleSource.value]
			: ruleSourceOptions.filter((item) => item.value).map((item) => item.value as AlertSource)

		const requests = sourcesToLoad.map((source) =>
			selectedRuleType.value
				? alertApi.getAlertRules(source, selectedRuleType.value)
				: alertApi.getAlertRules(source)
		)
		const results = await Promise.all(requests)
		const mergedRules = results.flatMap((result) => result.rules)

		rules.value = mergedRules
			.filter(
				(rule, index, arr) => arr.findIndex((candidate) => candidate.id === rule.id) === index
			)
			.sort((a, b) => b.id - a.id)
		ruleOffset.value = 0
	} catch (error) {
		handleApiError(error, "載入警報規則失敗")
	} finally {
		isRulesLoading.value = false
	}
	await loadZonesForRulesSources()
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
			const loc = (z.locations || []).find(
				(l) => Number(l.id) === Number(rule.target_id)
			)
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

const handleSubmitRule = async (payload: CreateAlertRulePayload) => {
	isRuleSaving.value = true
	try {
		if (editingRule.value) {
			await alertApi.updateAlertRule(editingRule.value.id, payload as UpdateAlertRulePayload)
			toast.success("警報定義已更新", 3000)
		} else {
			await alertApi.createAlertRule(payload)
			toast.success("警報定義已建立", 3000)
		}
		closeRuleDialog()
		await loadRules()
	} catch (error) {
		handleApiError(error, editingRule.value ? "更新警報定義失敗" : "建立警報定義失敗")
	} finally {
		isRuleSaving.value = false
	}
}

const handleDeleteRule = async (rule: AlertRule) => {
	if (!confirm("確定要刪除此警報定義嗎？")) {
		return
	}
	try {
		await alertApi.deleteAlertRule(rule.id)
		toast.success("警報定義已刪除", 3000)
		await loadRules()
	} catch (error) {
		handleApiError(error, "刪除警報定義失敗")
	}
}

const paginatedRules = computed(() =>
	rules.value.slice(ruleOffset.value, ruleOffset.value + ruleLimit)
)

const getRuleStatusBadgeClass = (enabled: boolean) =>
	enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-yellow-500/20 text-yellow-200"

/** 與 users.vue 角色徽章色階一致之警報類型區分 */
const getAlertTypeBadgeClass = (type: AlertType) => {
	const classes: Record<AlertType, string> = {
		offline: "bg-gray-500/20 text-gray-200",
		error: "bg-red-500/20 text-red-200",
		threshold: "bg-blue-500/20 text-blue-200",
		di: "bg-emerald-500/20 text-emerald-200",
		do: "bg-sky-500/20 text-sky-200",
	}
	return classes[type] ?? "bg-gray-500/20 text-gray-200"
}

/** 與 users.vue 狀態徽章色階一致之嚴重度區分 */
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
