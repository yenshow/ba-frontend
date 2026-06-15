import { useLicense } from "~/composables/core/useLicense"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

/** 登入後預載 registry + license（須在 auth.client 之前執行） */
export default defineNuxtPlugin(async () => {
	const authToken = useCookie("auth_token")
	if (!authToken.value) return

	const { ensureLoaded } = useModuleRegistry()
	const { fetchLicense } = useLicense()
	await Promise.all([ensureLoaded(), fetchLicense()])
})
