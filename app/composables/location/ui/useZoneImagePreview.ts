/**
 * 在新視窗中預覽區域示意圖（base64 / http(s) URL 皆適用）
 */
export const openZoneSchematicPreview = (imageUrl: string) => {
	if (!imageUrl) return
	const newWindow = window.open()
	if (!newWindow) return
	newWindow.document.write(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>區域示意圖</title>
					<style>
						body {
							margin: 0;
							padding: 20px;
							background: #1a1a1a;
							display: flex;
							justify-content: center;
							align-items: center;
							min-height: 100vh;
						}
						img {
							max-width: 100%;
							max-height: 100vh;
							object-fit: contain;
						}
					</style>
				</head>
				<body>
					<img src="${imageUrl}" alt="區域示意圖" />
				</body>
			</html>
		`)
	newWindow.document.close()
}
