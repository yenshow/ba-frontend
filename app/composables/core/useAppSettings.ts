import { useRequestFetch } from "#app"
import { useApiBase } from "~/composables/core/useApiBase"
import { useToast } from "~/composables/core/useToast"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { useImageCenter } from "~/composables/core/useImageCenter"
import { createSafeFileName } from "~/utils/fileUtils"

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

export type UseAppSettingImageOptions = {
	key: string
	uploadPrefix: string
	defaultExt?: string
	defaultValue?: string
}

type SettingRow = { value: string | null } | null

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
			const row = response?.setting
			if (row == null || row.value == null || !String(row.value).trim()) {
				value.value = defaultValue
			} else {
				value.value = String(row.value).trim()
			}
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
				body: JSON.stringify({ value: normalized }),
			})
			value.value = normalized
			showToast("success", "設定已儲存")
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

			// useApiBase 的 request 會 JSON stringify；這裡改用 fetch + FormData
			const config = useRuntimeConfig()
			const apiBase = String(config.public.apiBase || "/api")
			const fetcher = useRequestFetch()
			const token = useCookie("auth_token").value

			const headers: HeadersInit = { Accept: "application/json" }
			if (token) headers.Authorization = `Bearer ${token}`

			const response = await fetcher<{
				success: boolean
				data?: { setting?: { value?: string } }
				setting?: { value?: string }
			}>(`${apiBase}/settings/upload`, {
				method: "POST",
				headers,
				body: formData,
				credentials: "include",
			})

			const settingValue =
				(response as any)?.data?.setting?.value || (response as any)?.setting?.value
			if (settingValue) {
				value.value = settingValue
				showToast("success", "檔案上傳成功")
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
			showToast("success", "設定已重設為預設值")
			return
		}

		isLoading.value = true
		try {
			await request(`/settings/${key}`, { method: "DELETE" })
			value.value = defaultValue
			showToast("success", "設定已重設為預設值")
		} catch (error: unknown) {
			const err = error as { statusCode?: number; status?: number }
			if (err?.statusCode === 404 || err?.status === 404) {
				value.value = defaultValue
				showToast("success", "設定已重設為預設值")
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

/** 單一 system_settings 圖片欄位：解析 URL、上傳、編輯對話框狀態 */
export const useAppSettingImage = (options: UseAppSettingImageOptions) => {
	const { key, uploadPrefix, defaultExt = "jpg", defaultValue = "" } = options

	const { value: raw, save, reset, uploadFile } = useAppSettings({ key, defaultValue })

	const { useDisplaySrc } = useImageCenter()
	const displaySrc = useDisplaySrc(raw)

	const isEditOpen = ref(false)
	const isLoaded = ref(false)

	watch(displaySrc, () => {
		isLoaded.value = false
	})

	const handleUpload = async (file: File) => {
		await uploadFile(createSafeFileName(uploadPrefix, file, defaultExt))
		isEditOpen.value = false
	}

	return {
		raw,
		displaySrc,
		save,
		reset,
		isEditOpen,
		isLoaded,
		handleUpload,
	}
}
