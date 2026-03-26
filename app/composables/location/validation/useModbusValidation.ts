export function useModbusValidation() {
	/**
	 * 驗證 Modbus 地址（共用規則：0 ~ 65535）
	 * - 未選擇設備時不驗證（允許空）
	 */
	const validateModbusAddress = (
		address: number | undefined | null,
		deviceId: number | undefined | null
	): string | null => {
		if (!deviceId || deviceId === 0) return null
		if (address === undefined || address === null) return "Modbus 地址不能為空"
		if (address < 0) return "Modbus 地址不能為負數"
		if (address > 65535) return "Modbus 地址不能超過 65535"
		return null
	}

	/**
	 * 驗證 Modbus 類型（DI / DO）
	 * - 未選擇設備時不驗證（允許空）
	 */
	const validateModbusType = (
		type: string | undefined | null,
		deviceId: number | undefined | null
	): string | null => {
		if (!deviceId || deviceId === 0) return null
		if (!type) return "Modbus 類型不能為空"
		if (type !== "DI" && type !== "DO") return "Modbus 類型必須是 DI 或 DO"
		return null
	}

	return {
		validateModbusAddress,
		validateModbusType,
	}
}

