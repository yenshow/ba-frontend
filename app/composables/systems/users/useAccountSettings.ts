import type { User } from "~/types/user";
import { isPlatformAdmin, useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { resolveFormApiError } from "~/utils/errorUtils";
import { validateAccountPasswordForSave } from "~/utils/userFormValidation";
import { useUserApi } from "~/composables/systems/users/useUserApi";
import { getUserRoleLabel } from "~/utils/userRoleLabels";

/** 管理端重設密碼／使用者端最小長度 6 一致 */
export const DEFAULT_RESET_PASSWORD = "12345678";

/** `/core/account`：平台 bootstrap admin 不可進入；一般管理員與 user 可進入 */
export const canAccessAccountPage = (
	actor: Pick<User, "username"> | null | undefined
): boolean => !!actor && !isPlatformAdmin(actor);

/** 用戶管理列表是否顯示重設密碼 */
export const canResetPasswordForUser = (
	actor: Pick<User, "id" | "role" | "username"> | null | undefined,
	target: Pick<User, "id" | "role">,
): boolean => {
	if (!actor || actor.id === target.id) return false;
	if (isPlatformAdmin(actor)) return true;
	if (actor.role === "admin") return target.role === "user";
	return false;
};

const STATUS_LABELS: Record<"active" | "inactive", string> = {
	active: "啟用",
	inactive: "停用",
};

export const useAccountSettings = () => {
	const { user, logout } = useAuth();
	const userApi = useUserApi();
	const toast = useToast();

	const roleLabel = computed(() => getUserRoleLabel(user.value?.role));
	const statusLabel = computed(() => (user.value?.status ? STATUS_LABELS[user.value.status] : "—"));

	const form = reactive({
		oldPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const isSubmitting = ref(false);
	const errorMessage = ref<string | null>(null);

	const handleSubmit = async () => {
		errorMessage.value = null;

		const formError = validateAccountPasswordForSave({
			oldPassword: form.oldPassword,
			newPassword: form.newPassword,
			confirmPassword: form.confirmPassword,
		});
		if (formError) {
			errorMessage.value = formError;
			return;
		}

		if (!user.value) return;

		isSubmitting.value = true;
		try {
			await userApi.updatePassword(user.value.id, {
				oldPassword: form.oldPassword,
				newPassword: form.newPassword,
			});
			toast.success("密碼已更新，請重新登入");
			await logout();
			await navigateTo("/login");
		} catch (error) {
			errorMessage.value = resolveFormApiError(error, "變更密碼失敗");
		} finally {
			isSubmitting.value = false;
		}
	};

	return {
		user,
		roleLabel,
		statusLabel,
		form,
		isSubmitting,
		errorMessage,
		handleSubmit,
	};
};
