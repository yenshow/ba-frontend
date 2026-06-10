export type PersonnelGroupDraftRow = {
	name: string
	children: Array<{ name: string }>
}

/** 群組管理表單儲存前集中驗證 */
export const validatePersonnelGroupsDraftForSave = (
	mains: PersonnelGroupDraftRow[],
): string | null => {
	for (const main of mains) {
		if (!main.name.trim()) return "主群組名稱為必填"
		for (const child of main.children) {
			if (!child.name.trim()) {
				return `子群組名稱為必填（主群組：${main.name.trim()}）`
			}
		}
	}
	return null
}
