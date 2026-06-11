import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { compareZonesLoose } from "~/utils/sortOrder";
import { deleteZoneWithSystemAwareness } from "~/composables/location/locationSystemActions";

/** ZoneManagementDialog 批次儲存時傳入 handleSaveZone 的 options */
export const ZONE_DIALOG_BATCH_SAVE_OPTIONS = {
	suppressToast: true,
	suppressAfterSave: true,
	rethrowOnError: true,
} as const

/**
 * 區域管理 Composable
 * 統一處理區域的新增、更新、刪除邏輯
 */
export function useZoneManagement<
	TLocation extends { id?: string | null } = { id?: string | null },
	TZone extends { id?: string; name: string; locations?: TLocation[] } = {
		id?: string
		name: string
		locations?: TLocation[]
	},
>() {
	const toast = useToast();
	const { handleError } = useErrorHandler();

	/**
	 * 重置選中區域狀態（共用邏輯）
	 */
	const resetSelectedZone = (
		zoneId: string,
		zonesRef: Ref<TZone[]>,
		selectedZoneRef?: Ref<string>,
		findEarliestZone?: (zones: TZone[]) => TZone | null
	) => {
		if (!selectedZoneRef || selectedZoneRef.value !== zoneId) return;

		if (zonesRef.value.length > 0) {
			const nextZone = findEarliestZone
				? findEarliestZone(zonesRef.value)
				: zonesRef.value[0];
			selectedZoneRef.value = nextZone?.id || nextZone?.name || "";
		} else {
			selectedZoneRef.value = "";
		}
	};

	/**
	 * 重置選中地點狀態（共用邏輯）
	 */
	const resetSelectedLocation = (
		zonesRef: Ref<TZone[]>,
		selectedLocationRef?: Ref<string>,
		getLocationId?: (location: TLocation) => string
	) => {
		if (!selectedLocationRef || !getLocationId) return;

		const firstAvailableLocation = zonesRef.value
			.flatMap(zone => zone.locations || [])
			.find(loc => getLocationId(loc));

		selectedLocationRef.value = firstAvailableLocation
			? getLocationId(firstAvailableLocation)
			: "";
	};

	/**
	 * 處理刪除後的選中狀態和回調（統一邏輯）
	 */
	const handlePostDelete = async (
		zoneId: string,
		deletedZone: TZone,
		zonesRef: Ref<TZone[]>,
		options?: {
			selectedZoneRef?: Ref<string>;
			selectedLocationRef?: Ref<string>;
			onAfterDelete?: (deletedZone: TZone) => void | Promise<void>;
			findEarliestZone?: (zones: TZone[]) => TZone | null;
			getLocationId?: (location: TLocation) => string;
			reloadZones?: () => void | Promise<void>;
		}
	) => {
		// 重置選中區域
		resetSelectedZone(zoneId, zonesRef, options?.selectedZoneRef, options?.findEarliestZone);

		// 重置選中地點
		if (options?.selectedLocationRef && options?.getLocationId) {
			const deletedLocationId = deletedZone.locations?.find(
				loc => options.getLocationId!(loc) === options.selectedLocationRef!.value
			) ? options.selectedLocationRef.value : undefined;

			if (deletedLocationId) {
				resetSelectedLocation(
					zonesRef,
					options.selectedLocationRef,
					options.getLocationId
				);
			}
		}

		// 執行額外的回調
		if (options?.onAfterDelete) {
			await options.onAfterDelete(deletedZone);
		}

		// 重新載入區域資料
		if (options?.reloadZones) {
			await options.reloadZones();
		}
	};

	/**
	 * 處理儲存區域（統一邏輯）
	 * @param zone 要儲存的區域
	 * @param zonesRef 區域列表的 ref
	 * @param apiCall 根據 zone.id 決定調用 create 或 update API
	 * @param options 可選配置
	 */
	const handleSaveZone = async <R extends { merged?: boolean; message?: string; zone: TZone }>(
		zone: TZone,
		zonesRef: Ref<TZone[]>,
		apiCall: (zone: TZone) => Promise<R>,
		options?: {
			onAfterSave?: (result: R, zone: TZone) => void | Promise<void>;
			cleanZone?: (zone: TZone) => TZone;
			selectedZoneRef?: Ref<string>;
			closeDialogRef?: Ref<boolean>; // 統一處理關閉對話框
			/** 批次儲存時由 dialog 統一 toast */
			suppressToast?: boolean;
			/** 批次儲存時由 @saved 回調統一 reload */
			suppressAfterSave?: boolean;
			/** 批次儲存失敗時 rethrow 給 dialog 顯示 inline */
			rethrowOnError?: boolean;
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
			if (options?.onAfterSave && !options?.suppressAfterSave) {
				await options.onAfterSave(result, cleanedZone);
			}

			// 統一處理關閉對話框
			if (options?.closeDialogRef) {
				options.closeDialogRef.value = false;
			}

			if (!options?.suppressToast) {
				toast.success(result.message || "操作成功");
			}
		} catch (error: any) {
			if (options?.rethrowOnError) {
				throw error;
			}
			// 400 類錯誤（例如驗證失敗）預設訊息可能過於籠統；優先顯示後端 originalMessage
			handleError(error, "儲存區域失敗", { context: "save" });
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
		zonesRef: Ref<TZone[]>,
		deleteApiCall: (zoneId: string) => Promise<{ message?: string }>,
		options?: {
			selectedZoneRef?: Ref<string>;
			selectedLocationRef?: Ref<string>;
			onAfterDelete?: (deletedZone: TZone) => void | Promise<void>;
			findEarliestZone?: (zones: TZone[]) => TZone | null;
			getLocationId?: (location: TLocation) => string;
			reloadZones?: () => void | Promise<void>; // 刪除後重新載入區域資料（用於全區點位圖）
			// 系統特定的刪除選項（方案一：只刪除該系統的地點）
			systemType?: SystemType; // 系統類型，如果提供則只刪除該系統的地點
		}
	): Promise<void> => {
		try {
			// 系統頁：使用統一 service 決定「刪整區」或「僅移除本系統」
			if (options?.systemType) {
				const result = await deleteZoneWithSystemAwareness({
					zoneId,
					systemType: options.systemType,
				})

				// 該系統頁面：不論刪整區或僅移除本系統，後端篩選後都會看不到此區域 → 本地移除
				const index = zonesRef.value.findIndex((z) => z.id === zoneId)
				if (index > -1) {
					const deletedZone = zonesRef.value[index]
					zonesRef.value.splice(index, 1)
					await handlePostDelete(zoneId, deletedZone, zonesRef, options)
				} else {
					// 至少重置選中狀態，避免 UI 指向不存在的 id
					resetSelectedZone(zoneId, zonesRef, options?.selectedZoneRef, options?.findEarliestZone)
					if (options?.selectedLocationRef && options?.getLocationId) {
						resetSelectedLocation(zonesRef, options.selectedLocationRef, options.getLocationId)
					}
				}

				if (result.action === "deleted-zone") {
					toast.success("區域刪除成功")
				} else {
					toast.success("已移除該系統在此區域的所有地點")
				}
				return
			}

			// 如果沒有提供 systemType，或者區域只有該系統使用，則直接刪除整個區域
			await deleteApiCall(zoneId);

			// 從本地資料移除
			const index = zonesRef.value.findIndex(z => z.id === zoneId);
			if (index > -1) {
				const deletedZone = zonesRef.value[index];
				zonesRef.value.splice(index, 1);
				await handlePostDelete(zoneId, deletedZone, zonesRef, options);
			}

			toast.success("區域刪除成功");
		} catch (error) {
			handleError(error, "刪除區域失敗");
		}
	};

	/**
	 * 找到最先創建的區域（根據 ID 排序）
	 */
	const findEarliestZone = (zones: TZone[]): TZone | null => {
		if (zones.length === 0) return null;

		// 嘗試將 ID 轉換為數字進行比較（如果是數字 ID）
		const numericZones = zones.filter(zone => {
			if (!zone.id) return false;
			const numId = Number(zone.id);
			return !isNaN(numId) && isFinite(numId);
		});

		// 如果有數字 ID，根據數值排序（小的在前）
		if (numericZones.length > 0) {
			return numericZones.sort((a, b) => Number(a.id) - Number(b.id))[0];
		}

		// 否則根據 ID 的字典序排序（小的在前），過濾掉沒有 ID 的區域
		const zonesWithId = zones.filter(zone => zone.id);
		if (zonesWithId.length > 0) {
			return [...zonesWithId].sort((a, b) => (a.id || "").localeCompare(b.id || ""))[0];
		}

		// 如果都沒有 ID，返回第一個
		return zones[0];
	};

	/**
	 * 排序區域：sortOrder → 名稱數字 → id（與後端／區域管理一致）
	 */
	const sortZones = (zones: TZone[]): TZone[] => {
		if (!zones || zones.length === 0) return [];

		return [...zones].sort((a, b) =>
			compareZonesLoose(
				a as { sortOrder?: number | null; name?: string; id?: string },
				b as { sortOrder?: number | null; name?: string; id?: string }
			)
		);
	};

	return {
		handleSaveZone,
		handleDeleteZone,
		findEarliestZone,
		sortZones
	};
}

