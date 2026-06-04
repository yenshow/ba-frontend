import type { User } from "~/types/user";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { useUserApi } from "~/composables/systems/users/useUserApi";

/** 管理端一鍵重設密碼（與後端最小長度 6 一致） */
export const DEFAULT_RESET_PASSWORD = "12345678";

/** `/core/account` 僅非 admin 可進入 */
export const canAccessAccountPage = (actor: Pick<User, "role"> | null | undefined): boolean =>
	!!actor && actor.role !== "admin";

/** 用戶管理列表是否顯示「重設密碼」 */
export const canResetPasswordForUser = (
	actor: Pick<User, "id" | "role"> | null | undefined,
	target: Pick<User, "id" | "role">
): boolean => {
	if (!actor || actor.id === target.id) return false;
	if (actor.role === "admin") {
		return target.role === "user";
	}
	return false;
};

const ROLE_LABELS: Record<string, string> = {
	admin: "管理員",
	user: "使用者"
};

const STATUS_LABELS: Record<"active" | "inactive", string> = {
	active: "啟用",
	inactive: "停用"
};

export const useAccountSettings = () => {
	const { user, logout } = useAuth();
	const userApi = useUserApi();
	const toast = useToast();
	const { handleError: handleApiError } = useErrorHandler();

	const roleLabel = computed(() =>
		user.value?.role ? (ROLE_LABELS[user.value.role] ?? user.value.role) : "—"
	);
	const statusLabel = computed(() => (user.value?.status ? STATUS_LABELS[user.value.status] : "—"));

	const form = reactive({
		oldPassword: "",
		newPassword: "",
		confirmPassword: ""
	});

	const isSubmitting = ref(false);
	const errorMessage = ref<string | null>(null);

	const handleSubmit = async () => {
		errorMessage.value = null;

		if (form.newPassword !== form.confirmPassword) {
			errorMessage.value = "新密碼與確認密碼不一致";
			return;
		}

		if (!user.value) return;

		isSubmitting.value = true;
		try {
			await userApi.updatePassword(user.value.id, {
				oldPassword: form.oldPassword,
				newPassword: form.newPassword
			});
			toast.success("密碼已更新，請重新登入");
			logout();
			await navigateTo("/login");
		} catch (error) {
			errorMessage.value = handleApiError(error, "變更密碼失敗") || "變更密碼失敗";
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
		handleSubmit
	};
};
