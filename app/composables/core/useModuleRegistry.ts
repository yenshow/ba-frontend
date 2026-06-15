import { useApiBase } from "~/composables/core/useApiBase"
import { LICENSE_FEATURE_KEYS, type FeatureKey } from "~/types/license"
import type { SystemModule } from "~/types/system"
import { logger } from "~/utils/logger"

type ModuleRegistryItem = {
	id?: number
	routePrefix: string
	featureKey: string | null
	permissionCode: string | null
	category: string
	name?: string
	icon?: string
	description?: string
	enabled?: boolean
}

type ModuleRegistryServerFeatures = {
	enableYscpPeopleCounting?: boolean
	enableYscpVehicleAccess?: boolean
}

type ModuleRegistryPayload = {
	profile: "central" | "construction"
	modules: ModuleRegistryItem[]
	serverFeatures?: ModuleRegistryServerFeatures
}

const LICENSE_FEATURE_KEY_SET = new Set<string>(LICENSE_FEATURE_KEYS as readonly string[])
const moduleRegistryLogger = logger.createLogger("module-registry")

let registryFetchInFlight: Promise<ModuleRegistryPayload | null> | null = null

const toEntries = (modules: ModuleRegistryItem[]) =>
	modules
		.filter((m) => typeof m.routePrefix === "string" && m.routePrefix !== "")
		.map((m) => ({ ...m, routePrefix: String(m.routePrefix) }))
		.sort((a, b) => b.routePrefix.length - a.routePrefix.length)

const toSystemModule = (m: ModuleRegistryItem): SystemModule => ({
	id: Number(m.id),
	name: String(m.name || ""),
	icon: String(m.icon || ""),
	route: String(m.routePrefix || ""),
	category: m.category as SystemModule["category"],
	description: m.description || undefined,
	enabled: m.enabled,
	permissionCode: m.permissionCode || undefined,
})

export const useModuleRegistry = () => {
	const { request } = useApiBase()

	const registry = useState<ModuleRegistryPayload | null>("module_registry", () => null)
	const isLoading = useState<boolean>("module_registry_loading", () => false)
	const lastLoadedAt = useState<number>("module_registry_last_loaded_at", () => 0)

	const ensureLoaded = async (options: { force?: boolean } = {}) => {
		const force = options.force === true
		if (!force && registry.value && Date.now() - lastLoadedAt.value < 60_000) return registry.value
		if (registryFetchInFlight) return registryFetchInFlight

		registryFetchInFlight = (async () => {
			isLoading.value = true
			try {
				const res = await request<ModuleRegistryPayload>("/modules/registry", { method: "GET" })
				registry.value = res
				lastLoadedAt.value = Date.now()
				return registry.value
			} catch {
				return registry.value
			} finally {
				isLoading.value = false
				registryFetchInFlight = null
			}
		})()

		return registryFetchInFlight
	}

	const getModuleByRoute = (routePath: string): ModuleRegistryItem | null => {
		const r = registry.value
		if (!r?.modules?.length) return null
		if (!routePath || typeof routePath !== "string") return null

		for (const m of toEntries(r.modules)) {
			if (routePath === m.routePrefix || routePath.startsWith(m.routePrefix + "/")) return m
		}
		return null
	}

	const getPermissionCodeByRoute = (routePath: string): string | null => {
		const m = getModuleByRoute(routePath)
		return m?.permissionCode ?? null
	}

	const getFeatureKeyByRoute = (routePath: string): FeatureKey | null => {
		const m = getModuleByRoute(routePath)
		const rawKey = m?.featureKey ?? null
		if (!rawKey) return null
		if (!LICENSE_FEATURE_KEY_SET.has(rawKey)) {
			moduleRegistryLogger.warn("偵測到未知 feature key（已忽略）", {
				routePath,
				featureKey: rawKey,
				routePrefix: m?.routePrefix,
			})
			return null
		}
		return rawKey as FeatureKey
	}

	const modules = computed<SystemModule[]>(() => {
		const list = registry.value?.modules ?? []
		return list
			.map(toSystemModule)
			.filter((m) => !!m.route && !!m.icon && m.enabled !== false)
	})

	const getAllModules = () => modules.value

	const getUiModuleByRoute = (routePath: string): SystemModule | undefined => {
		const m = getModuleByRoute(routePath)
		return m ? toSystemModule(m) : undefined
	}

	/** 與後端 ENABLE_YSCP_PEOPLE_COUNTING 同步；未載入 registry 前預設 true（與後端預設一致） */
	const enableYscpPeopleCounting = computed(
		() => registry.value?.serverFeatures?.enableYscpPeopleCounting !== false
	)

	const enableYscpVehicleAccess = computed(
		() => registry.value?.serverFeatures?.enableYscpVehicleAccess !== false
	)

	return {
		registry: readonly(registry),
		isLoading: readonly(isLoading),
		enableYscpPeopleCounting: readonly(enableYscpPeopleCounting),
		enableYscpVehicleAccess: readonly(enableYscpVehicleAccess),
		ensureLoaded,
		getPermissionCodeByRoute,
		getFeatureKeyByRoute,
		modules: readonly(modules),
		getAllModules,
		getUiModuleByRoute,
	}
}

