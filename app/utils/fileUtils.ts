/**
 * 檔案相關工具函數
 */

/**
 * 產生安全的檔名並建立新 File 物件
 * 用於避免後端處理中文或特殊字符檔名時的編碼問題（Mojibake）
 *
 * @param prefix - 檔名前綴，例如 "home-video"、"project-header"
 * @param file - 原始檔案
 * @param defaultExt - 無副檔名時的預設延伸名
 */
export const createSafeFileName = (
	prefix: string,
	file: File,
	defaultExt: string
): File => {
	const ext = file.name.split(".").pop() || defaultExt;
	const now = new Date();
	const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
	const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
	const newFileName = `${prefix}-${timestamp}-${random}.${ext}`;
	return new File([file], newFileName, { type: file.type });
};
