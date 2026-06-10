import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

export default defineNuxtPlugin(async () => {
	const authToken = useCookie("auth_token")
	if (!authToken.value) return

	const { ensureLoaded } = useModuleRegistry()
	await ensureLoaded()
})
