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

export const barrierGateStatusShort = (
	status: number | null,
	statusText: string,
	hasDevice: boolean,
): string => {
	if (!hasDevice) return "未設定";
	if (status === 2) return "開";
	if (status === 1) return "關";
	if (status === 0) return "無訊號";
	return statusText?.slice(0, 4) || "—";
};

/** ISAPI 地點道閘：解析入口設備、輪詢狀態、送控制指令 */
export const useVehicleBarrierGate = (options: {
	location: MaybeRefOrGetter<VehicleAccessLocation | null>;
	/** 僅 active 時輪詢，避免總覽多卡同時打設備 */
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

	const entryDeviceId = computed(() => {
		const ids = location.value?.entryCameraDeviceIds ?? [];
		const first = ids.find((id) => Number.isFinite(Number(id)));
		return first != null ? Number(first) : null;
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
		barrierGateStatusShort(
			gateStatus.value,
			statusText.value,
			entryDeviceId.value != null,
		),
	);

	const statusBadgeClass = computed(() => barrierGateStatusBadgeClass(gateStatus.value));

	const refreshStatus = async () => {
		const deviceId = entryDeviceId.value;
		if (deviceId == null) return;
		try {
			const res = await isapiApi.getBarrierGateStatus(deviceId, apiParams.value);
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

	const startPolling = () => {
		stopPolling();
		if (!active.value || entryDeviceId.value == null) return;
		void refreshStatus();
		pollTimer = setInterval(() => void refreshStatus(), POLL_MS);
	};

	const control = async (ctrlMode: BarrierGateCtrlMode, canWrite: boolean) => {
		const deviceId = entryDeviceId.value;
		if (deviceId == null || !canWrite) return;
		isControlling.value = true;
		try {
			await isapiApi.controlBarrierGate(deviceId, { ...apiParams.value, ctrlMode });
			toast.success("已送出道閘指令");
			await refreshStatus();
		} catch (e) {
			toast.error(resolveUserFacingCatchMessage(e, "道閘控制失敗"));
		} finally {
			isControlling.value = false;
		}
	};

	watch(
		() => [active.value, entryDeviceId.value, siteId.value] as const,
		() => startPolling(),
		{ immediate: true },
	);

	onBeforeUnmount(() => stopPolling());

	return {
		entryDeviceId,
		gateStatus,
		statusText,
		statusShort,
		statusBadgeClass,
		isControlling,
		control,
	};
};
