import type {
	Person,
	PersonLicensePlateFormItem,
	PersonLicensePlateListType,
	PersonLicensePlateSyncStatus,
	LocationLicensePlateRow,
} from "~/types/personnel";
import type {
	VehicleLicensePlateListType,
	LocationTemporaryLicensePlate,
} from "~/types/vehicleAccess";
import type { SyncStepUiStatus } from "~/utils/personnelUtils";

const VALID_PLATE_LIST_TYPES = new Set<string>(["allowList", "blockList"]);

export const MAX_PERSON_LICENSE_PLATES = 5;

export const LICENSE_PLATE_LIST_TYPE_OPTIONS = [
	{ value: "allowList", label: "授權名單" },
	{ value: "blockList", label: "拒絕名單" },
];

export type IsapiPlateBindMode = "bound" | "temporary";

export const LICENSE_PLATE_BIND_MODE_OPTIONS = [
	{ value: "bound", label: "綁定人員" },
	{ value: "temporary", label: "臨時車輛" },
];

/** 人員車牌表單：datetime-local ↔ ISO */
export const isoToDatetimeLocal = (iso?: string | null): string => {
	if (!iso?.trim()) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const defaultLicensePlateBeginLocal = (): string =>
	isoToDatetimeLocal(new Date().toISOString());

export const defaultLicensePlateEndLocal = (): string => {
	const d = new Date();
	d.setFullYear(d.getFullYear() + 1);
	return isoToDatetimeLocal(d.toISOString());
};

export const createEmptyLicensePlateFormItem = (): PersonLicensePlateFormItem => ({
	plateNumber: "",
	listType: "allowList",
	effectiveBegin: defaultLicensePlateBeginLocal(),
	effectiveEnd: defaultLicensePlateEndLocal(),
});

export const mapPersonLicensePlatesToForm = (p: Person): PersonLicensePlateFormItem[] =>
	(p.license_plates ?? []).map((pl) => ({
		plateNumber: pl.plate_number,
		listType: pl.list_type ?? "allowList",
		effectiveBegin: isoToDatetimeLocal(pl.effective_begin) || defaultLicensePlateBeginLocal(),
		effectiveEnd: isoToDatetimeLocal(pl.effective_end) || defaultLicensePlateEndLocal(),
	}));

const isLicensePlateRowEmpty = (row: PersonLicensePlateFormItem): boolean =>
	!row.plateNumber.trim();

/** 人員 Dialog 車牌列：未填車牌號視為空白列；有填車牌號者，其餘欄位須完整 */
export const validateLicensePlateFormItems = (
	items: PersonLicensePlateFormItem[],
): string | null => {
	const rows = items.filter((row) => !isLicensePlateRowEmpty(row));
	if (rows.length > MAX_PERSON_LICENSE_PLATES) {
		return `車牌最多 ${MAX_PERSON_LICENSE_PLATES} 筆`;
	}
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const n = i + 1;
		if (!row.plateNumber.trim()) return `第 ${n} 筆車牌：請填寫車牌`;
		if (!row.listType || !VALID_PLATE_LIST_TYPES.has(row.listType)) {
			return `第 ${n} 筆車牌：請選擇名單類型`;
		}
		if (!row.effectiveBegin?.trim()) return `第 ${n} 筆車牌：請填寫開始時間`;
		if (!row.effectiveEnd?.trim()) return `第 ${n} 筆車牌：請填寫結束時間`;
		const begin = new Date(row.effectiveBegin);
		const end = new Date(row.effectiveEnd);
		if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) {
			return `第 ${n} 筆車牌：時間格式無效`;
		}
		if (end <= begin) return `第 ${n} 筆車牌：結束時間須晚於開始時間`;
	}
	return null;
};

/** 須先通過 validateLicensePlateFormItems */
export const licensePlateItemsToPayload = (items: PersonLicensePlateFormItem[]) =>
	items
		.filter((row) => row.plateNumber.trim())
		.map((i) => ({
			plateNumber: i.plateNumber.trim(),
			listType: i.listType,
			effectiveBegin: new Date(i.effectiveBegin).toISOString(),
			effectiveEnd: new Date(i.effectiveEnd).toISOString(),
		}));

/** ISAPI 車牌管理：表單模型（雙模式） */
export interface IsapiPlateFormModel {
	bindMode: IsapiPlateBindMode;
	licensePlate: string;
	listType: VehicleLicensePlateListType;
	effectiveBeginLocal: string;
	effectiveEndLocal: string;
	bindPersonId: string;
	displayName: string;
}

export const formatLicensePlateDisplayTime = (iso?: string | null): string => {
	if (!iso?.trim()) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const createDefaultIsapiPlateForm = (
	bindMode: IsapiPlateBindMode = "bound",
): IsapiPlateFormModel => ({
	bindMode,
	licensePlate: "",
	listType: "allowList",
	effectiveBeginLocal: defaultLicensePlateBeginLocal(),
	effectiveEndLocal: defaultLicensePlateEndLocal(),
	bindPersonId: "",
	displayName: "",
});

/** ISAPI 車牌管理 Dialog：依模式驗證（類型／綁定欄位優先） */
export const validateIsapiPlateForm = (form: IsapiPlateFormModel): string | null => {
	if (form.bindMode === "bound") {
		if (!form.bindPersonId?.trim()) return "請選擇綁定人員";
	} else if (!form.displayName?.trim()) {
		return "請填寫姓名";
	}
	if (!form.licensePlate.trim()) return "請填寫車牌";
	if (!form.listType || !VALID_PLATE_LIST_TYPES.has(form.listType)) {
		return "請選擇名單類型";
	}
	if (!form.effectiveBeginLocal?.trim()) return "請填寫開始時間";
	if (!form.effectiveEndLocal?.trim()) return "請填寫結束時間";
	const begin = new Date(form.effectiveBeginLocal);
	const end = new Date(form.effectiveEndLocal);
	if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) return "時間格式無效";
	if (end <= begin) return "結束時間須晚於開始時間";
	return null;
};

export const licensePlateListTypeShortLabel = (listType: VehicleLicensePlateListType): string =>
	listType === "allowList" ? "授權" : "拒絕";

/** 平台地點車牌列 → 表單（綁定人員模式） */
export const isapiPlateFormFromLocationRow = (row: {
	plate_number: string;
	list_type?: PersonLicensePlateListType;
	effective_begin?: string | null;
	effective_end?: string | null;
	person_id: number;
}): IsapiPlateFormModel => ({
	bindMode: "bound",
	licensePlate: row.plate_number,
	listType: row.list_type ?? "allowList",
	effectiveBeginLocal: isoToDatetimeLocal(row.effective_begin) || defaultLicensePlateBeginLocal(),
	effectiveEndLocal: isoToDatetimeLocal(row.effective_end) || defaultLicensePlateEndLocal(),
	bindPersonId: String(row.person_id),
	displayName: "",
});

/** 臨時車牌列 → 表單 */
export const isapiPlateFormFromTemporaryRow = (
	row: LocationTemporaryLicensePlate,
): IsapiPlateFormModel => ({
	bindMode: "temporary",
	licensePlate: row.plate_number,
	listType: (row.list_type as VehicleLicensePlateListType) ?? "allowList",
	effectiveBeginLocal: isoToDatetimeLocal(row.effective_begin) || defaultLicensePlateBeginLocal(),
	effectiveEndLocal: isoToDatetimeLocal(row.effective_end) || defaultLicensePlateEndLocal(),
	bindPersonId: "",
	displayName: row.display_name || "",
});

export const temporaryPlatePayloadFromForm = (form: IsapiPlateFormModel) => ({
	plateNumber: form.licensePlate.trim(),
	listType: form.listType,
	effectiveBegin: new Date(form.effectiveBeginLocal).toISOString(),
	effectiveEnd: new Date(form.effectiveEndLocal).toISOString(),
	displayName: form.displayName.trim(),
});

export const plateSyncStatusToUiStatus = (
	status?: PersonLicensePlateSyncStatus | string | null,
): SyncStepUiStatus => {
	const raw = String(status || "").trim().toLowerCase();
	if (raw === "synced") return "success";
	if (raw === "failed") return "failed";
	if (raw === "partial" || raw === "pending") return "pending";
	return "no_data";
};

/** 人員主檔是否已登記車牌（對齊人員列表「資料（平台）」欄） */
export const personHasLicensePlates = (person: Person): boolean => {
	const count = Number(person.license_plate_count ?? 0);
	if (count > 0) return true;
	return (person.license_plates ?? []).some((p) => String(p.plate_number ?? "").trim());
};

type PlateSyncSource = { isapi_sync_status?: string | null };

/** 地點名單 UI：優先用地點 API 列（含 ISAPI 狀態），否則回退人員主檔／count */
export const resolvePersonPlateSyncSources = (
	person: Person,
	locationRows: LocationLicensePlateRow[],
): PlateSyncSource[] => {
	if (locationRows.length > 0) {
		return locationRows.map((row) => ({ isapi_sync_status: row.isapi_sync_status }));
	}
	const master = (person.license_plates ?? [])
		.filter((p) => String(p.plate_number ?? "").trim())
		.map((p) => ({ isapi_sync_status: p.isapi_sync_status ?? null }));
	if (master.length > 0) return master;
	return personHasLicensePlates(person) ? [{ isapi_sync_status: null }] : [];
};

/** 地點名單 UI：車牌列顯示（僅有完整資料時；count-only 不回傳假列） */
export const resolvePersonPlateDisplayRows = (
	person: Person,
	locationRows: LocationLicensePlateRow[],
): LocationLicensePlateRow[] => {
	if (locationRows.length > 0) return locationRows;
	const master = (person.license_plates ?? []).filter((p) => String(p.plate_number ?? "").trim());
	if (master.length === 0) return [];
	return master.map((plate) => ({
		...plate,
		employee_no: person.employee_no,
		full_name: person.full_name,
		person_status: person.status,
		isapi_sync_status: plate.isapi_sync_status ?? "pending",
	}));
};

/** 彙整人員多張車牌的同步 UI 狀態（失敗 > 待同步 > 成功） */
export const aggregatePlateSyncUiStatus = (
	statuses: Array<PersonLicensePlateSyncStatus | string | null | undefined>,
): SyncStepUiStatus => {
	const ui = statuses.map((s) => plateSyncStatusToUiStatus(s));
	if (ui.some((s) => s === "failed")) return "failed";
	if (ui.some((s) => s === "pending")) return "pending";
	if (ui.some((s) => s === "success" || s === "unchanged")) return "success";
	return "no_data";
};
