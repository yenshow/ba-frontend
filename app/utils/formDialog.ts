import type { ConfirmDialogConfig } from "~/composables/core/useConfirmDialog"

/** 表單／Dialog 有未儲存變更時，關閉前確認（SSOT） */
export const FORM_UNSAVED_CLOSE_CONFIRM: ConfirmDialogConfig = {
	title: "確認關閉",
	message: "您有尚未儲存的變更，確定要關閉嗎？",
	details: "未儲存的變更將會遺失。",
	type: "warning",
}

export type UnsavedCloseConfirmOptions = {
	/** 插入 message 括號內的補充，例如「含新增區域」 */
	contextHint?: string
	/** 附加於 base details 之後的補充句 */
	extraDetails?: string
}

/** 依情境擴充未儲存關閉確認（預設文案見 FORM_UNSAVED_CLOSE_CONFIRM） */
export const buildUnsavedCloseConfirm = (
	options: UnsavedCloseConfirmOptions = {},
): ConfirmDialogConfig => {
	const { contextHint, extraDetails } = options
	const message = contextHint
		? `您有尚未儲存的變更（${contextHint}）。確定要關閉嗎？`
		: FORM_UNSAVED_CLOSE_CONFIRM.message
	const details = extraDetails
		? `${FORM_UNSAVED_CLOSE_CONFIRM.details} ${extraDetails}`
		: FORM_UNSAVED_CLOSE_CONFIRM.details
	return {
		...FORM_UNSAVED_CLOSE_CONFIRM,
		message,
		details,
	}
}
