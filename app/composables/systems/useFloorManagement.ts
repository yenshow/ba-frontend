import type { UnifiedFloor } from "~/types/location";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";

/**
 * 樓層管理 Composable
 * 統一處理樓層的新增、更新、刪除邏輯
 */
export function useFloorManagement<T extends UnifiedFloor>() {
	const toast = useToast();
	const { handleError } = useErrorHandler();

	/**
	 * 處理儲存樓層（統一邏輯）
	 * @param floor 要儲存的樓層
	 * @param floorsRef 樓層列表的 ref
	 * @param apiCall 根據 floor.id 決定調用 create 或 update API
	 * @param options 可選配置
	 */
	const handleSaveFloor = async <R extends { merged?: boolean; message?: string; floor: T }>(
		floor: T,
		floorsRef: Ref<T[]>,
		apiCall: (floor: T) => Promise<R>,
		options?: {
			onAfterSave?: (result: R, floor: T) => void | Promise<void>;
			cleanFloor?: (floor: T) => T;
			selectedFloorRef?: Ref<string>;
			closeDialogRef?: Ref<boolean>; // 統一處理關閉對話框
		}
	): Promise<void> => {
		const cleanedFloor = options?.cleanFloor ? options.cleanFloor(floor) : floor;

		try {
			const result = await apiCall(cleanedFloor);

			// 統一處理：根據 merged 標記更新狀態
			if (result.merged && cleanedFloor.id) {
				const oldIndex = floorsRef.value.findIndex(f => f.id === cleanedFloor.id);
				if (oldIndex > -1) {
					floorsRef.value.splice(oldIndex, 1);
				}
			}

			// 清理返回的樓層資料（如果需要）
			const cleanedResultFloor = options?.cleanFloor
				? options.cleanFloor(result.floor)
				: result.floor;

			// 更新或添加目標樓層（合併和正常更新都使用相同邏輯）
			const targetIndex = floorsRef.value.findIndex(f => f.id === result.floor.id);
			if (targetIndex > -1) {
				floorsRef.value[targetIndex] = cleanedResultFloor;
			} else {
				floorsRef.value.push(cleanedResultFloor);
			}

			// 如果更新的是當前選中的樓層，更新選中狀態
			if (options?.selectedFloorRef) {
				const isSelectedFloor =
					options.selectedFloorRef.value === cleanedFloor.id ||
					options.selectedFloorRef.value === result.floor.id;
				if (isSelectedFloor) {
					options.selectedFloorRef.value = result.floor.id;
				}
			}

			// 執行額外的回調
			if (options?.onAfterSave) {
				await options.onAfterSave(result, cleanedFloor);
			}

			// 統一處理關閉對話框
			if (options?.closeDialogRef) {
				options.closeDialogRef.value = false;
			}

			toast.success(result.message || "操作成功");
		} catch (error: any) {
			handleError(error, "儲存樓層失敗");
		}
	};

	/**
	 * 處理刪除樓層（統一邏輯）
	 * @param floorId 要刪除的樓層 ID
	 * @param floorsRef 樓層列表的 ref
	 * @param deleteApiCall 刪除 API 調用
	 * @param options 可選配置
	 */
	const handleDeleteFloor = async (
		floorId: string,
		floorsRef: Ref<T[]>,
		deleteApiCall: (floorId: string) => Promise<{ message?: string }>,
		options?: {
			selectedFloorRef?: Ref<string>;
			selectedLocationRef?: Ref<string>;
			onAfterDelete?: (deletedFloor: T) => void | Promise<void>;
			findEarliestFloor?: (floors: T[]) => T | null;
			getLocationId?: (location: any) => string;
			reloadFloors?: () => void | Promise<void>; // 刪除後重新載入樓層資料（用於區域點位圖）
		}
	): Promise<void> => {
		try {
			await deleteApiCall(floorId);

			// 從本地資料移除
			const index = floorsRef.value.findIndex(f => f.id === floorId);
			if (index > -1) {
				const deletedFloor = floorsRef.value[index];
				floorsRef.value.splice(index, 1);

				// 處理選中狀態
				if (options?.selectedFloorRef && options.selectedFloorRef.value === floorId) {
					if (floorsRef.value.length > 0) {
						const nextFloor = options.findEarliestFloor
							? options.findEarliestFloor(floorsRef.value)
							: floorsRef.value[0];
						options.selectedFloorRef.value = nextFloor?.id || nextFloor?.name || "";
					} else {
						options.selectedFloorRef.value = "";
					}
				}

				// 處理選中地點（環境品質系統）
				if (options?.selectedLocationRef && options?.getLocationId) {
					// 檢查刪除的樓層是否包含當前選中的地點
					if (
						deletedFloor.locations?.some(
							loc => options.getLocationId!(loc) === options.selectedLocationRef!.value
						)
					) {
						// 查找第一個可用的地點
						const firstAvailableLocation = floorsRef.value
							.flatMap(floor => floor.locations || [])
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
					await options.onAfterDelete(deletedFloor);
				}

				// 重新載入樓層資料（用於區域點位圖等需要同步所有系統資料的頁面）
				if (options?.reloadFloors) {
					await options.reloadFloors();
				}
			}

			toast.success("樓層刪除成功");
		} catch (error) {
			handleError(error, "刪除樓層失敗");
		}
	};

	/**
	 * 找到最先創建的樓層（根據 ID 排序）
	 */
	const findEarliestFloor = (floors: T[]): T | null => {
		if (floors.length === 0) return null;

		// 嘗試將 ID 轉換為數字進行比較（如果是數字 ID）
		const numericFloors = floors.filter(floor => {
			const numId = Number(floor.id);
			return !isNaN(numId) && isFinite(numId);
		});

		// 如果有數字 ID，根據數值排序（小的在前）
		if (numericFloors.length > 0) {
			return numericFloors.sort((a, b) => Number(a.id) - Number(b.id))[0];
		}

		// 否則根據 ID 的字典序排序（小的在前）
		return [...floors].sort((a, b) => a.id.localeCompare(b.id))[0];
	};

	/**
	 * 排序樓層（按樓層名稱的自然排序，例如：1F, 2F, 3F）
	 */
	const sortFloors = (floors: T[]): T[] => {
		if (!floors || floors.length === 0) return [];

		return [...floors].sort((a, b) => {
			const nameA = a.name || "";
			const nameB = b.name || "";
			// 提取數字部分進行比較（例如 "1F" -> 1, "2F" -> 2）
			const numA = parseInt(nameA.match(/\d+/)?.[0] || "999") || 999;
			const numB = parseInt(nameB.match(/\d+/)?.[0] || "999") || 999;
			return numA - numB;
		});
	};

	return {
		handleSaveFloor,
		handleDeleteFloor,
		findEarliestFloor,
		sortFloors
	};
}

