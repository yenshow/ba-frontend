import type { PersonGroup } from "~/types/personnel";

// --- 群組樹／側欄／表單 ---

export const buildPersonnelChildGroupOptions = (tree: PersonGroup[]) => {
	const opts: { value: string; label: string }[] = [{ value: "", label: "未分組" }];
	for (const main of tree || []) {
		for (const child of main.children || []) {
			opts.push({
				value: String(child.id),
				label: `${main.name} / ${child.name}`
			});
		}
	}
	return opts;
};

export const isSidebarGroupKeyValid = (selectedKey: string, groupTree: PersonGroup[]): boolean => {
	if (selectedKey === "all" || selectedKey === "ungrouped") return true;
	if (selectedKey.startsWith("main:")) {
		const id = Number.parseInt(selectedKey.slice(5), 10);
		return Number.isFinite(id) && (groupTree || []).some(m => m.id === id);
	}
	if (selectedKey.startsWith("child:")) {
		const childId = Number.parseInt(selectedKey.slice(6), 10);
		if (!Number.isFinite(childId)) return false;
		return (groupTree || []).some(m => (m.children || []).some(c => c.id === childId));
	}
	return false;
};

export const resolveMainGroupIdFromSidebarKey = (
	selectedKey: string,
	groupTree: PersonGroup[]
): number | null => {
	if (selectedKey === "ungrouped") return null;
	if (selectedKey.startsWith("main:")) {
		const id = Number.parseInt(selectedKey.slice(5), 10);
		return Number.isFinite(id) ? Math.trunc(id) : null;
	}
	if (selectedKey.startsWith("child:")) {
		const childId = Number.parseInt(selectedKey.slice(6), 10);
		if (!Number.isFinite(childId)) return null;
		for (const main of groupTree || []) {
			if ((main.children || []).some(c => c.id === childId)) return main.id;
		}
	}
	return null;
};

export const findMainGroupById = (
	tree: PersonGroup[],
	mainGroupId: number | null
): PersonGroup | null => {
	if (mainGroupId == null) return null;
	return (tree || []).find(g => g.id === mainGroupId) || null;
};

export const parsePersonGroupIdFromForm = (
	raw: string
): { ok: true; personGroupId: number | null } | { ok: false } => {
	const trimmed = raw.trim();
	if (trimmed === "") return { ok: true, personGroupId: null };
	const id = Number.parseInt(trimmed, 10);
	if (!Number.isFinite(id)) return { ok: false };
	return { ok: true, personGroupId: Math.trunc(id) };
};

// --- 群組刪除確認文案 ---

type DeleteConfirm = {
	title: string;
	message: string;
	details: string;
	type: "danger";
};

export const buildDeletePersonnelMainGroupConfirmCopy = (
	name: string,
	childCount: number
): DeleteConfirm => {
	const label = name.trim() || "未命名";
	const childHint =
		childCount > 0 ? `將一併刪除 ${childCount} 個子群組。` : "此主群組下尚無子群組。";
	return {
		title: "確認刪除",
		message: `確定要刪除主群組「${label}」嗎？`,
		details: `${childHint}若主群組或子群組內尚有人員，將無法刪除。此操作無法復原。`,
		type: "danger"
	};
};

export const buildDeletePersonnelChildGroupConfirmCopy = (name: string): DeleteConfirm => {
	const label = name.trim() || "未命名";
	return {
		title: "確認刪除",
		message: `確定要刪除子群組「${label}」嗎？`,
		details: "若子群組內尚有人員，將無法刪除。此操作無法復原。",
		type: "danger"
	};
};
