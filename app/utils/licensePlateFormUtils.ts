import type {
	Person,
	PersonLicensePlateFormItem,
	PersonLicensePlateListType,
} from "~/types/personnel";

const VALID_LIST_TYPES = new Set<PersonLicensePlateListType>(["allowList", "blockList"]);

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

/** 人員 Dialog 車牌列：任一筆存在時，四欄皆必填 */
export const validateLicensePlateFormItems = (
	items: PersonLicensePlateFormItem[],
): string | null => {
	for (let i = 0; i < items.length; i++) {
		const row = items[i];
		const n = i + 1;
		if (!row.plateNumber.trim()) return `第 ${n} 筆車牌：請填寫車牌`;
		if (!row.listType || !VALID_LIST_TYPES.has(row.listType)) {
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
	items.map((i) => ({
		plateNumber: i.plateNumber.trim(),
		listType: i.listType,
		effectiveBegin: new Date(i.effectiveBegin).toISOString(),
		effectiveEnd: new Date(i.effectiveEnd).toISOString(),
	}));

/** 人員綁定下拉／列表顯示 */
export const formatPersonBindLabel = (
	employeeNo?: string | null,
	fullName?: string | null,
): string => `${employeeNo ?? ""}${fullName ? ` ${fullName}` : ""}`.trim();
