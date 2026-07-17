import { ENVIRONMENT_PARAMETERS_FALLBACK } from "~/constants/environmentParameters.fallback";
import type {
	EnvironmentParameterDefinition,
	EnvironmentParametersResponse
} from "~/types/environmentCatalog";

let runtimeCatalog: EnvironmentParametersResponse | null = null;
let runtimeByKey: Map<string, EnvironmentParameterDefinition> | null = null;

// 以小寫 key 建索引，與查詢端的 normalize 一致（如 heatIndex）
const fallbackByKey = new Map(
	ENVIRONMENT_PARAMETERS_FALLBACK.parameters.map(p => [p.key.toLowerCase(), p])
);

const rebuildRuntimeIndex = (data: EnvironmentParametersResponse | null) => {
	runtimeByKey = data ? new Map(data.parameters.map(p => [p.key.toLowerCase(), p])) : null;
};

export const getEffectiveEnvironmentCatalog = (): EnvironmentParametersResponse =>
	runtimeCatalog ?? ENVIRONMENT_PARAMETERS_FALLBACK;

export const setEnvironmentParameterCatalogRuntime = (
	data: EnvironmentParametersResponse | null
) => {
	runtimeCatalog = data;
	rebuildRuntimeIndex(data);
};

export const getEnvironmentParameterDefinition = (
	key: string
): EnvironmentParameterDefinition | undefined => {
	const normalized = String(key ?? "")
		.trim()
		.toLowerCase();
	if (!normalized) return undefined;
	return runtimeByKey?.get(normalized) ?? fallbackByKey.get(normalized);
};

export const getEnvironmentSensorParamKeys = (): string[] =>
	getEffectiveEnvironmentCatalog().sensorKeys;
