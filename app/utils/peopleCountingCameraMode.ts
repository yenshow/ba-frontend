export type PeopleCountingCameraMode = "people_counting" | "face_recognition";

export const PEOPLE_COUNTING_CAMERA_MODE = {
	PEOPLE_COUNTING: "people_counting",
	FACE_RECOGNITION: "face_recognition"
} as const satisfies Record<string, PeopleCountingCameraMode>;

export const PEOPLE_COUNTING_CAMERA_MODE_LABELS: Record<PeopleCountingCameraMode, string> = {
	people_counting: "人流統計",
	face_recognition: "人臉辨識"
};

export const normalizePeopleCountingCameraMode = (
	raw: unknown
): PeopleCountingCameraMode => {
	const s = String(raw ?? "").trim();
	if (s === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION) {
		return PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION;
	}
	return PEOPLE_COUNTING_CAMERA_MODE.PEOPLE_COUNTING;
};

export const isFaceRecognitionCameraMode = (raw: unknown): boolean =>
	normalizePeopleCountingCameraMode(raw) === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION;
