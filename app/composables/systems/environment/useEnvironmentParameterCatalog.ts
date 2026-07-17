import { useEnvironmentApi } from "~/composables/systems/environment/useEnvironmentApi"
import { ENVIRONMENT_PARAMETERS_FALLBACK } from "~/constants/environmentParameters.fallback"
import type { EnvironmentParametersResponse } from "~/types/environmentCatalog"
import {
	getEffectiveEnvironmentCatalog,
	setEnvironmentParameterCatalogRuntime,
} from "~/utils/environmentCatalogRuntime"

const CATALOG_STATE_KEY = "environment-parameter-catalog"
const CATALOG_LOADED_KEY = "environment-parameter-catalog-loaded"

export const useEnvironmentParameterCatalog = () => {
	const catalog = useState<EnvironmentParametersResponse | null>(
		CATALOG_STATE_KEY,
		() => null,
	)
	const isLoaded = useState<boolean>(CATALOG_LOADED_KEY, () => false)
	const environmentApi = useEnvironmentApi()

	const applyCatalog = (data: EnvironmentParametersResponse) => {
		catalog.value = data
		setEnvironmentParameterCatalogRuntime(data)
		isLoaded.value = true
	}

	const load = async (force = false): Promise<EnvironmentParametersResponse> => {
		if (catalog.value && !force) {
			return catalog.value
		}

		try {
			const data = await environmentApi.getParameters()
			applyCatalog(data)
			return data
		} catch {
			const fallback = ENVIRONMENT_PARAMETERS_FALLBACK
			applyCatalog(fallback)
			return fallback
		}
	}

	const ensureLoaded = async () => {
		if (isLoaded.value && catalog.value) return catalog.value
		return await load()
	}

	const effectiveCatalog = computed(() => catalog.value ?? getEffectiveEnvironmentCatalog())

	const byKey = computed(() =>
		Object.fromEntries(effectiveCatalog.value.parameters.map((p) => [p.key, p])),
	)

	const sensorOptions = computed(() =>
		effectiveCatalog.value.parameters
			.filter((p) => p.capabilities.deviceModel)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((p) => ({ value: p.key, label: p.label })),
	)

	const thresholdOptions = computed(() =>
		effectiveCatalog.value.parameters
			.filter((p) => p.capabilities.alertThreshold)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((p) => ({ value: p.key, label: p.label })),
	)

	return {
		catalog: effectiveCatalog,
		isLoaded: readonly(isLoaded),
		load,
		ensureLoaded,
		byKey,
		sensorOptions,
		thresholdOptions,
	}
}
