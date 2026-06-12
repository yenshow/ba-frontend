import {
	getCentralDefaultHomeModuleOrder,
	getCentralShellModules,
	reconcileModuleRouteOrder,
	sortModulesByRouteOrder,
} from "~/config/centralModuleShell"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"

const LS_HOME_MODULE_ORDER = "ba-central-home-module-order"

const readStoredOrder = (): string[] | null => {
	if (!import.meta.client) return null
	try {
		const raw = localStorage.getItem(LS_HOME_MODULE_ORDER)
		if (!raw) return null
		const parsed = JSON.parse(raw) as unknown
		if (!Array.isArray(parsed)) return null
		return parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
	} catch {
		return null
	}
}

const writeStoredOrder = (order: string[] | null) => {
	if (!import.meta.client) return
	if (!order?.length) {
		localStorage.removeItem(LS_HOME_MODULE_ORDER)
		return
	}
	localStorage.setItem(LS_HOME_MODULE_ORDER, JSON.stringify(order))
}

/** 首頁系統模組：展示順序（預設 + localStorage 自訂） */
export const useHomeModuleOrder = () => {
	const moduleRegistry = useModuleRegistry()
	const customOrder = useState<string[] | null>("home_module_order", () => readStoredOrder())

	const baseModules = computed(() => getCentralShellModules(moduleRegistry.getAllModules()))

	const orderedModules = computed(() => {
		const routes = baseModules.value.map((module) => module.route)
		const order = customOrder.value
			? reconcileModuleRouteOrder(customOrder.value, routes)
			: getCentralDefaultHomeModuleOrder(baseModules.value)
		return sortModulesByRouteOrder(baseModules.value, order)
	})

	const persistOrder = (order: string[]) => {
		const routes = baseModules.value.map((module) => module.route)
		const next = reconcileModuleRouteOrder(order, routes)
		customOrder.value = next
		writeStoredOrder(next)
	}

	const resetToDefault = () => {
		customOrder.value = null
		writeStoredOrder(null)
	}

	const moveModule = (fromRoute: string, toRoute: string) => {
		if (fromRoute === toRoute) return
		const routes = orderedModules.value.map((module) => module.route)
		const fromIndex = routes.indexOf(fromRoute)
		const toIndex = routes.indexOf(toRoute)
		if (fromIndex < 0 || toIndex < 0) return
		routes.splice(fromIndex, 1)
		routes.splice(toIndex, 0, fromRoute)
		persistOrder(routes)
	}

	watch(
		() => moduleRegistry.registry.value?.modules,
		() => {
			if (customOrder.value) persistOrder(customOrder.value)
		}
	)

	return {
		orderedModules,
		resetToDefault,
		moveModule,
	}
}
