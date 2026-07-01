import QRCode from "qrcode"
import type { PersonCardSource } from "~/utils/cardFormUtils"

export const personCardSourceLabel = (source: PersonCardSource): string =>
	source === "virtual" ? "虛擬卡" : "普通卡片"

export const buildCardQrDataUrl = (cardNo: string) => {
	const text = cardNo.trim()
	if (!text) return Promise.reject(new Error("卡號不可為空"))
	return QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, width: 280 })
}

export const downloadCardQrImage = (dataUrl: string, fileName: string) => {
	const link = document.createElement("a")
	link.href = dataUrl
	link.download = fileName
	link.click()
}

export const buildCardQrFileName = (employeeNo: string, cardNo: string, cardIndex?: number) => {
	const suffix = cardIndex != null && cardIndex > 1 ? `-${cardIndex}` : ""
	return `qr-${employeeNo.trim() || "person"}-${cardNo.trim()}${suffix}.png`
}
