import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

/**
 * 區域管理 Composable
 * 統一處理區域的新增、更新、刪除邏輯
 */
export function useZoneManagement<T extends { id?: string; name: string; locations?: any[] }>() {
	const toast = useToast();
	const { handleError } = useErrorHandler();

	/**
	 * 處理儲存區域（統一邏輯）
	 * @param zone 要儲存的區域
	 * @param zonesRef 區域列表的 ref
	 * @param apiCall 根據 zone.id 決定調用 create 或 update API
	 * @param options 可選配置
	 */
	const handleSaveZone = async <R extends { merged?: boolean; message?: string; zone: T }>(
		zone: T,
		zonesRef: Ref<T[]>,
		apiCall: (zone: T) => Promise<R>,
		options?: {
			onAfterSave?: (result: R, zone: T) => void | Promise<void>;
			cleanZone?: (zone: T) => T;
			selectedZoneRef?: Ref<string>;
			closeDialogRef?: Ref<boolean>; // 統一處理關閉對話框
		}
	): Promise<void> => {
		const cleanedZone = options?.cleanZone ? options.cleanZone(zone) : zone;

		try {
			const result = await apiCall(cleanedZone);

			// 統一處理：根據 merged 標記更新狀態
			if (result.merged && cleanedZone.id) {
				const oldIndex = zonesRef.value.findIndex(z => z.id === cleanedZone.id);
				if (oldIndex > -1) {
					zonesRef.value.splice(oldIndex, 1);
				}
			}

			// 清理返回的區域資料（如果需要）
			const cleanedResultZone = options?.cleanZone ? options.cleanZone(result.zone) : result.zone;

			// 更新或添加目標區域（合併和正常更新都使用相同邏輯）
			const targetIndex = zonesRef.value.findIndex(z => z.id === result.zone.id);
			if (targetIndex > -1) {
				zonesRef.value[targetIndex] = cleanedResultZone;
			} else {
				zonesRef.value.push(cleanedResultZone);
			}

			// 如果更新的是當前選中的區域，更新選中狀態
			if (options?.selectedZoneRef) {
				const isSelectedZone =
					options.selectedZoneRef.value === cleanedZone.id ||
					options.selectedZoneRef.value === result.zone.id;
				if (isSelectedZone) {
					options.selectedZoneRef.value = result.zone.id;
				}
			}

			// 執行額外的回調
			if (options?.onAfterSave) {
				await options.onAfterSave(result, cleanedZone);
			}

			// 統一處理關閉對話框
			if (options?.closeDialogRef) {
				options.closeDialogRef.value = false;
			}

			toast.success(result.message || "操作成功");
		} catch (error: any) {
			handleError(error, "儲存區域失敗");
		}
	};

	/**
	 * 處理刪除區域（統一邏輯）
	 * @param zoneId 要刪除的區域 ID
	 * @param zonesRef 區域列表的 ref
	 * @param deleteApiCall 刪除 API 調用
	 * @param options 可選配置
	 */
	const handleDeleteZone = async (
		zoneId: string,
		zonesRef: Ref<T[]>,
		deleteApiCall: (zoneId: string) => Promise<{ message?: string }>,
		options?: {
			selectedZoneRef?: Ref<string>;
			selectedLocationRef?: Ref<string>;
			onAfterDelete?: (deletedZone: T) => void | Promise<void>;
			findEarliestZone?: (zones: T[]) => T | null;
			getLocationId?: (location: any) => string;
			reloadZones?: () => void | Promise<void>; // 刪除後重新載入區域資料（用於全區點位圖）
			// 系統特定的刪除選項（方案一：只刪除該系統的地點）
			systemType?: SystemType; // 系統類型，如果提供則只刪除該系統的地點
			getFullZoneApiCall?: (zoneId: string) => Promise<{ zone: UnifiedZone }>; // 取得完整區域資料（不帶 systemType 過濾）
			updateZoneApiCall?: (
				zoneId: string,
				data: { locations: UnifiedLocation[] }
			) => Promise<{ merged?: boolean; message?: string; zone: T }>; // 更新區域 API（用於移除特定系統的地點）
		}
	): Promise<void> => {
		try {
			// 如果提供了 systemType，表示這是系統頁面的刪除操作
			// 需要檢查區域是否被其他系統使用，如果被使用則只刪除該系統的地點
			if (options?.systemType && options?.getFullZoneApiCall && options?.updateZoneApiCall) {
				// 取得完整的區域資料（不帶 systemType 過濾）
				const fullZoneResponse = await options.getFullZoneApiCall(zoneId);
				const fullZone = fullZoneResponse.zone;

				// 檢查區域是否被其他系統使用
				const allSystemTypes = new Set<SystemType>();
				fullZone.locations?.forEach(location => {
					location.systems?.forEach(system => {
						allSystemTypes.add(system.systemType);
					});
				});

				// 如果區域被其他系統使用，只刪除該系統的地點
				if (allSystemTypes.size > 1 || !allSystemTypes.has(options.systemType)) {
					// 過濾掉該系統的地點
					const remainingLocations: UnifiedZone["locations"] = [];

					fullZone.locations?.forEach(location => {
						// 如果地點沒有任何系統，保留它
						if (!location.systems || location.systems.length === 0) {
							remainingLocations.push(location);
							return;
						}

						// 過濾掉該系統
						const filteredSystems = location.systems.filter(
							system => system.systemType !== options.systemType
						);

						// 如果過濾後還有其他系統，保留該地點（但移除該系統）
						if (filteredSystems.length > 0) {
							// 創建新的地點對象，移除該系統
							remainingLocations.push({
								...location,
								systems: filteredSystems
							});
						}
						// 如果過濾後沒有其他系統，且該地點只有該系統，則刪除該地點（不加入 remainingLocations）
					});

					// 更新區域，移除該系統的地點
					await options.updateZoneApiCall(zoneId, {
						locations: remainingLocations
					});

					// 從本地資料更新（移除該系統的地點）
					const index = zonesRef.value.findIndex(z => z.id === zoneId);
					if (index > -1) {
						// 如果更新後區域還有地點，更新本地資料
						if (remainingLocations.length > 0) {
							// 需要重新載入該系統的區域資料以更新本地狀態
							// 這裡先從本地移除，讓調用方重新載入
							zonesRef.value.splice(index, 1);
						} else {
							// 如果沒有地點了，從本地移除
							zonesRef.value.splice(index, 1);
						}
					}

					// 處理選中狀態
					if (options?.selectedZoneRef && options.selectedZoneRef.value === zoneId) {
						if (remainingLocations.length === 0) {
							// 如果區域沒有地點了，選擇下一個區域
							if (zonesRef.value.length > 0) {
								const nextZone = options.findEarliestZone
									? options.findEarliestZone(zonesRef.value)
									: zonesRef.value[0];
								options.selectedZoneRef.value = nextZone?.id || nextZone?.name || "";
							} else {
								options.selectedZoneRef.value = "";
							}
						}
					}

					// 處理選中地點（所有系統）
					if (options?.selectedLocationRef && options?.getLocationId) {
						// 檢查刪除的區域是否包含當前選中的地點
						const deletedLocation = fullZone.locations?.find(
							loc =>
								options.getLocationId!(loc) === options.selectedLocationRef!.value &&
								loc.systems?.some(system => system.systemType === options.systemType)
						);

						if (deletedLocation) {
							// 查找第一個可用的地點
							const firstAvailableLocation = zonesRef.value
								.flatMap(zone => zone.locations || [])
								.find(loc => options.getLocationId!(loc));

							if (firstAvailableLocation) {
								options.selectedLocationRef.value = options.getLocationId(firstAvailableLocation);
							} else {
								options.selectedLocationRef.value = "";
							}
						}
					}

					// 執行額外的回調
					if (options?.onAfterDelete) {
						const deletedZone = zonesRef.value.find(z => z.id === zoneId) || (fullZone as T);
						await options.onAfterDelete(deletedZone);
					}

					// 重新載入區域資料（用於全區點位圖等需要同步所有系統資料的頁面）
					if (options?.reloadZones) {
						await options.reloadZones();
					}

					toast.success("已移除該系統在此區域的所有地點");
					return;
				}
			}

			// 如果沒有提供 systemType，或者區域只有該系統使用，則直接刪除整個區域
			await deleteApiCall(zoneId);

			// 從本地資料移除
			const index = zonesRef.value.findIndex(z => z.id === zoneId);
			if (index > -1) {
				const deletedZone = zonesRef.value[index];
				zonesRef.value.splice(index, 1);

				// 處理選中狀態
				if (options?.selectedZoneRef && options.selectedZoneRef.value === zoneId) {
					if (zonesRef.value.length > 0) {
						const nextZone = options.findEarliestZone
							? options.findEarliestZone(zonesRef.value)
							: zonesRef.value[0];
						options.selectedZoneRef.value = nextZone?.id || nextZone?.name || "";
					} else {
						options.selectedZoneRef.value = "";
					}
				}

				// 處理選中地點（所有系統）
				if (options?.selectedLocationRef && options?.getLocationId) {
					// 檢查刪除的區域是否包含當前選中的地點
					if (
						deletedZone.locations?.some(
							loc => options.getLocationId!(loc) === options.selectedLocationRef!.value
						)
					) {
						// 查找第一個可用的地點
						const firstAvailableLocation = zonesRef.value
							.flatMap(zone => zone.locations || [])
							.find(loc => options.getLocationId!(loc));

						if (firstAvailableLocation) {
							options.selectedLocationRef.value = options.getLocationId(firstAvailableLocation);
						} else {
							options.selectedLocationRef.value = "";
						}
					}
				}

				// 執行額外的回調
				if (options?.onAfterDelete) {
					await options.onAfterDelete(deletedZone);
				}

				// 重新載入區域資料（用於全區點位圖等需要同步所有系統資料的頁面）
				if (options?.reloadZones) {
					await options.reloadZones();
				}
			}

			toast.success("區域刪除成功");
		} catch (error) {
			handleError(error, "刪除區域失敗");
		}
	};

	/**
	 * 找到最先創建的區域（根據 ID 排序）
	 */
	const findEarliestZone = (zones: T[]): T | null => {
		if (zones.length === 0) return null;

		// 嘗試將 ID 轉換為數字進行比較（如果是數字 ID）
		const numericZones = zones.filter(zone => {
			const numId = Number(zone.id);
			return !isNaN(numId) && isFinite(numId);
		});

		// 如果有數字 ID，根據數值排序（小的在前）
		if (numericZones.length > 0) {
			return numericZones.sort((a, b) => Number(a.id) - Number(b.id))[0];
		}

		// 否則根據 ID 的字典序排序（小的在前）
		return [...zones].sort((a, b) => a.id.localeCompare(b.id))[0];
	};

	/**
	 * 排序區域（按區域名稱的自然排序，例如：1F, 2F, 3F）
	 */
	const sortZones = (zones: T[]): T[] => {
		if (!zones || zones.length === 0) return [];

		return [...zones].sort((a, b) => {
			const nameA = a.name || "";
			const nameB = b.name || "";
			// 提取數字部分進行比較（例如 "1F" -> 1, "2F" -> 2）
			const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
			const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
			return numA - numB;
		});
	};

	return {
		handleSaveZone,
		handleDeleteZone,
		findEarliestZone,
		sortZones
	};
}
