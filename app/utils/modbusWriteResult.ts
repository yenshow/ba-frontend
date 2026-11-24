/**
 * Modbus 寫入 API 在 HTTP 成功 envelope 內仍可能回傳 success: false。
 * 呼叫端必須檢查此欄位，不可只依請求「完成」判定成功。
 */
export const assertModbusWriteOk = (
	result: { success?: boolean } | null | undefined,
	label = "設備寫入失敗"
): void => {
	if (!result || result.success !== true) {
		throw new Error(label)
	}
}
