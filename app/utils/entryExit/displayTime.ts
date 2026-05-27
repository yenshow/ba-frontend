export const shouldHideExitTime = (
	entryTime?: string | null,
	exitTime?: string | null
): boolean => {
	const parseTimeToSeconds = (time?: string | null) => {
		if (!time) return null;
		const m = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
		if (!m) return null;
		const hh = Number(m[1]);
		const mm = Number(m[2]);
		const ss = m[3] ? Number(m[3]) : 0;
		if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null;
		return hh * 3600 + mm * 60 + ss;
	};

	const entrySec = parseTimeToSeconds(entryTime);
	const exitSec = parseTimeToSeconds(exitTime);
	if (entrySec == null || exitSec == null) return false;
	return entrySec > exitSec;
};

