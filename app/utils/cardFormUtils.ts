import type { Person } from "~/types/personnel";

export type PersonCardSource = "manual" | "captured" | "virtual";

export type PersonCardFormItem = {
	cardNo: string;
	source: PersonCardSource;
};

export type PersonCardPayload = {
	cardNo: string;
	source: PersonCardSource;
};

export const MAX_PERSON_CARDS = 5;

const VIRTUAL_CARD_PREFIX = "9";
const VIRTUAL_CARD_LENGTH = 10;

/** 人員卡號固定長度（與虛擬卡一致） */
export const PERSON_CARD_NO_LENGTH = VIRTUAL_CARD_LENGTH;

export const sanitizeCardNoInput = (raw: string): string =>
	String(raw ?? "")
		.replace(/\D/g, "")
		.slice(0, PERSON_CARD_NO_LENGTH);

/** 手動修改卡號後，依格式調整來源（虛擬卡格式仍標為 virtual） */
export const reconcileCardSourceAfterManualEdit = (
	cardNo: string,
	source: PersonCardSource,
): PersonCardSource => {
	if (isVirtualCardFormat(cardNo)) return "virtual";
	if (source === "captured" || source === "virtual") return "manual";
	return source;
};

const VALID_SOURCES = new Set<PersonCardSource>(["manual", "captured", "virtual"]);

const asRecord = (v: unknown): Record<string, unknown> | null => {
	if (!v || typeof v !== "object") return null;
	return v as Record<string, unknown>;
};

export const isVirtualCardFormat = (cardNo: string): boolean => {
	const c = cardNo.trim();
	return (
		c.length === VIRTUAL_CARD_LENGTH &&
		c.startsWith(VIRTUAL_CARD_PREFIX) &&
		/^\d+$/.test(c)
	);
};

const normalizeSource = (raw: unknown, cardNo: string): PersonCardSource => {
	const s = raw != null ? String(raw).trim() : "";
	if (VALID_SOURCES.has(s as PersonCardSource)) return s as PersonCardSource;
	return isVirtualCardFormat(cardNo) ? "virtual" : "manual";
};

const normalizeCardEntry = (entry: unknown): PersonCardFormItem | null => {
	if (entry == null) return null;
	if (typeof entry === "string") {
		const cardNo = entry.trim();
		if (!cardNo) return null;
		return { cardNo, source: normalizeSource(null, cardNo) };
	}
	const row = asRecord(entry);
	if (!row) return null;
	const cardNo =
		typeof row.cardNo === "string"
			? row.cardNo.trim()
			: typeof row.card_no === "string"
				? row.card_no.trim()
				: "";
	if (!cardNo) return null;
	return { cardNo, source: normalizeSource(row.source, cardNo) };
};

/** 從 person.config 解析卡號列表（含舊 cardNo 相容） */
export const resolveAccessControlCardsFromPerson = (
	person: Person | null | undefined,
): PersonCardFormItem[] => {
	const config = asRecord(person?.config);
	const ac = asRecord(config?.access_control);
	if (!ac) return [];
	if (Array.isArray(ac.cards) && ac.cards.length > 0) {
		const out: PersonCardFormItem[] = [];
		for (const entry of ac.cards) {
			const normalized = normalizeCardEntry(entry);
			if (normalized) out.push(normalized);
		}
		if (out.length) return out;
	}
	const legacy = typeof ac.cardNo === "string" ? ac.cardNo.trim() : "";
	if (legacy) return [{ cardNo: legacy, source: "manual" }];
	return [];
};

export const createEmptyCardFormItem = (): PersonCardFormItem => ({
	cardNo: "",
	source: "manual",
});

export const mapAccessControlCardsToForm = (
	person: Person | null | undefined,
): PersonCardFormItem[] => {
	const cards = resolveAccessControlCardsFromPerson(person);
	return cards.length > 0 ? cards : [createEmptyCardFormItem()];
};

const isCardRowEmpty = (row: PersonCardFormItem): boolean => !row.cardNo.trim();

const normalizeCardsForSnapshot = (items: PersonCardFormItem[]) =>
	items
		.filter((row) => !isCardRowEmpty(row))
		.map((row) => ({
			cardNo: row.cardNo.trim(),
			source: row.source,
		}));

export const cardsJsonForSnapshot = (items: PersonCardFormItem[]): string =>
	JSON.stringify(normalizeCardsForSnapshot(items));

export const validateCardFormItems = (items: PersonCardFormItem[]): string | null => {
	const rows = items.filter((row) => !isCardRowEmpty(row));
	if (rows.length > MAX_PERSON_CARDS) {
		return `卡號最多 ${MAX_PERSON_CARDS} 張`;
	}
	const seen = new Set<string>();
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const n = i + 1;
		const cardNo = row.cardNo.trim();
		if (!/^\d+$/.test(cardNo)) return `第 ${n} 張卡號：僅允許數字`;
		if (cardNo.length !== PERSON_CARD_NO_LENGTH) return `第 ${n} 張卡號：須為 10 碼`;
		if (seen.has(cardNo)) return `第 ${n} 張卡號：卡號不可重複`;
		seen.add(cardNo);
		if (row.source === "virtual") {
			if (!isVirtualCardFormat(cardNo)) {
				return `第 ${n} 張卡號：虛擬卡須為 10 碼且以 9 開頭`;
			}
		} else if (isVirtualCardFormat(cardNo)) {
			return `第 ${n} 張卡號：請使用「生成卡號」`;
		}
	}
	return null;
};

export const cardItemsToPayload = (items: PersonCardFormItem[]): PersonCardPayload[] =>
	items
		.filter((row) => row.cardNo.trim())
		.map((row) => ({
			cardNo: row.cardNo.trim(),
			source: row.source,
		}));

export const personHasAnyAccessCard = (person: Person | null | undefined): boolean =>
	resolveAccessControlCardsFromPerson(person).length > 0;

export const findFirstEmptyCardRowIndex = (items: PersonCardFormItem[]): number =>
	items.findIndex((row) => !row.cardNo.trim());
