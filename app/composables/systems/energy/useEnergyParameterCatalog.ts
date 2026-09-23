import {
	ENERGY_PARAMETERS_FALLBACK,
	type EnergyMeterKind,
	type EnergyParameterDef,
} from "~/constants/energyParameters.fallback"
import { useLicense } from "~/composables/core/useLicense"
import { useApiBase } from "~/composables/core/useApiBase"

type CatalogPayload = {
	version?: string
	parameters?: EnergyParameterDef[]
}

/**
 * Central 專用。未授權 energy 時不請求，沿用本機 fallback。
 */
export const useEnergyParameterCatalog = () => {
	const { request } = useApiBase()
	const parameters = useState<EnergyParameterDef[]>(
		"energy-parameter-catalog",
		() => [...ENERGY_PARAMETERS_FALLBACK]
	)
	const loaded = useState<boolean>("energy-parameter-catalog-loaded", () => false)

	const { hasFeature } = useLicense()

	const ensureLoaded = async () => {
		if (!hasFeature("energy") || loaded.value) return
		try {
			const data = await request<CatalogPayload>("/energy/parameters")
			if (Array.isArray(data?.parameters) && data.parameters.length > 0) {
				parameters.value = data.parameters
			}
		} catch {
			parameters.value = [...ENERGY_PARAMETERS_FALLBACK]
		} finally {
			loaded.value = true
		}
	}

	const toOption = (p: EnergyParameterDef) => ({
		value: p.key,
		label: `${p.label}（${p.unit}）`,
	})

	const energyOptions = computed(() => parameters.value.map(toOption))

	const energyOptionsForMeterKind = (kind: EnergyMeterKind) =>
		parameters.value.filter((p) => p.meterKinds.includes(kind)).map(toOption)

	return { parameters, energyOptions, energyOptionsForMeterKind, ensureLoaded }
}
