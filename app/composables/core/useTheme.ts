export type Theme = "light" | "dark"

let documentClassSynced = false

export const useTheme = () => {
	const themeCookie = useCookie<Theme>("theme", {
		default: () => "light",
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 365,
	})

	const theme = useState<Theme>("theme", () => themeCookie.value)
	const isDark = computed(() => theme.value === "dark")

	const updateDocumentClass = (currentTheme: Theme) => {
		if (process.client) {
			document.documentElement.classList.toggle("dark", currentTheme === "dark")
		}
	}

	const toggleTheme = () => {
		theme.value = theme.value === "light" ? "dark" : "light"
		themeCookie.value = theme.value
		updateDocumentClass(theme.value)
	}

	const setTheme = (newTheme: Theme) => {
		theme.value = newTheme
		themeCookie.value = newTheme
		updateDocumentClass(newTheme)
	}

	if (process.client && !documentClassSynced) {
		documentClassSynced = true
		updateDocumentClass(theme.value)
	}

	return {
		theme: readonly(theme),
		isDark,
		toggleTheme,
		setTheme,
	}
}
