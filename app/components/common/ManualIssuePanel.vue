<template>
	<section
		v-if="isAdmin"
		class="mb-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-white/90"
		aria-label="手動警報測試面板"
	>
		<header class="mb-3 flex flex-wrap items-center justify-center gap-2">
			<div class="h-3 w-3 rounded-full bg-amber-300"></div>
			<h3 class="text-xl font-semibold tracking-[4px]">手動警報</h3>
		</header>

		<label class="block">
			<span class="mb-2 block text-base text-white/75">目標點位（systemId）</span>
			<FilterDropdown
				v-model="selectedTargetId"
				:options="targetDropdownOptions"
				placeholder="請選擇"
				text-size="text-base"
				aria-label="選擇目標點位"
			/>
		</label>

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="btn-primary"
				:disabled="isBusy || !selectedTargetId"
				@click="handleTriggerAlert"
			>
				{{ isBusy ? "送出中..." : "觸發警報" }}
			</button>
			<button
				type="button"
				class="btn-secondary"
				:disabled="isBusy || !selectedTargetId"
				@click="handleClearAlert"
			>
				清除警報
			</button>
		</div>
	</section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import { useAuth } from "~/composables/core/useAuth"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useSystemManualAlertApi } from "~/composables/systems/alerts/useSystemManualAlertApi"

type TargetOption = { id: string; label: string }

interface Props {
	systemRoutePrefix: string
	targets: TargetOption[]
	defaultTargetId?: string
	/** 用既有規則觸發（例如 DI0）；不提供則走既有 manual alarm */
	ruleTrigger?: { alert_type: "di" | "do"; bit_key: string } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
	(e: "changed"): void
}>()

const { isAdmin } = useAuth()
const { handleError } = useErrorHandler()
const manualAlertApi = useSystemManualAlertApi(props.systemRoutePrefix)

const selectedTargetId = ref(props.defaultTargetId || "")
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

watch(
	() => props.defaultTargetId,
	(next) => {
		if (!selectedTargetId.value && next) selectedTargetId.value = next
	}
)

const handleTriggerAlert = async () => {
	if (!isAdmin.value) return
	if (!selectedTargetId.value) return
	isBusy.value = true
	try {
		if (props.ruleTrigger) {
			await manualAlertApi.triggerManualAlert(selectedTargetId.value, {
				mode: "rule",
				rule: props.ruleTrigger,
			})
		} else {
			await manualAlertApi.triggerManualAlert(selectedTargetId.value, { mode: "manual" })
		}
		emit("changed")
	} catch (error) {
		handleError(error, "觸發警報失敗")
	} finally {
		isBusy.value = false
	}
}

const handleClearAlert = async () => {
	if (!isAdmin.value) return
	if (!selectedTargetId.value) return
	isBusy.value = true
	try {
		if (props.ruleTrigger) {
			await manualAlertApi.clearManualAlert(selectedTargetId.value, {
				mode: "rule",
				rule: props.ruleTrigger,
			})
		} else {
			await manualAlertApi.clearManualAlert(selectedTargetId.value, { mode: "manual" })
		}
		emit("changed")
	} catch (error) {
		handleError(error, "清除警報失敗")
	} finally {
		isBusy.value = false
	}
}
</script>
