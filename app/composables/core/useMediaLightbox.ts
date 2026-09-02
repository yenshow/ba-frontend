import { ref } from "vue"

/** 表格／完整報表共用的圖片放大檢視狀態 */
export const useMediaLightbox = () => {
	const lightboxImageUrl = ref<string | null>(null)

	const openLightbox = (url: string | null | undefined) => {
		if (!url) return
		lightboxImageUrl.value = url
	}

	const closeLightbox = () => {
		lightboxImageUrl.value = null
	}

	return { lightboxImageUrl, openLightbox, closeLightbox }
}
