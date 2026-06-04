import { computed, toValue, type MaybeRefOrGetter } from "vue"

const DISABLED_BTN_CLASS = "cursor-not-allowed opacity-50"

export const MONITORING_ACTION_BTN_CLASS =
	"rounded-xl border-2 border-cyan-300/50 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 px-4 py-2 text-sm text-white transition-all 2xl:text-base"

export const MONITORING_ACTION_BTN_HOVER_CLASS =
	"hover:from-cyan-400/40 hover:to-blue-500/40"

export const usePermissionButtonState = (allowed: MaybeRefOrGetter<boolean>) =>
	computed(() => {
		const ok = toValue(allowed)
		return {
			disabled: !ok,
			class: ok ? "" : DISABLED_BTN_CLASS,
			title: ok ? undefined : "權限不足",
		}
	})
