<template>
	<section
		class="mb-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-white/90"
		aria-label="手動警報測試面板"
	>
		<header class="mb-3 flex flex-wrap items-center justify-center gap-2">
			<div class="h-3 w-3 rounded-full bg-amber-300"></div>
			<h3 class="text-xl font-semibold tracking-[4px]">手動警報</h3>
		</header>

		<fieldset :disabled="!canAdmin" class="min-w-0 border-0 p-0">
			<label class="block">
				<span class="mb-2 block text-base text-white/75">目標點位</span>
				<FilterDropdown
					v-model="selectedTargetId"
					:options="targetDropdownOptions"
					placeholder="請選擇"
					text-size="text-base"
					aria-label="選擇目標點位"
				/>
			</label>

			<label v-if="selectedRuleOptions.length > 0" class="mt-3 block">
				<span class="mb-2 block text-base text-white/75">規則／通道</span>
				<FilterDropdown
					v-model="selectedRuleOptionId"
					:options="ruleBitDropdownOptions"
					placeholder="請選擇"
					text-size="text-base"
					aria-label="選擇規則或通道"
				/>
			</label>
			<p
				v-else-if="selectedTargetId && allowManualFallback"
				class="mt-3 text-sm leading-relaxed text-white/55"
				role="note"
			>
				此點位無可用規則；將以泛用手動警報送出（與「警報設定」規則無連動）。
			</p>
			<p
				v-else-if="selectedTargetId && !allowManualFallback"
				class="mt-3 text-sm text-amber-200/90"
				role="alert"
			>
				此點位無可用規則，無法操作。
			</p>

			<div class="mt-3 flex justify-center items-center gap-8">
				<PermissionActionButton
					:allowed="canSubmit"
					aria-label="觸發警報"
					class="btn-primary"
					@click="handleTriggerAlert"
				>
					觸發警報
				</PermissionActionButton>
				<PermissionActionButton
					:allowed="canSubmit"
					aria-label="清除警報"
					class="btn-secondary"
					@click="handleClearAlert"
				>
					清除警報
				</PermissionActionButton>
			</div>
		</fieldset>
	</section>
</template>

<script setup lang="ts">
import { TOAST } from "~/config/toastCatalog"
import { computed, ref, watch } from "vue"
import type { ManualIssueChangedPayload, ManualIssueRuleBitOption } from "~/utils/alertUtils"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import { useToast } from "~/composables/core/useToast"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import { useAdminOnly } from "~/composables/core/useAuth"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useSystemManualAlertApi } from "~/composables/systems/alerts/useSystemManualAlertApi"

type TargetOption = { id: string; label: string }

interface Props {
	systemRoutePrefix: string
	targets: TargetOption[]
	defaultTargetId?: string
	/** 依 systemId 對應可選的 DI/DO bit_state 規則（來自 GET /alerts/rules） */
	ruleBitOptionsByTargetId?: Record<string, ManualIssueRuleBitOption[]>
	/** 無規則時仍呼叫 mode=manual */
	allowManualFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	allowManualFallback: true,
})

const emit = defineEmits<{
	(e: "changed", payload: ManualIssueChangedPayload): void
}>()

const canAdmin = useAdminOnly()
const toast = useToast()
const { handleError } = useErrorHandler()
const manualAlertApi = useSystemManualAlertApi(props.systemRoutePrefix)

const selectedTargetId = ref(props.defaultTargetId || "")
const selectedRuleOptionId = ref("")
const isBusy = ref(false)

const removeIdFromLabel = (label: string): string => {
	const cleaned = label
		// 移除任何「(123)」或「（123）」這類純數字 ID
		.replace(/\s*[\(（]\s*\d+\s*[\)）]\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim()
	return cleaned
}

const targetDropdownOptions = computed(() =>
	props.targets.map((t) => ({
		value: t.id,
		label: removeIdFromLabel(t.label),
	}))
)

const selectedRuleOptions = computed((): ManualIssueRuleBitOption[] => {
	const id = selectedTargetId.value
	if (!id) return []
	return props.ruleBitOptionsByTargetId?.[id] ?? []
})

const ruleBitDropdownOptions = computed(() =>
	selectedRuleOptions.value.map((o) => ({
		value: String(o.ruleId),
		label: o.label,
	}))
)

const effectiveRuleTrigger = computed((): { alert_type: "di" | "do"; bit_key: string } | null => {
	const opts = selectedRuleOptions.value
	const id = selectedRuleOptionId.value
	if (opts.length === 0 || !id) return null
	const found = opts.find((o) => String(o.ruleId) === id)
	if (!found) return null
	return { alert_type: found.alert_type, bit_key: found.bit_key }
})

const usesRuleMode = computed(() => selectedRuleOptions.value.length > 0)

const canSubmit = computed(() => {
	if (!selectedTargetId.value || isBusy.value) return false
	if (usesRuleMode.value) {
		return effectiveRuleTrigger.value != null
	}
	return props.allowManualFallback
})

watch(
	() => props.defaultTargetId,
	(next) => {
		if (!selectedTargetId.value && next) selectedTargetId.value = next
	}
)

watch([selectedTargetId, selectedRuleOptions], () => {
	const first = selectedRuleOptions.value[0]
	selectedRuleOptionId.value = first ? String(first.ruleId) : ""
})

const handleTriggerAlert = async () => {
	if (!selectedTargetId.value) return
	if (!canSubmit.value) return
	isBusy.value = true
	try {
		if (usesRuleMode.value && effectiveRuleTrigger.value) {
			await manualAlertApi.triggerManualAlert(selectedTargetId.value, {
				mode: "rule",
				rule: effectiveRuleTrigger.value,
			})
		} else if (props.allowManualFallback) {
			await manualAlertApi.triggerManualAlert(selectedTargetId.value, { mode: "manual" })
		} else {
			return
		}
		emit("changed", {
			systemId: selectedTargetId.value,
			action: "trigger",
			rule:
				usesRuleMode.value && effectiveRuleTrigger.value ? effectiveRuleTrigger.value : undefined,
		})
		toast.success(TOAST.ALERT_TRIGGERED)
	} catch (error) {
		handleError(error, "觸發警報失敗")
	} finally {
		isBusy.value = false
	}
}

const handleClearAlert = async () => {
	if (!selectedTargetId.value) return
	if (!canSubmit.value) return
	isBusy.value = true
	try {
		if (usesRuleMode.value && effectiveRuleTrigger.value) {
			await manualAlertApi.clearManualAlert(selectedTargetId.value, {
				mode: "rule",
				rule: effectiveRuleTrigger.value,
			})
		} else if (props.allowManualFallback) {
			await manualAlertApi.clearManualAlert(selectedTargetId.value, { mode: "manual" })
		} else {
			return
		}
		emit("changed", {
			systemId: selectedTargetId.value,
			action: "clear",
		})
		toast.success(TOAST.ALERT_CLEARED)
	} catch (error) {
		handleError(error, "清除警報失敗")
	} finally {
		isBusy.value = false
	}
}
</script>
