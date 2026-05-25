import { useApiBase } from "~/composables/core/useApiBase";
import { LICENSE_FEATURE_KEYS, type FeatureKey } from "~/types/license";
import type { SystemModule } from "~/types/system";
import { logger } from "~/utils/logger";

const MODULE_CATEGORY_ORDER = [
	"core",
	"construction-monitoring",
] as const satisfies readonly SystemModule["category"][];

type ModuleRegistryItem = {
	id?: number;
	routePrefix: string;
	featureKey: string | null;
	permissionCode: string | null;
	category: string;
	name?: string;
	icon?: string;
	description?: string;
	enabled?: boolean;
};

type ModuleRegistryServerFeatures = {
	enableYscpPeopleCounting?: boolean;
};

type ModuleRegistryPayload = {
	profile: "central" | "construction";
	modules: ModuleRegistryItem[];
	serverFeatures?: ModuleRegistryServerFeatures;
};

const LICENSE_FEATURE_KEY_SET = new Set<string>(LICENSE_FEATURE_KEYS as readonly string[]);
const moduleRegistryLogger = logger.createLogger("module-registry");

const normalizeRegistryForConstructionApp = (payload: ModuleRegistryPayload): ModuleRegistryPayload => {
	const filteredModules = (payload.modules || []).filter(
		(m) =>
			(m.category === "core" || m.category === "construction-monitoring") &&
			m.routePrefix !== "/core/area-point-map"
	);
	return {
		profile: "construction",
		modules: filteredModules,
		serverFeatures: payload.serverFeatures,
	};
};

const toEntries = (modules: ModuleRegistryItem[]) =>
	modules
		.filter((m) => typeof m.routePrefix === "string" && m.routePrefix !== "")
		.map((m) => ({ ...m, routePrefix: String(m.routePrefix) }))
		.sort((a, b) => b.routePrefix.length - a.routePrefix.length);

const toSystemModule = (m: ModuleRegistryItem): SystemModule => ({
	id: Number(m.id),
	name: String(m.name || ""),
	icon: String(m.icon || ""),
	route: String(m.routePrefix || ""),
	category: m.category as SystemModule["category"],
	description: m.description || undefined,
	enabled: m.enabled,
	permissionCode: m.permissionCode || undefined,
});

export const useModuleRegistry = () => {
	const { request } = useApiBase();

	const registry = useState<ModuleRegistryPayload | null>("module_registry", () => null);
	const isLoading = useState<boolean>("module_registry_loading", () => false);
	const lastLoadedAt = useState<number>("module_registry_last_loaded_at", () => 0);

	const ensureLoaded = async (options: { force?: boolean } = {}) => {
		const force = options.force === true;
		if (!force && registry.value && Date.now() - lastLoadedAt.value < 60_000) return registry.value;
		if (isLoading.value) return registry.value;

		isLoading.value = true;
		try {
			const res = await request<ModuleRegistryPayload>("/modules/registry", { method: "GET" });
			// Safety net: construction app 永遠只顯示 construction 子集，避免後端 profile 設定錯誤造成 UI 漂移
			registry.value = normalizeRegistryForConstructionApp(res);
			lastLoadedAt.value = Date.now();
			return registry.value;
		} catch {
			// 若後端尚未部署 registry 端點，保留 fallback（不影響既有行為）
			return registry.value;
		} finally {
			isLoading.value = false;
		}
	};

	const getModuleByRoute = (routePath: string): ModuleRegistryItem | null => {
		const r = registry.value;
		if (!r?.modules?.length) return null;
		if (!routePath || typeof routePath !== "string") return null;

		for (const m of toEntries(r.modules)) {
			if (routePath === m.routePrefix || routePath.startsWith(m.routePrefix + "/")) return m;
		}
		return null;
	};

	const getPermissionCodeByRoute = (routePath: string): string | null => {
		const m = getModuleByRoute(routePath);
		return m?.permissionCode ?? null;
	};

	const getFeatureKeyByRoute = (routePath: string): FeatureKey | null => {
		const m = getModuleByRoute(routePath);
		const rawKey = m?.featureKey ?? null;
		if (!rawKey) return null;
		if (!LICENSE_FEATURE_KEY_SET.has(rawKey)) {
			moduleRegistryLogger.warn("偵測到未知 feature key（已忽略）", {
				routePath,
				featureKey: rawKey,
				routePrefix: m?.routePrefix
			});
			return null;
		}
		return rawKey as FeatureKey;
	};

	const modules = computed<SystemModule[]>(() => {
		const list = registry.value?.modules ?? [];
		return list
			.map(toSystemModule)
			.filter((m) => !!m.route && !!m.icon && m.enabled !== false);
	});

	const getAllModules = () => modules.value;

	const getModulesByCategory = (category: SystemModule["category"] | "all" = "all") => {
		if (category === "all") return modules.value;
		return modules.value.filter((m) => m.category === category);
	};

	const getUiModuleByRoute = (routePath: string) =>
		modules.value.find((m) => m.route === routePath) ?? undefined;

	const categoryOrder = MODULE_CATEGORY_ORDER;

	const enableYscpPeopleCounting = computed(
		() => registry.value?.serverFeatures?.enableYscpPeopleCounting !== false
	);

	return {
		registry: readonly(registry),
		isLoading: readonly(isLoading),
		enableYscpPeopleCounting: readonly(enableYscpPeopleCounting),
		ensureLoaded,
		getPermissionCodeByRoute,
		getFeatureKeyByRoute,
		modules: readonly(modules),
		getAllModules,
		getModulesByCategory,
		getUiModuleByRoute,
		categoryOrder,
	};
};
