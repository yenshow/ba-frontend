import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import type { VehicleAccessLocation, BarrierGateCtrlMode } from "~/types/vehicleAccess";
import { useVehicleAccessIsapiDeviceApi } from "~/composables/systems/vehicleAccess/useVehicleAccessIsapiDeviceApi";
import { useToast } from "~/composables/core/useToast";
import { resolveUserFacingCatchMessage } from "~/utils/errorUtils";

const POLL_MS = 8000;

export const barrierGateStatusBadgeClass = (status: number | null): string => {
	switch (status) {
		case 2:
			return "bg-emerald-500/25 text-emerald-200";
		case 1:
			return "bg-white/15 text-white/80";
		case 0:
			return "bg-amber-500/25 text-amber-200";
		default:
			return "bg-white/10 text-white/50";
	}
};

export const barrierGateStatusShort = (status: number | null, statusText: string): string => {
	if (status === 2) return "開";
	if (status === 1) return "關";
	if (status === 0) return "無訊號";
	return statusText?.slice(0, 4) || "—";
};

/** ISAPI 單台攝影機道閘：輪詢狀態、送控制指令 */
export const useVehicleBarrierGate = (options: {
	location: MaybeRefOrGetter<VehicleAccessLocation | null>;
	deviceId: MaybeRefOrGetter<number | null>;
	/** true 時每 8s 輪詢；false 仍會先抓一次狀態 */
	active?: MaybeRefOrGetter<boolean>;
}) => {
	const isapiApi = useVehicleAccessIsapiDeviceApi();
	const toast = useToast();

	const gateStatus = ref<number | null>(null);
	const statusText = ref("—");
	const isControlling = ref(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	const location = computed(() => toValue(options.location));
	const active = computed(() => toValue(options.active) ?? false);

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

	const statusShort = computed(() =>
		barrierGateStatusShort(gateStatus.value, statusText.value),
	);

	const statusBadgeClass = computed(() => barrierGateStatusBadgeClass(gateStatus.value));

	const refreshStatus = async () => {
		const id = deviceId.value;
		if (id == null) return;
		try {
			const res = await isapiApi.getBarrierGateStatus(id, apiParams.value);
			gateStatus.value = res.status;
			statusText.value = res.label || "—";
		} catch {
			gateStatus.value = null;
			statusText.value = "無法取得";
		}
	};

	const stopPolling = () => {
		if (pollTimer != null) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	};

	const syncStatus = () => {
		stopPolling();
		if (deviceId.value == null) return;
		void refreshStatus();
		if (active.value) {
			pollTimer = setInterval(() => void refreshStatus(), POLL_MS);
		}
	};

	const control = async (ctrlMode: BarrierGateCtrlMode, canWrite: boolean) => {
		const id = deviceId.value;
		if (id == null || !canWrite) return;
		isControlling.value = true;
		try {
			await isapiApi.controlBarrierGate(id, { ...apiParams.value, ctrlMode });
			toast.success("已送出道閘指令");
			await refreshStatus();
		} catch (e) {
			toast.error(resolveUserFacingCatchMessage(e, "道閘控制失敗"));
		} finally {
			isControlling.value = false;
		}
	};

	watch(
		() => [active.value, deviceId.value, siteId.value] as const,
		() => syncStatus(),
		{ immediate: true },
	);

	onBeforeUnmount(() => stopPolling());

	return { statusText, statusShort, statusBadgeClass, isControlling, control };
};
