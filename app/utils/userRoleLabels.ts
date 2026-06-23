export const USER_ROLE_LABELS = {
	admin: "管理員",
	user: "操作員",
} as const;

export type UserRoleKey = keyof typeof USER_ROLE_LABELS;

export const getUserRoleLabel = (role?: string | null): string => {
	if (!role) return "—";
	return USER_ROLE_LABELS[role as UserRoleKey] ?? role;
};

export const getUserRoleFormOptions = (includeAdmin: boolean) => {
	const options: { value: UserRoleKey; label: string }[] = [
		{ value: "user", label: USER_ROLE_LABELS.user },
	];
	if (includeAdmin) {
		options.push({ value: "admin", label: USER_ROLE_LABELS.admin });
	}
	return options;
};
