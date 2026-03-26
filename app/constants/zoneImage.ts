/** 區域示意圖：允許的 MIME 類型（上傳與 base64 驗證共用） */
export const ZONE_IMAGE_ACCEPT_TYPES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/gif",
	"image/webp",
] as const

export const ZONE_IMAGE_ACCEPT_ATTR = ZONE_IMAGE_ACCEPT_TYPES.join(",")

/** 區域示意圖大小上限（位元組） */
export const MAX_ZONE_IMAGE_BYTES = 10 * 1024 * 1024

