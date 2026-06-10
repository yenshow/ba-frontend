import type {
	Person,
	PersonLicensePlateFormItem,
	PersonLicensePlateListType,
} from "~/types/personnel";
import type {
	VehicleLicensePlateAuditItem,
	VehicleLicensePlateListType,
} from "~/types/vehicleAccess";

const VALID_PLATE_LIST_TYPES = new Set<string>(["allowList", "blockList"]);

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
	!row.plateNumber.trim() &&
	!row.effectiveBegin?.trim() &&
	!row.effectiveEnd?.trim();

/** 人員 Dialog 車牌列：有填車牌號者，其餘欄位皆必填 */
export const validateLicensePlateFormItems = (
	items: PersonLicensePlateFormItem[],
): string | null => {
	const rows = items.filter((row) => !isLicensePlateRowEmpty(row));
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

export const formatPersonBindLabel = (
	employeeNo?: string | null,
	fullName?: string | null,
): string => `${employeeNo ?? ""}${fullName ? ` ${fullName}` : ""}`.trim();

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

