/** 人臉比對準確度下限（0–100，與後端 DEFAULT_FACE_SIMILARITY_THRESHOLD 一致） */
export const DEFAULT_FACE_SIMILARITY_THRESHOLD = 50

export const normalizeFaceSimilarityThreshold = (raw: unknown): number => {
	if (raw == null || raw === "") return DEFAULT_FACE_SIMILARITY_THRESHOLD
	const n = Number(raw)
	if (!Number.isFinite(n)) return DEFAULT_FACE_SIMILARITY_THRESHOLD
	return Math.min(100, Math.max(0, Math.trunc(n)))
}
