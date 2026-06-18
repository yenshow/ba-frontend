export const MIN_USER_PASSWORD_LENGTH = 6

export type UserFormValidationInput = {
	username: string
	password: string
	isEditing: boolean
}

export type AccountPasswordValidationInput = {
	oldPassword: string
	newPassword: string
	confirmPassword: string
}

/** 用戶管理表單儲存前集中驗證；對齊後端 userService.createManagedUser */
export const validateUserFormForSave = (input: UserFormValidationInput): string | null => {
	const username = input.username.trim()
	if (!username) return "請輸入帳號"
	if (!input.isEditing && (!input.password || input.password.length < MIN_USER_PASSWORD_LENGTH)) {
		return `密碼至少需要 ${MIN_USER_PASSWORD_LENGTH} 個字元`
	}
	return null
}

/** 變更密碼儲存前集中驗證；對齊後端 userService.updatePassword */
export const validateAccountPasswordForSave = (
	input: AccountPasswordValidationInput,
): string | null => {
	const oldPassword = String(input.oldPassword || "").trim()
	const newPassword = String(input.newPassword || "")
	const confirmPassword = String(input.confirmPassword || "")

	if (!oldPassword) return "請輸入舊密碼"
	if (!newPassword) return "請輸入新密碼"
	if (newPassword.length < MIN_USER_PASSWORD_LENGTH) {
		return `新密碼長度至少需要 ${MIN_USER_PASSWORD_LENGTH} 個字元`
	}
	if (newPassword !== confirmPassword) return "新密碼與確認密碼不一致"
	return null
}
