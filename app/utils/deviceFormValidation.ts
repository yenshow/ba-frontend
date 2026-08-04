import type { DeviceTypeCode } from "~/types/device"

export type DeviceFormValidationInput = {
	name: string
	deviceTypeCode: DeviceTypeCode
	modelId: number
	cameraCategoryCode: string
	sensorProtocol?: string
	sensorPort?: number
	sensorUnitId?: number
	isSensorPortInherited: boolean
	isSensorUnitIdInherited: boolean
	/** 所選型號為電表時需填用途系統 */
	isElectricityMeter?: boolean
	energyUsageSystem?: string
	controllerPort?: number
	isControllerPortInherited: boolean
	isHcnetSdkController: boolean
	controllerUsername?: string
	controllerPassword?: string
	cameraIp: string
	cameraUsername: string
	cameraPassword: string
}

export type DeviceModelFormValidationInput = {
	name: string
	deviceTypeCode: DeviceTypeCode | null
	categoryCode: string
	cameraRtspTemplateEffective: string
	cameraRtspTemplatePresetKey: string
	cameraRtspTemplateCustom: string
}

/** 設備表單儲存前集中驗證；回傳第一個錯誤訊息或 null */
export const validateDeviceFormForSave = (input: DeviceFormValidationInput): string | null => {
	if (!input.name.trim()) return "請填寫設備名稱"

	if (input.deviceTypeCode === "camera" && !input.cameraCategoryCode.trim()) {
		return "請選擇型號分類"
	}

	if (!input.modelId || input.modelId === 0) {
		return "請選擇設備型號"
	}

	if (input.deviceTypeCode === "sensor" && input.sensorProtocol === "modbus") {
		const hasPort = input.isSensorPortInherited || (input.sensorPort != null && input.sensorPort > 0)
		const hasUnitId =
			input.isSensorUnitIdInherited || (input.sensorUnitId != null && input.sensorUnitId > 0)
		if (!hasPort) return "請填寫端口，或選擇已設定端口的設備型號"
		if (!hasUnitId) return "請填寫 Unit ID，或選擇已設定 Unit ID 的設備型號"
	}

	if (input.deviceTypeCode === "sensor" && input.isElectricityMeter) {
		if (!String(input.energyUsageSystem || "").trim()) {
			return "請選擇電表用途系統"
		}
	}

	if (input.deviceTypeCode === "controller") {
		const hasPort =
			input.isControllerPortInherited || (input.controllerPort != null && input.controllerPort > 0)
		if (!hasPort) return "請填寫端口，或選擇已設定端口的設備型號"
		if (input.isHcnetSdkController) {
			if (!input.controllerUsername?.trim() || !input.controllerPassword?.trim()) {
				return "請填寫梯控登入帳號與密碼"
			}
		}
	}

	if (input.deviceTypeCode === "camera") {
		const ip = input.cameraIp.trim()
		const user = input.cameraUsername.trim()
		const pwd = input.cameraPassword.trim()
		if (!ip || !user || !pwd) return "請填寫設備 IP、登入帳號與密碼"
	}

	return null
}

/** 設備型號表單儲存前集中驗證 */
export const validateDeviceModelFormForSave = (
	input: DeviceModelFormValidationInput,
): string | null => {
	if (!input.name.trim()) return "請填寫型號名稱"

	if (input.deviceTypeCode === "camera" && !input.categoryCode.trim()) {
		return "請選擇型號分類"
	}
	if (input.deviceTypeCode === "camera") {
		const tpl = input.cameraRtspTemplateEffective.trim()
		if (!tpl) return "請選擇 RTSP URL 樣板，或填寫自訂樣板"
		if (input.cameraRtspTemplatePresetKey === "custom" && !input.cameraRtspTemplateCustom.trim()) {
			return "自訂樣板不可為空"
		}
	}
	return null
}
