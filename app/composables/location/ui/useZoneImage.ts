import { useZoneValidation } from "~/composables/location/validation/useBaseValidation"
import { MAX_ZONE_IMAGE_BYTES, ZONE_IMAGE_ACCEPT_TYPES } from "~/composables/location/validation/useBaseValidation"

export function useZoneImageUpload(options: {
	onImageReady: (base64ImageUrl: string) => void
	onError?: (message: string) => void
}) {
	const fileInputRef = ref<HTMLInputElement | null>(null)
	const { validateZoneImage } = useZoneValidation()

	const triggerImageInput = () => {
		fileInputRef.value?.click()
	}

	const setError = (message: string) => {
		if (options.onError) options.onError(message)
	}

	const processZoneImageFile = (file: File) => {
		if (!ZONE_IMAGE_ACCEPT_TYPES.includes(file.type as (typeof ZONE_IMAGE_ACCEPT_TYPES)[number])) {
			setError("不支援的檔案格式，請上傳 PNG、JPG、GIF 或 WEBP 格式的圖片")
			return
		}

		if (file.size > MAX_ZONE_IMAGE_BYTES) {
			setError("檔案大小超過 10MB，請選擇較小的圖片")
			return
		}

		const reader = new FileReader()
		reader.onload = (e) => {
			const result = e.target?.result as string
			if (!result) {
				setError("讀取檔案失敗，請稍後再試")
				return
			}

			const validateError = validateZoneImage(result)
			if (validateError) {
				setError(validateError)
				return
			}

			options.onImageReady(result)
		}
		reader.onerror = () => {
			setError("讀取檔案失敗，請稍後再試")
		}
		reader.readAsDataURL(file)
	}

	const handleZoneImageChange = (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target.files?.[0]) return
		processZoneImageFile(target.files[0])
		target.value = ""
	}

	return {
		fileInputRef,
		triggerImageInput,
		handleZoneImageChange,
		processZoneImageFile,
	}
}
