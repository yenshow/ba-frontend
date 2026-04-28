import type { Ref, ComputedRef } from "vue"
import type { Person } from "~/types/personnel"
import type { Device } from "~/types/device"

export type PersonnelPersonForm = {
	employeeNo: string
	fullName: string
	status: "active" | "inactive"
	faceUrl: string
}

export type PersonnelPersonAccessControlState = {
	accessControlDevices: Ref<Device[]>
	password: Ref<string>
	isLongTerm: Ref<boolean>
	validBeginDate: Ref<string>
	validEndDate: Ref<string>
	cardNo: Ref<string>
	fingerPrintData: Ref<string>
}

export type PersonnelPersonCaptureState = {
	captureDeviceId: Ref<number | null>
	isCapturingFace: Ref<boolean>
	captureErrorMessage: Ref<string | null>

	cardDeviceId: Ref<number | null>
	isCapturingCard: Ref<boolean>
	cardErrorMessage: Ref<string | null>

	fingerDeviceId: Ref<number | null>
	isCapturingFingerPrint: Ref<boolean>
	fingerPrintErrorMessage: Ref<string | null>
}

export type PersonnelPersonDialogUiState = {
	isSubmitting: Ref<boolean>
	errorMessage: Ref<string | null>
	facePreviewUrl: ComputedRef<string | null>
}

/**
 * 人員編輯 Dialog 的 UI State（以 refs 作為 SSOT；供 Container 與 Dialog 共用）
 */
export type PersonnelPersonDialogState = {
	editingPerson: Ref<Person | null>
	form: PersonnelPersonForm
	accessControl: PersonnelPersonAccessControlState
	capture: PersonnelPersonCaptureState
	ui: PersonnelPersonDialogUiState
}

