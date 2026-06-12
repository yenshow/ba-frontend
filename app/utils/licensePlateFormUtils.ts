import type {
	Person,
	PersonLicensePlateFormItem,
	PersonLicensePlateListType,
	PersonLicensePlateSyncStatus,
} from "~/types/personnel";
import type {
	VehicleLicensePlateAuditItem,
	VehicleLicensePlateListType,
} from "~/types/vehicleAccess";

const VALID_PLATE_LIST_TYPES = new Set<string>(["allowList", "blockList"]);

export const MAX_PERSON_LICENSE_PLATES = 5;

export const LICENSE_PLATE_LIST_TYPE_OPTIONS = [
	{ value: "allowList", label: "授權名單" },
	{ value: "blockList", label: "拒絕名單" },
];

/** 人員車牌表單：datetime-local ↔ ISO（含 ISAPI 時區偏移字串） */
export const isoToDatetimeLocal = (iso?: string | null): string => {
	if (!iso?.trim()) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const datetimeLocalToIsapi = (local: string): string | undefined => {
	if (!local?.trim()) return undefined;
	const d = new Date(local);
	if (Number.isNaN(d.getTime())) return undefined;
	const pad = (n: number) => String(n).padStart(2, "0");
	const offMin = -d.getTimezoneOffset();
	const sign = offMin >= 0 ? "+" : "-";
	const abs = Math.abs(offMin);
	const oh = pad(Math.floor(abs / 60));
	const om = pad(abs % 60);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${oh}:${om}`;
};

export const defaultLicensePlateBeginLocal = (): string =>
	isoToDatetimeLocal(new Date().toISOString());

export const defaultLicensePlateEndLocal = (): string => {
	const d = new Date();
	d.setFullYear(d.getFullYear() + 5);
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

/** ISAPI 車牌管理：表單模型 */
export interface IsapiPlateFormModel {
	licensePlate: string;
	listType: VehicleLicensePlateListType;
	createTimeLocal: string;
	effectiveTimeLocal: string;
	bindPersonId: string;
}

export const formatLicensePlateDisplayTime = (iso?: string | null): string => {
	if (!iso?.trim()) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const createDefaultIsapiPlateForm = (): IsapiPlateFormModel => ({
	licensePlate: "",
	listType: "allowList",
	createTimeLocal: defaultLicensePlateBeginLocal(),
	effectiveTimeLocal: defaultLicensePlateEndLocal(),
	bindPersonId: "",
});

/** ISAPI 車牌管理 Dialog：車牌、名單類型、開始／結束時間必填 */
export const validateIsapiPlateForm = (form: IsapiPlateFormModel): string | null => {
	if (!form.licensePlate.trim()) return "請填寫車牌";
	if (!form.listType || !VALID_PLATE_LIST_TYPES.has(form.listType)) {
		return "請選擇名單類型";
	}
	if (!form.createTimeLocal?.trim()) return "請填寫開始時間";
	if (!form.effectiveTimeLocal?.trim()) return "請填寫結束時間";
	const begin = new Date(form.createTimeLocal);
	const end = new Date(form.effectiveTimeLocal);
	if (Number.isNaN(begin.getTime()) || Number.isNaN(end.getTime())) return "時間格式無效";
	if (end <= begin) return "結束時間須晚於開始時間";
	return null;
};

export const licensePlateListTypeShortLabel = (listType: VehicleLicensePlateListType): string =>
	listType === "allowList" ? "授權" : "拒絕";

export type IsapiPlateUpsertEntry = {
	id: string;
	licensePlate: string;
	listType: VehicleLicensePlateListType;
	operationType: "add" | "modify";
	createTime: string;
	effectiveTime: string;
	bindPersonId?: number;
};

/** 驗證表單並組出 upsert API 單筆 payload；失敗回傳 error 訊息 */
export const buildIsapiPlateUpsertEntry = (
	form: IsapiPlateFormModel,
	operationType: "add" | "modify",
): { entry: IsapiPlateUpsertEntry } | { error: string } => {
	const validationError = validateIsapiPlateForm(form);
	if (validationError) return { error: validationError };

	const createTime = datetimeLocalToIsapi(form.createTimeLocal);
	const effectiveTime = datetimeLocalToIsapi(form.effectiveTimeLocal);
	if (!createTime || !effectiveTime) return { error: "時間格式無效" };

	const plate = form.licensePlate.trim();
	const bindRaw = form.bindPersonId?.trim();
	const bindPersonId = bindRaw ? Number.parseInt(bindRaw, 10) : Number.NaN;

	return {
		entry: {
			id: plate,
			licensePlate: plate,
			listType: form.listType,
			operationType,
			createTime,
			effectiveTime,
			...(Number.isFinite(bindPersonId) ? { bindPersonId } : {}),
		},
	};
};

export const isapiPlateFormFromAuditRow = (row: VehicleLicensePlateAuditItem): IsapiPlateFormModel => ({
	licensePlate: row.licensePlate,
	listType: row.listType,
	createTimeLocal: isoToDatetimeLocal(row.createTime) || defaultLicensePlateBeginLocal(),
	effectiveTimeLocal: isoToDatetimeLocal(row.effectiveTime) || defaultLicensePlateEndLocal(),
	bindPersonId:
		row.bindPersonId != null && Number.isFinite(Number(row.bindPersonId))
			? String(row.bindPersonId)
			: "",
});

/** 平台地點車牌列 → ISAPI 表單（車牌管理 Step 2） */
export const isapiPlateFormFromLocationRow = (row: {
	plate_number: string;
	list_type?: PersonLicensePlateListType;
	effective_begin?: string | null;
	effective_end?: string | null;
	person_id: number;
}): IsapiPlateFormModel => ({
	licensePlate: row.plate_number,
	listType: row.list_type ?? "allowList",
	createTimeLocal: isoToDatetimeLocal(row.effective_begin) || defaultLicensePlateBeginLocal(),
	effectiveTimeLocal: isoToDatetimeLocal(row.effective_end) || defaultLicensePlateEndLocal(),
	bindPersonId: String(row.person_id),
});

export type PlateSyncPill = { label: string; className: string };

const PLATE_SYNC_PILL_CLASS: Record<string, string> = {
	synced: "bg-emerald-500/25 text-emerald-100 ring-emerald-400/40",
	pending: "bg-amber-500/20 text-amber-100 ring-amber-400/35",
	partial: "bg-orange-500/20 text-orange-100 ring-orange-400/35",
	failed: "bg-rose-500/25 text-rose-100 ring-rose-400/40",
};

const PLATE_SYNC_PILL_LABEL: Record<string, string> = {
	synced: "已同步",
	pending: "待同步",
	partial: "部分失敗",
	failed: "失敗",
};

export const getPlateSyncPill = (
	status?: PersonLicensePlateSyncStatus | string | null,
): PlateSyncPill => {
	const raw = String(status || "").trim().toLowerCase();
	const key =
		raw === "synced"
			? "synced"
			: raw === "partial"
				? "partial"
				: raw === "failed"
					? "failed"
					: "pending";
	return {
		label: PLATE_SYNC_PILL_LABEL[key] ?? "待同步",
		className: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 2xl:text-sm ${PLATE_SYNC_PILL_CLASS[key]}`,
	};
};

