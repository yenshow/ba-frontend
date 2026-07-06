import { TOAST } from "~/config/toastCatalog"
import { useApiBase } from "~/composables/core/useApiBase"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { createSafeFileName } from "~/utils/fileUtils"
import { ApiRequestError } from "~/utils/apiError"

/** 圖片上傳說明（與後端 10MB 上限一致） */
export const IMAGE_UPLOAD_HINT =
	"支援 JPG、PNG、WEBP，單檔 10MB 以內；\n可貼上圖片 URL 或點「上傳圖片」。"

/** 影片上傳說明（與後端 100MB 上限一致） */
export const VIDEO_UPLOAD_HINT =
	"可貼上 YouTube 嵌入／觀看網址，或上傳影片檔案（MP4、WEBM、OGG，單檔 100MB 以內）。"

export type UseAppSettingsOptions = {
	key: string
	defaultValue: string
}

export type UseAppSettingUploadOptions = {
	key: string
	defaultValue?: string
	uploadPrefix: string
	defaultExt: string
}

export type UseAppSettingImageOptions = {
	key: string
	uploadPrefix: string
	defaultExt?: string
	defaultValue?: string
}

type SettingRow = { value: string | null } | null

const resolveSettingValue = (row: SettingRow, defaultValue: string): string => {
	if (row == null || row.value == null || !String(row.value).trim()) {
		return defaultValue
	}
	return String(row.value).trim()
}

export const useAppSettings = (options: UseAppSettingsOptions) => {
	const { key, defaultValue } = options
	const { request } = useApiBase()
	const { showToast } = useToast()
	const { handleError } = useErrorHandler()

	const value = ref(defaultValue)
	const isLoading = ref(false)

	const loadSetting = async () => {
		if (!process.client) {
			value.value = defaultValue
			return
		}

		isLoading.value = true
		try {
			const response = await request<{ setting: SettingRow }>(`/settings/${key}`)
			value.value = resolveSettingValue(response?.setting ?? null, defaultValue)
		} catch {
			value.value = defaultValue
		} finally {
			isLoading.value = false
		}
	}

	const save = async (nextValue: string) => {
		const normalized = nextValue?.trim() ?? ""
		if (!normalized) {
			await reset()
			return
		}

		isLoading.value = true
		try {
			await request(`/settings/${key}`, {
				method: "PUT",
				body: { value: normalized },
			})
			value.value = normalized
			showToast("success", TOAST.SETTINGS_SAVED)
		} catch (error) {
			handleError(error, `儲存設定失敗: ${key}`)
			throw error
		} finally {
			isLoading.value = false
		}
	}

	const uploadFile = async (file: File) => {
		if (!file) throw new Error("未選擇檔案")

		isLoading.value = true
		try {
			const formData = new FormData()
			formData.append("key", key)
			formData.append("file", file)

			const response = await request<{
				setting: { value: string }
				file?: { url: string }
			}>("/settings/upload", {
				method: "POST",
				body: formData,
			})

			const settingValue = response?.setting?.value
			if (settingValue) {
				value.value = settingValue
				showToast("success", TOAST.SETTINGS_UPLOAD_SUCCESS)
			}
		} catch (error) {
			handleError(error, `上傳檔案失敗: ${key}`)
			throw error
		} finally {
			isLoading.value = false
		}
	}

	const reset = async () => {
		if (value.value === defaultValue) {
			showToast("success", TOAST.SETTINGS_RESET_DEFAULT)
			return
		}

		isLoading.value = true
		try {
			await request(`/settings/${key}`, { method: "DELETE" })
			value.value = defaultValue
			showToast("success", TOAST.SETTINGS_RESET_DEFAULT)
		} catch (error: unknown) {
			if (error instanceof ApiRequestError && error.statusCode === 404) {
				value.value = defaultValue
				showToast("success", TOAST.SETTINGS_RESET_DEFAULT)
			} else {
				handleError(error, `重設設定失敗: ${key}`)
				throw error
			}
		} finally {
			isLoading.value = false
		}
	}

	onMounted(loadSetting)

	return { value, isLoading, loadSetting, save, uploadFile, reset }
}

/** 單一 system_settings 欄位：上傳檔案與編輯對話框狀態 */
export const useAppSettingUpload = (options: UseAppSettingUploadOptions) => {
	const { key, uploadPrefix, defaultExt, defaultValue = "" } = options
	const { value: raw, save, reset, uploadFile } = useAppSettings({ key, defaultValue })
	const isEditOpen = ref(false)

	const handleUpload = async (file: File) => {
		await uploadFile(createSafeFileName(uploadPrefix, file, defaultExt))
		isEditOpen.value = false
	}

	return { raw, save, reset, isEditOpen, handleUpload }
}

/** 單一 system_settings 圖片欄位：解析 URL、上傳、編輯對話框狀態 */
export const useAppSettingImage = (options: UseAppSettingImageOptions) => {
	const { key, uploadPrefix, defaultExt = "jpg", defaultValue = "" } = options
	const base = useAppSettingUpload({ key, uploadPrefix, defaultExt, defaultValue })

	const { useDisplaySrc } = useImageCenter()
	const displaySrc = useDisplaySrc(base.raw)
	const isLoaded = ref(false)

	watch(displaySrc, () => {
		isLoaded.value = false
	})

	return { ...base, displaySrc, isLoaded }
}
