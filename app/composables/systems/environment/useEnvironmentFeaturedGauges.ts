import type { Ref } from "vue"
import type { SensorParameter, SensorParameterType } from "~/types/environment"

const SLOT_COUNT = 3
const EMPTY_SLOTS: (SensorParameterType | null)[] = [null, null, null]

const resolveFeaturedSlots = (
	custom: (SensorParameterType | null)[] | undefined,
	enabled: SensorParameterType[]
): (SensorParameterType | null)[] => {
	if (!custom?.length) {
		return [enabled[0] ?? null, enabled[1] ?? null, enabled[2] ?? null]
	}

	const slots = [...custom.slice(0, SLOT_COUNT), ...EMPTY_SLOTS].slice(0, SLOT_COUNT)
	for (let index = 0; index < SLOT_COUNT; index += 1) {
		if (slots[index] && !enabled.includes(slots[index]!)) {
			slots[index] = null
		}
	}
	for (const type of enabled) {
		if (slots.includes(type)) continue
		const emptyIndex = slots.indexOf(null)
		if (emptyIndex < 0) break
		slots[emptyIndex] = type
	}
	return slots
}

export const useEnvironmentFeaturedGauges = (
	selectedLocationId: Ref<string>,
	enabledParameters: Ref<SensorParameter[]>
) => {
	const customByLocationId = ref<Record<string, (SensorParameterType | null)[]>>({})
	const nextSlotByLocationId = ref<Record<string, number>>({})

	const enabledTypes = computed(() => enabledParameters.value.map((param) => param.type))

	const featuredGaugeTypes = computed((): (SensorParameterType | null)[] => {
		const locationId = selectedLocationId.value
		if (!locationId) return [...EMPTY_SLOTS]
		return resolveFeaturedSlots(customByLocationId.value[locationId], enabledTypes.value)
	})

	const isFeaturedType = (type: SensorParameterType) =>
		featuredGaugeTypes.value.includes(type)

	const handleParamCardClick = (type: string) => {
		const locationId = selectedLocationId.value
		const paramType = type as SensorParameterType
		if (!locationId || !enabledTypes.value.includes(paramType)) return

		const slot = nextSlotByLocationId.value[locationId] ?? 0
		const slots = [...featuredGaugeTypes.value]
		const existingIndex = slots.indexOf(paramType)

		if (existingIndex >= 0 && existingIndex !== slot) {
			slots[existingIndex] = slots[slot]
		}
		slots[slot] = paramType

		customByLocationId.value = { ...customByLocationId.value, [locationId]: slots }
		nextSlotByLocationId.value = {
			...nextSlotByLocationId.value,
			[locationId]: (slot + 1) % SLOT_COUNT,
		}
	}

	return {
		featuredGaugeTypes,
		isFeaturedType,
		handleParamCardClick,
	}
}
