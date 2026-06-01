import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess";
import { useVehicleAccessIsapiDeviceApi } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiDeviceApi";
import { useToast } from "~/composables/core/useToast";
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils";

/** ISAPI 單台攝影機道閘：送控制指令（設備不提供可靠狀態查詢） */
export const useVehicleBarrierGate = (options: {
	location: MaybeRefOrGetter<VehicleAccessLocation | null>;
	deviceId: MaybeRefOrGetter<number | null>;
}) => {
	const isapiApi = useVehicleAccessIsapiDeviceApi();
	const toast = useToast();

	const isControlling = ref(false);

	const location = computed(() => toValue(options.location));

	const deviceId = computed(() => {
		const id = toValue(options.deviceId);
		return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
	});

	const siteId = computed(() => {
		const raw = location.value?.id ?? location.value?.locationId;
		const n = Number(raw);
		return Number.isFinite(n) ? n : undefined;
	});

	const channelId = computed(() => {
		const ch = location.value?.cameraChannelId;
		return ch != null && Number.isFinite(Number(ch)) ? Math.trunc(Number(ch)) : 1;
	});

	const apiParams = computed(() => ({
		siteId: siteId.value,
		channelId: channelId.value,
	}));

	const control = async (ctrlMode: BarrierGateCtrlMode, canWrite: boolean) => {
		const id = deviceId.value;
		if (id == null || !canWrite) return;
		isControlling.value = true;
		try {
			await isapiApi.controlBarrierGate(id, { ...apiParams.value, ctrlMode });
			toast.success("已送出道閘指令");
		} catch (e) {
			toast.error(resolveUserFacingCatchMessage(e, "道閘控制失敗"));
		} finally {
			isControlling.value = false;
		}
	};

	return { isControlling, control };
};
