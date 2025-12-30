import type { Device, CameraDeviceConfig } from "~/types/device";
import type { RTSPStreamInfo } from "~/types/rtsp";
import type {
	PeopleCountingSite,
	SiteCamera,
	PeopleCountingUnit,
	PeopleCountingPersonnel,
	PeopleCountingLog
} from "~/types/peopleCounting";

/**
 * 人流統計 API Composable
 *
 * 注意：目前後端 API 尚未決定，因此暫時使用模擬資料
 * 後續需要在後端實作後，移除模擬資料並連接實際 API
 */
export const usePeopleCountingApi = () => {
	const { request } = useApiBase();
	const deviceApi = useDeviceApi();
	const rtspApi = useRtspApi();
	const surveillanceApi = useSurveillanceApi();

	// ========== 模擬資料（待後端實作後移除）==========
	const mockSites: PeopleCountingSite[] = [
		{
			id: 1,
			name: "A工地",
			region: "北部",
			status: "active",
			entryCount: 156,
			exitCount: 138,
			units: [
				{ id: 1, siteId: 1, name: "遠岫科技", capacity: 5, currentCount: 3 },
				{ id: 2, siteId: 1, name: "蝶蛹工程", capacity: 20, currentCount: 4 },
				{ id: 3, siteId: 1, name: "蝶蛹鋼鐵", capacity: 20, currentCount: 7 },
				{ id: 4, siteId: 1, name: "遠岫水泥", capacity: 19, currentCount: 0 },
				{ id: 5, siteId: 1, name: "遠岫開發", capacity: 17, currentCount: 2 },
				{ id: 6, siteId: 1, name: "遠岫監造", capacity: 4, currentCount: 0 },
				{ id: 7, siteId: 1, name: "遠岫建材", capacity: 4, currentCount: 0 },
				{ id: 8, siteId: 1, name: "蝶蛹營造", capacity: 5, currentCount: 0 }
			]
		},
		{
			id: 2,
			name: "AA工地",
			region: "北部",
			status: "active",
			entryCount: 156,
			exitCount: 138
		},
		{
			id: 3,
			name: "BB工地",
			region: "北部",
			status: "equipment_anomaly",
			entryCount: 156,
			exitCount: 138
		},
		{
			id: 4,
			name: "DD工地",
			region: "中部",
			status: "intrusion_detected",
			entryCount: 156,
			exitCount: 138
		}
	];

	const mockPersonnel: PeopleCountingPersonnel[] = [
		{
			id: 1,
			unitId: 1,
			employeeId: "999916",
			name: "鍾善武",
			title: "總經理",
			lastEntryTime: "2025/12/18 13:33:49",
			isInside: true
		},
		{
			id: 2,
			unitId: 1,
			employeeId: "999917",
			name: "陳司廉",
			title: "副總經理",
			lastEntryTime: "2025/12/18 13:35:49",
			isInside: true
		},
		{
			id: 3,
			unitId: 1,
			employeeId: "999918",
			name: "廖逸安",
			title: "高級工程師",
			lastEntryTime: "2025/12/18 10:35:49",
			isInside: true
		},
		{
			id: 4,
			unitId: 1,
			employeeId: "999919",
			name: "鍾天萌",
			title: "工程師",
			lastEntryTime: "2025/12/10 14:00:00",
			lastExitTime: "2025/12/10 16:00:00",
			isInside: false
		},
		{
			id: 5,
			unitId: 1,
			employeeId: "999920",
			name: "廖文伶",
			title: "設計師",
			lastEntryTime: "2025/12/10 14:00:00",
			lastExitTime: "2025/12/10 16:00:00",
			isInside: false
		}
	];

	const mockLogs: PeopleCountingLog[] = [
		{
			id: 1,
			siteId: 1,
			unitId: 1,
			personnelId: 1,
			deviceId: 1,
			eventType: "entry",
			employeeId: "999916",
			name: "鍾善武",
			timestamp: "2025/12/22 14:06:59"
		},
		{
			id: 2,
			siteId: 1,
			unitId: 1,
			personnelId: 1,
			deviceId: 1,
			eventType: "entry",
			employeeId: "999916",
			name: "鍾善武",
			timestamp: "2025/12/22 14:05:30"
		}
	];
	// ========== 模擬資料結束 ==========

	/**
	 * 取得所有工地列表（含統計）
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getSites = async (): Promise<PeopleCountingSite[]> => {
		// TODO: 實作後端 API
		// const response = await request<{ sites: PeopleCountingSite[] }>("/people-counting/sites");
		// return response.sites || [];

		// 模擬 API 延遲
		await new Promise(resolve => setTimeout(resolve, 300));
		return mockSites;
	};

	/**
	 * 取得單一工地詳情（含攝影機、單位、人員）
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getSiteDetail = async (siteId: number): Promise<PeopleCountingSite> => {
		// TODO: 實作後端 API
		// const response = await request<{ site: PeopleCountingSite }>(`/people-counting/sites/${siteId}`);
		// const site = response.site;

		// 模擬 API 延遲
		await new Promise(resolve => setTimeout(resolve, 300));

		const site = mockSites.find(s => s.id === siteId);
		if (!site) {
			throw new Error(`工地 ID ${siteId} 不存在`);
		}

		// 如果有攝影機，取得串流資訊
		if (site.cameras && site.cameras.length > 0) {
			try {
				const streams = await rtspApi.getAllStreamStatus();
				const streamMap = new Map<string, RTSPStreamInfo>();
				streams.forEach(stream => {
					streamMap.set(stream.rtspUrl, stream);
				});

				// 為每個攝影機添加串流資訊
				site.cameras = await Promise.all(
					site.cameras.map(async siteCamera => {
						if (!siteCamera.device) {
							try {
								const deviceResponse = await deviceApi.getDevice(siteCamera.deviceId);
								const device = deviceResponse.device;
								// 僅允許 config 符合 CameraDeviceConfig 再賦值（避免型別出錯）
								if (device?.config && device.config.type === "camera" && "ip_address" in device.config) {
									siteCamera.device = device as Device & { config: CameraDeviceConfig };
								} else {
									console.warn(
										`[PeopleCounting] 設備 ${siteCamera.deviceId} config 不是 camera，無法賦值至 siteCamera.device`
									);
								}
							} catch (error) {
								console.warn(`[PeopleCounting] 無法取得設備 ${siteCamera.deviceId}:`, error);
							}
						}

						if (siteCamera.device?.config?.type === "camera") {
							const rtspUrl = surveillanceApi.buildRtspUrl(siteCamera.device.config as CameraDeviceConfig);
							const streamInfo = rtspUrl ? streamMap.get(rtspUrl) : null;

							return {
								...siteCamera,
								streamInfo: streamInfo || null,
								isStreaming: streamInfo?.status === "running" || false
							};
						}
						return siteCamera;
					})
				);
			} catch (error) {
				console.warn("[PeopleCounting] 取得串流資訊失敗:", error);
			}
		}

		return { ...site };
	};

	/**
	 * 取得工地統計（今日進場/出場人數）
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getSiteStats = async (
		siteId: number
	): Promise<{ entryCount: number; exitCount: number }> => {
		// TODO: 實作後端 API
		// const response = await request<{ entryCount: number; exitCount: number }>(`/people-counting/sites/${siteId}/stats`);
		// return response;

		await new Promise(resolve => setTimeout(resolve, 200));
		const site = mockSites.find(s => s.id === siteId);
		return {
			entryCount: site?.entryCount || 0,
			exitCount: site?.exitCount || 0
		};
	};

	/**
	 * 取得工地單位列表
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getSiteUnits = async (siteId: number): Promise<PeopleCountingUnit[]> => {
		// TODO: 實作後端 API
		// const response = await request<{ units: PeopleCountingUnit[] }>(`/people-counting/sites/${siteId}/units`);
		// return response.units || [];

		await new Promise(resolve => setTimeout(resolve, 200));
		const site = mockSites.find(s => s.id === siteId);
		return site?.units || [];
	};

	/**
	 * 取得單位人員列表
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getUnitPersonnel = async (unitId: number): Promise<PeopleCountingPersonnel[]> => {
		// TODO: 實作後端 API
		// const response = await request<{ personnel: PeopleCountingPersonnel[] }>(`/people-counting/units/${unitId}/personnel`);
		// return response.personnel || [];

		await new Promise(resolve => setTimeout(resolve, 200));
		return mockPersonnel.filter(p => p.unitId === unitId);
	};

	/**
	 * 取得工地進出場記錄
	 * TODO: 後端 API 實作後，替換為實際請求
	 */
	const getSiteLogs = async (
		siteId: number,
		options?: { limit?: number; unitId?: number }
	): Promise<PeopleCountingLog[]> => {
		// TODO: 實作後端 API
		// const params = new URLSearchParams();
		// if (options?.limit) params.append("limit", String(options.limit));
		// if (options?.unitId) params.append("unitId", String(options.unitId));
		// const queryString = params.toString();
		// const response = await request<{ logs: PeopleCountingLog[] }>(
		//   `/people-counting/sites/${siteId}/logs${queryString ? `?${queryString}` : ""}`
		// );
		// return response.logs || [];

		await new Promise(resolve => setTimeout(resolve, 200));
		let logs = mockLogs.filter(l => l.siteId === siteId);
		if (options?.unitId) {
			logs = logs.filter(l => l.unitId === options.unitId);
		}
		if (options?.limit) {
			logs = logs.slice(0, options.limit);
		}
		return logs;
	};

	/**
	 * 啟動工地攝影機串流
	 * 重用 surveillance API 的功能
	 */
	const startSiteCameraStream = async (
		siteId: number,
		deviceId: number
	): Promise<RTSPStreamInfo> => {
		try {
			return await surveillanceApi.startCameraStream(deviceId);
		} catch (error) {
			console.error(`[PeopleCounting] 啟動攝影機串流失敗 (工地 ${siteId}, 設備 ${deviceId}):`, error);
			throw error;
		}
	};

	/**
	 * 停止工地攝影機串流
	 * 重用 surveillance API 的功能
	 */
	const stopSiteCameraStream = async (siteId: number, deviceId: number): Promise<void> => {
		try {
			await surveillanceApi.stopCameraStream(deviceId);
		} catch (error) {
			console.error(`[PeopleCounting] 停止攝影機串流失敗 (工地 ${siteId}, 設備 ${deviceId}):`, error);
			throw error;
		}
	};

	return {
		getSites,
		getSiteDetail,
		getSiteStats,
		getSiteUnits,
		getUnitPersonnel,
		getSiteLogs,
		startSiteCameraStream,
		stopSiteCameraStream
	};
};
