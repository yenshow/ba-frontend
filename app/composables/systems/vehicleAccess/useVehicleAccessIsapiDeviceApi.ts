/**
 * 車輛 ISAPI 設備代理（車牌名單 CRUD、柵欄機）
 */
import type {
	BarrierGateCtrlMode,
	VehicleLicensePlateSearchResult,
	VehicleLicensePlateUpsertPayload,
} from "~/types/vehicleAccess";
import { useApiBase } from "~/composables/core/useApiBase";

export interface VehicleAccessIsapiDeviceParams {
	siteId?: number;
	channelId?: number;
}

export type PlateUpsertMutation = "create" | "update";

const buildQuery = (
	params?: VehicleAccessIsapiDeviceParams & { mutation?: PlateUpsertMutation },
) => {
	const q = new URLSearchParams();
	if (params?.siteId != null) q.set("siteId", String(params.siteId));
	if (params?.channelId != null) q.set("channelId", String(params.channelId));
	if (params?.mutation) q.set("mutation", params.mutation);
	const qs = q.toString();
	return qs ? `?${qs}` : "";
};

export const useVehicleAccessIsapiDeviceApi = () => {
	const { request } = useApiBase();

	const searchLicensePlates = async (
		deviceId: number,
		params?: VehicleAccessIsapiDeviceParams & {
			searchResultPosition?: number;
			maxResults?: number;
		}
	): Promise<VehicleLicensePlateSearchResult> =>
		request<VehicleLicensePlateSearchResult>(
			`/vehicle-access/devices/${deviceId}/license-plates/search${buildQuery(params)}`,
			{
				method: "POST",
				body: {
					channelId: params?.channelId,
					searchResultPosition: params?.searchResultPosition,
					maxResults: params?.maxResults,
				},
			}
		);

	const upsertLicensePlates = async (
		deviceId: number,
		body: VehicleAccessIsapiDeviceParams & {
			plates: VehicleLicensePlateUpsertPayload[];
			mutation: PlateUpsertMutation;
		},
	) =>
		request<{ success: boolean; channelId: number; count: number }>(
			`/vehicle-access/devices/${deviceId}/license-plates${buildQuery({
				siteId: body.siteId,
				channelId: body.channelId,
				mutation: body.mutation,
			})}`,
			{
				method: "PUT",
				body,
			},
		);

	const deleteLicensePlates = async (
		deviceId: number,
		body: VehicleAccessIsapiDeviceParams & { licensePlates: string[] }
	) =>
		request<{ success: boolean; channelId: number; count: number }>(
			`/vehicle-access/devices/${deviceId}/license-plates${buildQuery(body)}`,
			{
				method: "DELETE",
				body,
			}
		);

	const controlBarrierGate = async (
		deviceId: number,
		body: VehicleAccessIsapiDeviceParams & { ctrlMode: BarrierGateCtrlMode }
	) =>
		request<{ success: boolean; channelId: number; ctrlMode: string }>(
			`/vehicle-access/devices/${deviceId}/barrier-gate${buildQuery(body)}`,
			{
				method: "PUT",
				body,
			}
		);

	return {
		searchLicensePlates,
		upsertLicensePlates,
		deleteLicensePlates,
		controlBarrierGate,
	};
};
