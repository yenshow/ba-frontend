/**
 * sort_order / sortOrder：物件展開與區域列表排序共用邏輯
 */

export function pickSortOrder(value: unknown): { sortOrder: number } | Record<string, never> {
	if (value == null) return {};
	const n = Number(value);
	return Number.isFinite(n) ? { sortOrder: n } : {};
}

export function zoneSortOrderValue(zone: { sortOrder?: number | null }): number {
	const v = Number(zone.sortOrder);
	return Number.isFinite(v) ? v : 0;
}

/**
 * 區域管理對話框「與鄰列交換 sortOrder」時使用。
 * 若該列尚無有效 sortOrder（舊資料），以目前可見列索引當作暫時權重，才能與 zoneSortOrderValue（缺值→0）區分，
 * 避免多列同為 0 時交換無效。
 */
export function sortOrderForZoneRowSwap(stored: unknown, visibleRowIndex: number): number {
	const n = Number(stored);
	return Number.isFinite(n) ? n : visibleRowIndex;
}

/** 區域管理對話框列：sortOrder → getZoneId（含 temp- 穩定順序） */
export function compareZoneRowsForDialog<T>(a: T, b: T, getZoneId: (z: T) => string): number {
	const oa = zoneSortOrderValue(a as { sortOrder?: number | null });
	const ob = zoneSortOrderValue(b as { sortOrder?: number | null });
	if (oa !== ob) return oa - ob;
	return (getZoneId(a) || "").localeCompare(getZoneId(b) || "", undefined, { numeric: true });
}

/**
 * 首頁／狀態中心等：sortOrder → 名稱內數字 → id
 * （皆無有效 sortOrder 時仍可依 1F/2F 慣例排序）
 */
export function compareZonesLoose(a: {
	sortOrder?: number | null;
	name?: string;
	id?: string;
}, b: typeof a): number {
	const diff = zoneSortOrderValue(a) - zoneSortOrderValue(b);
	if (diff !== 0) return diff;
	const nameA = a.name || "";
	const nameB = b.name || "";
	const numA = parseInt(nameA.match(/\d+/)?.[0] || "999", 10) || 999;
	const numB = parseInt(nameB.match(/\d+/)?.[0] || "999", 10) || 999;
	if (numA !== numB) return numA - numB;
	return String(a.id ?? "").localeCompare(String(b.id ?? ""), undefined, { numeric: true });
}

/**
 * 區域依 compareZonesLoose 排序後，取「第一個有地點的區域」內陣列順序第一筆地點
 * （陣列順序應與後端 locations.sort_order 一致）。
 */
export function firstLocationInSortedZones<
	T extends {
		sortOrder?: number | null;
		name?: string;
		id?: string;
		locations?: readonly Loc[] | null | undefined;
	},
	Loc = T["locations"] extends readonly (infer L)[] | null | undefined ? L : never,
>(zones: readonly T[]): Loc | undefined {
	const sorted = [...zones].sort((a, b) => compareZonesLoose(a, b));
	for (const z of sorted) {
		const locs = z.locations;
		if (locs?.length) return locs[0] as Loc;
	}
	return undefined;
}

/**
 * 人流總覽：zones 依 compareZonesLoose 排序後，依各區 locations 順序找第一個在 flatSites（含 locationId）有對應的項目。
 */
export function firstFlatSiteMatchingSortedZoneLocations<
	Z extends {
		sortOrder?: number | null;
		name?: string;
		id?: string;
		locations?: readonly { id?: string }[] | null | undefined;
	},
	F extends { locationId: number },
>(zones: readonly Z[], flatSites: readonly F[]): F | undefined {
	const sorted = [...zones].sort((a, b) => compareZonesLoose(a, b));
	for (const z of sorted) {
		for (const cfg of z.locations || []) {
			const id = Number(cfg.id);
			if (!Number.isFinite(id)) continue;
			const hit = flatSites.find((s) => s.locationId === id);
			if (hit) return hit;
		}
	}
	return undefined;
}

/**
 * 人流總覽排序：zones 依 compareZonesLoose 排序後，依各區 locations 陣列序對 flatSites（含 locationId）做重排。
 * - 會優先輸出「zones/locations 能對應到的 site」
 * - 其餘未對應到的 site 會保留原本順序並附加在尾端（避免 UI 掉資料）
 */
export function sortFlatSitesBySortedZoneLocations<
	Z extends {
		sortOrder?: number | null;
		name?: string;
		id?: string;
		locations?: readonly { id?: string }[] | null | undefined;
	},
	F extends { locationId: number },
>(zones: readonly Z[], flatSites: readonly F[]): F[] {
	const sortedZones = [...zones].sort((a, b) => compareZonesLoose(a, b));
	const byId = new Map<number, F>();
	for (const s of flatSites) byId.set(Number(s.locationId), s);

	const used = new Set<number>();
	const ordered: F[] = [];

	for (const z of sortedZones) {
		for (const cfg of z.locations || []) {
			const id = Number(cfg.id);
			if (!Number.isFinite(id) || used.has(id)) continue;
			const hit = byId.get(id);
			if (!hit) continue;
			used.add(id);
			ordered.push(hit);
		}
	}

	// append the rest, stable
	for (const s of flatSites) {
		const id = Number(s.locationId);
		if (!Number.isFinite(id) || used.has(id)) continue;
		ordered.push(s);
	}

	return ordered;
}
