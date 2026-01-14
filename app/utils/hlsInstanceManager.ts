import type Hls from "hls.js";

/**
 * HLS 實例條目
 */
interface HlsInstanceEntry {
	instance: Hls;
	refCount: number;
	videoElements: Set<HTMLVideoElement>;
}

/**
 * 全局 HLS 實例管理器
 * 相同 HLS URL 的播放器共享一個 HLS 實例，減少資源浪費
 */
class HlsInstanceManager {
	private instances = new Map<string, HlsInstanceEntry>();

	/**
	 * 獲取或創建 HLS 實例
	 * 注意：由於使用了 uniqueUrl（帶 instance 參數），每次啟動都會創建新實例
	 * 這樣可以確保從最新時間點開始播放，不會重用舊緩存
	 */
	getOrCreateInstance(
		hlsUrl: string,
		HlsClass: typeof Hls,
		config: any,
		videoElement: HTMLVideoElement
	): Hls {
		const entry = this.instances.get(hlsUrl);

		if (entry) {
			// 如果已存在（理論上不會發生，因為 uniqueUrl 每次都不同）
			// 但仍然處理這種情況
			entry.refCount++;
			entry.videoElements.add(videoElement);
			if (process.env.NODE_ENV === "development") {
				console.log(`[HLS Manager] 重用 HLS 實例，URL: ${hlsUrl.substring(0, 80)}..., 引用計數: ${entry.refCount}`);
			}
			return entry.instance;
		}

		// 創建新實例（正常情況）
		const hls = new HlsClass(config);
		// 注意：這裡不立即 loadSource，由調用者決定何時載入
		// 因為調用者會使用帶緩存破壞參數的 URL
		hls.attachMedia(videoElement);

		this.instances.set(hlsUrl, {
			instance: hls,
			refCount: 1,
			videoElements: new Set([videoElement])
		});

		if (process.env.NODE_ENV === "development") {
			console.log(`[HLS Manager] 創建新 HLS 實例，URL: ${hlsUrl.substring(0, 80)}...`);
		}
		return hls;
	}

	/**
	 * 釋放 HLS 實例引用
	 */
	releaseInstance(hlsUrl: string, videoElement: HTMLVideoElement): void {
		const entry = this.instances.get(hlsUrl);
		if (!entry) {
			console.warn(`[HLS Manager] 嘗試釋放不存在的實例，URL: ${hlsUrl}`);
			return;
		}

		// 移除 video 元素
		entry.videoElements.delete(videoElement);

		// 減少引用計數
		entry.refCount--;

		console.log(`[HLS Manager] 釋放 HLS 實例引用，URL: ${hlsUrl}, 引用計數: ${entry.refCount}`);

		// 如果引用計數為 0，銷毀實例
		if (entry.refCount === 0) {
			try {
				entry.instance.destroy();
				console.log(`[HLS Manager] 銷毀 HLS 實例，URL: ${hlsUrl}`);
			} catch (error) {
				console.error(`[HLS Manager] 銷毀 HLS 實例時出錯:`, error);
			}
			this.instances.delete(hlsUrl);
		} else {
			// 如果還有其他 video 元素在使用，需要從當前 video 元素分離
			entry.instance.detachMedia();
			
			// 重新附加到下一個 video 元素（如果有的話）
			const nextVideoElement = Array.from(entry.videoElements)[0];
			if (nextVideoElement) {
				entry.instance.attachMedia(nextVideoElement);
			}
		}
	}


	/**
	 * 清理所有實例（用於測試或緊急情況）
	 * 重要：確保完全銷毀所有實例，避免重用舊緩存
	 */
	clearAll(): void {
		for (const [url, entry] of this.instances.entries()) {
			try {
				// 先分離所有 video 元素
				for (const videoElement of entry.videoElements) {
					try {
						entry.instance.detachMedia();
					} catch (err) {
						// 忽略分離錯誤
					}
				}
				// 停止加載
				entry.instance.stopLoad();
				// 銷毀實例
				entry.instance.destroy();
			} catch (error) {
				console.error(`[HLS Manager] 清理實例時出錯 (${url}):`, error);
			}
		}
		this.instances.clear();
		if (process.env.NODE_ENV === "development") {
			console.log("[HLS Manager] 已清理所有 HLS 實例");
		}
	}

	/**
	 * 清理特定 URL 的所有實例（根據原始 URL 匹配）
	 * 用於停止串流時清理相關實例
	 */
	clearInstancesByUrl(originalUrl: string): void {
		const keysToDelete: string[] = [];
		for (const [url, entry] of this.instances.entries()) {
			// 檢查 URL 是否包含原始 URL（支持帶查詢參數的 uniqueUrl）
			if (url.includes(originalUrl) || url.startsWith(originalUrl)) {
				try {
					// 先分離所有 video 元素
					for (const videoElement of entry.videoElements) {
						try {
							entry.instance.detachMedia();
						} catch (err) {
							// 忽略分離錯誤
						}
					}
					// 停止加載
					entry.instance.stopLoad();
					// 銷毀實例
					entry.instance.destroy();
					keysToDelete.push(url);
				} catch (error) {
					console.error(`[HLS Manager] 清理實例時出錯 (${url}):`, error);
				}
			}
		}
		// 刪除已清理的實例
		for (const key of keysToDelete) {
			this.instances.delete(key);
		}
		if (keysToDelete.length > 0 && process.env.NODE_ENV === "development") {
			console.log(`[HLS Manager] 已清理 ${keysToDelete.length} 個 HLS 實例 (URL: ${originalUrl})`);
		}
	}
}

// 導出單例實例
export const hlsInstanceManager = new HlsInstanceManager();

