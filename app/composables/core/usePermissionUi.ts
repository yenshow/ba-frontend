import { computed, toValue, type MaybeRefOrGetter } from "vue"

const DISABLED_BTN_CLASS = "cursor-not-allowed opacity-50"

/** 工地監控頁（人流／環境／車輛）右上角操作鈕共用樣式 */
export const MONITORING_ACTION_BTN_CLASS =
	"rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all 2xl:text-base"

export const MONITORING_ACTION_BTN_HOVER_CLASS =
	"hover:from-cyan-400/40 hover:to-blue-500/40"

/** 固定版位按鈕：無權限時 disabled + 半透明（不 v-if 隱藏） */
export const usePermissionButtonState = (allowed: MaybeRefOrGetter<boolean>) =>
	computed(() => {
		const ok = toValue(allowed)
		return {
			disabled: !ok,
			class: ok ? "" : DISABLED_BTN_CLASS,
			title: ok ? undefined : "權限不足",
		}
	})
