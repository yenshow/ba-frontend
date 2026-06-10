/** 授權頁／管理 Dialog 共用的兩步驟 pill 導覽樣式 */
export const useWizardStepNav = () => {
	const getPillButtonClass = (isActive: boolean) =>
		isActive
			? "border-white/25 bg-white/10 text-white"
			: "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"

	const getStepCircleClass = (isActive: boolean) =>
		isActive
			? "bg-cyan-500/25 text-cyan-100 ring-cyan-400/40"
			: "bg-white/10 text-white/70 ring-white/20"

	return { getPillButtonClass, getStepCircleClass }
}
