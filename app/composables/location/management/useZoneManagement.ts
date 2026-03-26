import type { SystemType } from "~/types/location";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { compareZonesLoose } from "~/utils/sortOrder";
import { deleteZoneWithSystemAwareness } from "~/services/location/locationService";

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
		resetSelectedZone(zoneId, zonesRef, options?.selectedZoneRef, options?.findEarliestZone);

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

		if (options?.onAfterDelete) {
			await options.onAfterDelete(deletedZone);
		}

		if (options?.reloadZones) {
			await options.reloadZones();
		}
	};

	const handleSaveZone = async <R extends { merged?: boolean; message?: string; zone: TZone }>(
		zone: TZone,
		zonesRef: Ref<TZone[]>,
		apiCall: (zone: TZone) => Promise<R>,
		options?: {
			onAfterSave?: (result: R, zone: TZone) => void | Promise<void>;
			cleanZone?: (zone: TZone) => TZone;
			selectedZoneRef?: Ref<string>;
			closeDialogRef?: Ref<boolean>;
		}
	): Promise<void> => {
		const cleanedZone = options?.cleanZone ? options.cleanZone(zone) : zone;

		try {
			const result = await apiCall(cleanedZone);

			if (result.merged && cleanedZone.id) {
				const oldIndex = zonesRef.value.findIndex(z => z.id === cleanedZone.id);
				if (oldIndex > -1) {
					zonesRef.value.splice(oldIndex, 1);
				}
			}

			const cleanedResultZone = options?.cleanZone ? options.cleanZone(result.zone) : result.zone;

			const targetIndex = zonesRef.value.findIndex(z => z.id === result.zone.id);
			if (targetIndex > -1) {
				zonesRef.value[targetIndex] = cleanedResultZone;
			} else {
				zonesRef.value.push(cleanedResultZone);
			}

			if (options?.selectedZoneRef) {
				const isSelectedZone =
					options.selectedZoneRef.value === cleanedZone.id ||
					options.selectedZoneRef.value === result.zone.id;
				if (isSelectedZone) {
					options.selectedZoneRef.value = result.zone.id;
				}
			}

			if (options?.onAfterSave) {
				await options.onAfterSave(result, cleanedZone);
			}

			if (options?.closeDialogRef) {
				options.closeDialogRef.value = false;
			}

			toast.success(result.message || "操作成功");
		} catch (error: any) {
			handleError(error, "儲存區域失敗");
		}
	};

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
			reloadZones?: () => void | Promise<void>;
			systemType?: SystemType;
		}
	): Promise<void> => {
		try {
			// 系統頁：使用統一 service 決定「刪整區」或「僅移除本系統」
			if (options?.systemType) {
				const result = await deleteZoneWithSystemAwareness({ zoneId, systemType: options.systemType })

				// 該系統頁面：不論刪整區或僅移除本系統，後端篩選後都會看不到此區域 → 本地移除
				const index = zonesRef.value.findIndex((z) => z.id === zoneId)
				if (index > -1) {
					const deletedZone = zonesRef.value[index]
					zonesRef.value.splice(index, 1)
					await handlePostDelete(zoneId, deletedZone, zonesRef, options)
				} else {
					resetSelectedZone(zoneId, zonesRef, options?.selectedZoneRef, options?.findEarliestZone)
					if (options?.selectedLocationRef && options?.getLocationId) {
						resetSelectedLocation(zonesRef, options.selectedLocationRef, options.getLocationId)
					}
				}

				if (result.action === "deleted-zone") toast.success("區域刪除成功")
				else toast.success("已移除該系統在此區域的所有地點")
				return
			}

			await deleteApiCall(zoneId);

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

	const findEarliestZone = (zones: TZone[]): TZone | null => {
		if (zones.length === 0) return null;

		const numericZones = zones.filter(zone => {
			if (!zone.id) return false;
			const numId = Number(zone.id);
			return !isNaN(numId) && isFinite(numId);
		});

		if (numericZones.length > 0) {
			return numericZones.sort((a, b) => Number(a.id) - Number(b.id))[0];
		}

		const zonesWithId = zones.filter(zone => zone.id);
		if (zonesWithId.length > 0) {
			return [...zonesWithId].sort((a, b) => (a.id || "").localeCompare(b.id || ""))[0];
		}

		return zones[0];
	};

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

