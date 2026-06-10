import type { DeviceTypeCode } from "~/types/device";

export type DeviceFormValidationInput = {
	deviceTypeCode: DeviceTypeCode;
	modelId: number;
	cameraCategoryCode: string;
	sensorProtocol?: string;
	sensorPort?: number;
	sensorUnitId?: number;
	isSensorPortInherited: boolean;
	isSensorUnitIdInherited: boolean;
	controllerPort?: number;
	isControllerPortInherited: boolean;
	isHcnetSdkController: boolean;
	controllerUsername?: string;
	controllerPassword?: string;
	cameraIp: string;
	cameraUsername: string;
	cameraPassword: string;
};

/** 設備表單儲存前集中驗證；回傳第一個錯誤訊息或 null */
export const validateDeviceFormForSave = (input: DeviceFormValidationInput): string | null => {
	if (input.deviceTypeCode === "camera" && !input.cameraCategoryCode.trim()) {
		return "請選擇型號分類";
	}

	if (!input.modelId || input.modelId === 0) {
		return "請選擇設備型號";
	}

	if (input.deviceTypeCode === "sensor" && input.sensorProtocol === "modbus") {
		const hasPort = input.isSensorPortInherited || (input.sensorPort != null && input.sensorPort > 0);
		const hasUnitId =
			input.isSensorUnitIdInherited || (input.sensorUnitId != null && input.sensorUnitId > 0);
		if (!hasPort) return "請填寫端口，或選擇已設定端口的設備型號";
		if (!hasUnitId) return "請填寫 Unit ID，或選擇已設定 Unit ID 的設備型號";
	}

	if (input.deviceTypeCode === "controller") {
		const hasPort =
			input.isControllerPortInherited || (input.controllerPort != null && input.controllerPort > 0);
		if (!hasPort) return "請填寫端口，或選擇已設定端口的設備型號";
		if (input.isHcnetSdkController) {
			if (!input.controllerUsername?.trim() || !input.controllerPassword?.trim()) {
				return "請填寫梯控登入帳號與密碼";
			}
		}
	}

	if (input.deviceTypeCode === "camera") {
		const ip = input.cameraIp.trim();
		const user = input.cameraUsername.trim();
		const pwd = input.cameraPassword.trim();
		if (!ip || !user || !pwd) return "請填寫設備 IP、登入帳號與密碼";
	}

	return null;
};
