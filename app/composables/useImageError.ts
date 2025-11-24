/**
 * 圖片錯誤處理 composable
 * 提供統一的圖片載入錯誤處理機制
 */
export const useImageError = () => {
	/**
	 * 處理圖片載入錯誤
	 * @param event - 錯誤事件
	 * @param fallbackSrc - 備用圖片路徑（可選）
	 */
	const handleImageError = (event: Event, fallbackSrc?: string) => {
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
	const getErrorHandler = (fallbackSrc?: string) => {
		return (event: Event) => handleImageError(event, fallbackSrc);
	};

	return {
		handleImageError,
		getErrorHandler
	};
};

