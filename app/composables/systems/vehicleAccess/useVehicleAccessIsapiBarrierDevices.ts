import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import type { VehicleAccessLocation } from "~/types/vehicleAccess";
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi";

const collectDeviceIds = (location: VehicleAccessLocation | null | undefined): number[] => {
	const seen = new Set<number>();
	const result: number[] = [];
	for (const ids of [location?.entryCameraDeviceIds, location?.exitCameraDeviceIds]) {
		for (const raw of ids ?? []) {
			const id = Number(raw);
			if (!Number.isFinite(id) || seen.has(id)) continue;
			seen.add(id);
			result.push(id);
		}
	}
	return result;
};

/** ISAPI 地點：入口＋出口攝影機清單（含設備名稱） */
export const useVehicleAccessIsapiBarrierDevices = (
	location: MaybeRefOrGetter<VehicleAccessLocation | null | undefined>,
) => {
	const deviceApi = useDeviceApi();
	const nameMap = ref<Record<number, string>>({});

	const deviceIds = computed(() => collectDeviceIds(toValue(location)));

	const devices = computed(() =>
		deviceIds.value.map((id) => ({
			id,
			label: nameMap.value[id]?.trim() || `設備 #${id}`,
		})),
	);

	const loadNames = async (ids: number[]) => {
		if (ids.length === 0) {
			nameMap.value = {};
			return;
		}
		try {
			const res = await deviceApi.getDevices({ type_code: "camera", limit: 200 });
			const idSet = new Set(ids);
			const map: Record<number, string> = {};
			for (const dev of res.devices ?? []) {
				if (dev.id != null && idSet.has(dev.id)) {
					map[dev.id] = dev.name?.trim() || `設備 #${dev.id}`;
				}
			}
			for (const id of ids) {
				if (!map[id]) map[id] = `設備 #${id}`;
			}
			nameMap.value = map;
		} catch {
			nameMap.value = Object.fromEntries(ids.map((id) => [id, `設備 #${id}`]));
		}
	};

	watch(deviceIds, (ids) => void loadNames(ids), { immediate: true });

	return { devices };
};
