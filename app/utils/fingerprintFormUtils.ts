import type { Person } from "~/types/personnel";

export type PersonFingerprintSource = "manual" | "captured";

export type PersonFingerprintFormItem = {
	fingerData: string;
	source: PersonFingerprintSource;
};

export type PersonFingerprintPayload = {
	fingerData: string;
	source: PersonFingerprintSource;
};

export const MAX_PERSON_FINGERPRINTS = 5;

const asRecord = (v: unknown): Record<string, unknown> | null => {
	if (!v || typeof v !== "object") return null;
	return v as Record<string, unknown>;
};

const normalizeFingerprintEntry = (entry: unknown): PersonFingerprintFormItem | null => {
	if (entry == null) return null;
	if (typeof entry === "string") {
		const fingerData = entry.trim();
		if (!fingerData) return null;
		return { fingerData, source: "manual" };
	}
	const row = asRecord(entry);
	if (!row) return null;
	const fingerData =
		typeof row.fingerData === "string"
			? row.fingerData.trim()
			: typeof row.finger_data === "string"
				? row.finger_data.trim()
				: "";
	if (!fingerData) return null;
	const source = row.source === "captured" ? "captured" : "manual";
	return { fingerData, source };
};

export const resolveAccessControlFingerprintsFromPerson = (
	person: Person | null | undefined,
): PersonFingerprintFormItem[] => {
	const config = asRecord(person?.config);
	const ac = asRecord(config?.access_control);
	if (!ac) return [];
	const list = Array.isArray(ac.fingerprints) ? ac.fingerprints : [];
	const out: PersonFingerprintFormItem[] = [];
	for (const entry of list) {
		const normalized = normalizeFingerprintEntry(entry);
		if (normalized) out.push(normalized);
	}
	return out;
};

export const createEmptyFingerprintFormItem = (): PersonFingerprintFormItem => ({
	fingerData: "",
	source: "manual",
});

export const mapAccessControlFingerprintsToForm = (
	person: Person | null | undefined,
): PersonFingerprintFormItem[] => {
	const items = resolveAccessControlFingerprintsFromPerson(person);
	return items.length > 0 ? items : [createEmptyFingerprintFormItem()];
};

const isFingerprintRowEmpty = (row: PersonFingerprintFormItem): boolean =>
	!row.fingerData.trim();

const normalizeFingerprintsForSnapshot = (items: PersonFingerprintFormItem[]) =>
	items
		.filter((row) => !isFingerprintRowEmpty(row))
		.map((row) => ({
			fingerData: row.fingerData.trim(),
			source: row.source,
		}));

export const fingerprintsJsonForSnapshot = (items: PersonFingerprintFormItem[]): string =>
	JSON.stringify(normalizeFingerprintsForSnapshot(items));

export const validateFingerprintFormItems = (
	items: PersonFingerprintFormItem[],
): string | null => {
	const rows = items.filter((row) => !isFingerprintRowEmpty(row));
	if (rows.length > MAX_PERSON_FINGERPRINTS) {
		return `指紋最多 ${MAX_PERSON_FINGERPRINTS} 筆`;
	}
	return null;
};

export const fingerprintItemsToPayload = (
	items: PersonFingerprintFormItem[],
): PersonFingerprintPayload[] =>
	items
		.filter((row) => row.fingerData.trim())
		.map((row) => ({
			fingerData: row.fingerData.trim(),
			source: row.source,
		}));
