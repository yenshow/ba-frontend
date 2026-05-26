/**
 * 圖片工具（base64、錯誤處理、File 轉換）
 * 顯示 URL 與批次取圖請用 ~/composables/core/useImageCenter
 */

/**
 * 處理圖片載入錯誤
 * @param event - 錯誤事件
 * @param fallbackSrc - 備用圖片路徑（可選）
 */
export const handleImageError = (event: Event, fallbackSrc?: string) => {
	const img = event.target as HTMLImageElement;
	
	// 如果已經嘗試過備用圖片，則顯示預設佔位符
	if (img.dataset.fallbackAttempted === "true") {
		img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E圖片載入失敗%3C/text%3E%3C/svg%3E";
		img.alt = "圖片載入失敗";
		return;
	}

	// 如果有備用圖片，嘗試載入
	if (fallbackSrc) {
		img.dataset.fallbackAttempted = "true";
		img.src = fallbackSrc;
		return;
	}

	// 沒有備用圖片，顯示預設佔位符
	img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e5e7eb' width='200' height='200'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E圖片載入失敗%3C/text%3E%3C/svg%3E";
	img.alt = "圖片載入失敗";
};

/**
 * 獲取圖片載入錯誤處理函數
 * @param fallbackSrc - 備用圖片路徑（可選）
 */
export const getImageErrorHandler = (fallbackSrc?: string) => {
	return (event: Event) => handleImageError(event, fallbackSrc);
};

/**
 * 將 Base64 編碼的圖片數據轉換為可用的圖片 URL
 * @param base64Data - Base64 編碼的圖片數據（可能包含 data:image 前綴）
 * @returns 可用的圖片 URL（data URL）
 */
export const convertBase64ToImageUrl = (base64Data: string): string => {
	if (!base64Data) return "";

	// 如果已經是完整的 data URL，直接返回
	if (base64Data.startsWith("data:image/")) return base64Data;

	// 判斷圖片格式並添加 data URL 前綴
	const mimeType = base64Data.startsWith("/9j/") 
		? "image/jpeg" 
		: base64Data.startsWith("iVBORw0KGgo") 
			? "image/png" 
			: "image/jpeg"; // 預設為 JPEG（YSCP API 返回的是 JPEG）

	return `data:${mimeType};base64,${base64Data}`;
};

const normalizeImageMimeType = (raw: string | null | undefined): string => {
	const v = String(raw || "")
		.split(";")[0]
		.trim()
		.toLowerCase();
	if (v.startsWith("image/")) return v;
	return "image/jpeg";
};

export const base64ToFile = (options: {
	base64: string;
	filename?: string;
	mimeType?: string | null;
}): File => {
	const mimeType = normalizeImageMimeType(options.mimeType);
	const base64 = options.base64 || "";
	const binaryStr = atob(base64);
	const bytes = new Uint8Array(binaryStr.length);
	for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
	const blob = new Blob([bytes], { type: mimeType });
	const ext = mimeType.includes("png") ? "png" : "jpg";
	const filename = options.filename || `image_${Date.now()}.${ext}`;
	return new File([blob], filename, { type: blob.type || "image/jpeg" });
};

