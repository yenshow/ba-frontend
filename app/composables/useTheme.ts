export type Theme = "light" | "dark";

export const useTheme = () => {
	// 使用 cookie 儲存主題設定
	const themeCookie = useCookie<Theme>("theme", {
		default: () => "light",
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 365 // 1 年
	});

	// 響應式狀態
	const theme = useState<Theme>("theme", () => themeCookie.value);

	// 計算屬性
	const isDark = computed(() => theme.value === "dark");
	const isLight = computed(() => theme.value === "light");

	// 更新 HTML class 的輔助函數
	const updateDocumentClass = (currentTheme: Theme) => {
		if (process.client) {
			if (currentTheme === "dark") {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}
	};

	// 切換主題
	const toggleTheme = () => {
		theme.value = theme.value === "light" ? "dark" : "light";
		themeCookie.value = theme.value;
		updateDocumentClass(theme.value);
	};

	// 設定主題
	const setTheme = (newTheme: Theme) => {
		theme.value = newTheme;
		themeCookie.value = newTheme;
		updateDocumentClass(newTheme);
	};

	// 初始化時設定 HTML class
	if (process.client) {
		updateDocumentClass(theme.value);
	}

	return {
		theme: readonly(theme),
		isDark,
		isLight,
		toggleTheme,
		setTheme
	};
};

