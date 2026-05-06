import { computed, ref, unref, watch, type Ref } from "vue"
import type { AlertRule, AlertSource } from "~/types/alert"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import {
	buildManualIssueRuleBitOptionsBySystemId,
	type ManualIssueZoneLike,
} from "~/utils/alertUtils"

/**
 * 載入指定來源之警報規則，並依 zones/locations 算出「手動警報 → 規則／bit_key」下拉資料。
 */
export const useManualIssueDiDoRules = (params: {
	alertRulesSource: AlertSource
	zones: Ref<ManualIssueZoneLike[]>
	isAdmin: Ref<boolean>
}) => {
	const alertApi = useAlertApi()
	const { handleError } = useErrorHandler()

	const rules = ref<AlertRule[]>([])
	const loadedOnce = ref(false)

	const loadRules = async () => {
		if (!unref(params.isAdmin)) return
		if (loadedOnce.value) return
		try {
			const res = await alertApi.getAlertRules(params.alertRulesSource)
			rules.value = res.rules ?? []
			loadedOnce.value = true
		} catch (error) {
			handleError(error, "載入警報規則失敗")
		}
	}

	watch(
		() => unref(params.isAdmin),
		(admin) => (admin ? void loadRules() : undefined),
		{ immediate: true }
	)

	const ruleBitOptionsByTargetId = computed(() =>
		buildManualIssueRuleBitOptionsBySystemId(rules.value, params.zones.value)
	)

	return {
		ruleBitOptionsByTargetId,
	}
}
