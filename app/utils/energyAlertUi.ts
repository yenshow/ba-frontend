import type { EnergyAlertDisplayItem } from "~/types/energy"

type AlertIcon = "bang" | "check" | "info"

export type EnergyAlertUi = {
	wrap: string
	dot: string
	icon: AlertIcon
}

export const getEnergyAlertUi = (
	severity: string,
	kind?: EnergyAlertDisplayItem["kind"]
): EnergyAlertUi => {
	if (kind === "insight" || severity === "insight") {
		return {
			wrap: "border-sky-400/30 bg-sky-500/10",
			dot: "bg-sky-400",
			icon: "info",
		}
	}
	const key = severity.toLowerCase()
	if (key === "critical" || key === "danger" || key === "error") {
		return {
			wrap: "border-red-400/40 bg-red-500/10",
			dot: "bg-red-500",
			icon: "bang",
		}
	}
	if (key === "warning" || key === "warn") {
		return {
			wrap: "border-amber-400/35 bg-amber-500/10",
			dot: "bg-amber-400",
			icon: "bang",
		}
	}
	return {
		wrap: "border-cyan-400/30 bg-cyan-500/10",
		dot: "bg-[#2EE6D6]",
		icon: "check",
	}
}
