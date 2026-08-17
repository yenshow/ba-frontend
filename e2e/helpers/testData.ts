/** E2E 測試資料前綴：可辨識、可清理 */
export const E2E_PREFIX = "E2E-"

export const makeE2eTag = () => {
	const stamp = Date.now().toString(36)
	const rand = Math.random().toString(36).slice(2, 6)
	return `${E2E_PREFIX}${stamp}-${rand}`
}

/** 人員 ID 僅允許較短字串時用 */
export const makeE2eEmployeeNo = () => {
	const stamp = Date.now().toString().slice(-8)
	const rand = Math.floor(Math.random() * 90 + 10)
	return `E${stamp}${rand}`
}
