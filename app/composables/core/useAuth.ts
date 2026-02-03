import type { User, LoginCredentials } from "~/types/user";
import { useUserApi } from "~/composables/systems/useUserApi";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天
const cookieOptions = {
	secure: process.env.NODE_ENV === "production",
	sameSite: "strict" as const,
	maxAge: COOKIE_MAX_AGE,
	httpOnly: false
};

export const useAuth = () => {
	const userApi = useUserApi();

	const tokenCookie = useCookie<string | null>("auth_token", {
		default: () => null,
		...cookieOptions
	});

	const userCookie = useCookie<User | null>("auth_user", {
		default: () => null,
		...cookieOptions
	});

	const user = useState<User | null>("auth_user", () => userCookie.value);
	const token = useState<string | null>("auth_token", () => tokenCookie.value);

	const isAuthenticated = computed(() => !!token.value && !!user.value);
	const isAdmin = computed(() => user.value?.role === "admin");
	const isOperator = computed(() => user.value?.role === "operator" || user.value?.role === "admin");
	const isViewer = computed(() => user.value?.role === "viewer" || isOperator.value);

	const setUser = (u: User | null) => {
		userCookie.value = u;
		user.value = u;
	};

	const logout = () => {
		tokenCookie.value = null;
		userCookie.value = null;
		token.value = null;
		user.value = null;
	};

	const login = async (credentials: LoginCredentials) => {
		try {
			const response = await userApi.login(credentials);
			tokenCookie.value = response.token;
			token.value = response.token;
			setUser(response.user);
			return response;
		} catch (error) {
			logout();
			throw error;
		}
	};

	const fetchUser = async () => {
		try {
			const currentUser = await userApi.getMe();
			setUser(currentUser);
			return currentUser;
		} catch (error) {
			logout();
			throw error;
		}
	};

	const init = async () => {
		token.value = tokenCookie.value;
		user.value = userCookie.value;

		if (token.value && user.value) {
			try {
				setUser(await userApi.getMe());
			} catch {
				// 401 等由 useApiBase 處理 logout 與導向登入
			}
		}
	};

	return {
		user: readonly(user),
		token: readonly(token),
		isAuthenticated,
		isAdmin,
		isOperator,
		isViewer,
		login,
		logout,
		fetchUser,
		init
	};
};
