/** 設備型號未設定樣板時的預設 RTSP 樣板 */
export const DEFAULT_CAMERA_RTSP_TEMPLATE =
	"rtsp://{username}:{password}@{ip}:554/Streaming/channels/101";

export type TpLinkStreamPath = "stream1" | "stream2";

/** 型號管理與組 URL 共用的預設樣板 */
export const CAMERA_RTSP_PRESETS = {
	hik_channels_101: DEFAULT_CAMERA_RTSP_TEMPLATE,
	stream1: "rtsp://{username}:{password}@{ip}:554/stream1",
	stream2: "rtsp://{username}:{password}@{ip}:554/stream2",
} as const;

const STREAM_IN_URL = /\/(stream[12])(?=\?|$)/i;

export const isTpLinkStyleTemplate = (template: string): boolean =>
	STREAM_IN_URL.test(String(template || "").trim());

export const detectTpLinkStreamPath = (templateOrUrl: string): TpLinkStreamPath | null => {
	const m = STREAM_IN_URL.exec(String(templateOrUrl || "").trim());
	return m ? (m[1].toLowerCase() as TpLinkStreamPath) : null;
};

/** 補 :554 並套用 stream1 / stream2 */
export const resolveTpLinkRtspTemplate = (
	template: string,
	stream: TpLinkStreamPath
): string => {
	let s = String(template || "").trim();
	if (!isTpLinkStyleTemplate(s)) return s;
	s = s.replace(/@([^/?]+?)(\/stream[12])/i, (_, host: string, path: string) =>
		/:\d+$/.test(host) ? `@${host}${path}` : `@${host}:554${path}`
	);
	return s.replace(STREAM_IN_URL, `/${stream}`);
};

export const detectRtspChannelQuery = (url: string): number | null => {
	const m = /[?&]channel=(\d+)/i.exec(String(url || ""));
	if (!m) return null;
	const n = Number(m[1]);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

const stripRtspQuery = (url: string): string => String(url || "").split("?")[0] ?? "";

const appendRtspChannelQuery = (url: string, channel: number | null | undefined): string => {
	const base = stripRtspQuery(url);
	const n = Number(channel);
	if (!Number.isFinite(n) || n <= 0) return base;
	return `${base}?channel=${Math.floor(n)}`;
};

const LEGACY_HOST_AT_IP = /@ip(?=[:/]|$)/g;

const applyRtspTemplate = (
	template: string,
	opts: {
		ipForBraces: string;
		legacyHostIp: string | null;
		user: string;
		password: string;
		encodeCredentials: boolean;
	}
): string => {
	const userPart = opts.encodeCredentials
		? encodeURIComponent(opts.user)
		: opts.user;
	const pwdPart = opts.encodeCredentials
		? encodeURIComponent(opts.password)
		: opts.password;

	let s = template
		.replaceAll("{username}", userPart)
		.replaceAll("{user}", userPart)
		.replaceAll("{password}", pwdPart)
		.replaceAll("{ip}", opts.ipForBraces)
		.replaceAll("{host}", opts.ipForBraces);

	if (opts.legacyHostIp) {
		s = s.replace(LEGACY_HOST_AT_IP, `@${opts.legacyHostIp}`);
	}
	s = s.replaceAll("密碼", pwdPart);
	s = s.replace(/^rtsp:\/\/admin:/i, `rtsp://${userPart}:`);
	return s;
};

/** 組出要送出的 rtsp_url（userinfo 經 encodeURIComponent） */
export const buildCameraRtspUrl = (
	template: string,
	ip: string,
	username: string,
	password: string,
	channel?: number | null
): string => {
	const safeIp = ip.trim();
	const safeUser = username.trim() || "admin";
	const safePwd = password.trim();
	if (!safeIp || !safePwd) return "";

	return appendRtspChannelQuery(
		applyRtspTemplate(template, {
			ipForBraces: safeIp,
			legacyHostIp: safeIp,
			user: safeUser,
			password: safePwd,
			encodeCredentials: true
		}),
		channel
	);
};

/** 表單預覽：未填 IP／密碼時保留 ip、密碼佔位 */
export const previewCameraRtspTemplate = (
	template: string,
	ip: string,
	username: string,
	password: string,
	channel?: number | null
): string => {
	const safeIp = ip.trim();
	const safeUser = username.trim() || "admin";
	const safePwd = password.trim();

	return appendRtspChannelQuery(
		applyRtspTemplate(template, {
			ipForBraces: safeIp || "ip",
			legacyHostIp: safeIp || null,
			user: safeUser,
			password: safePwd || "密碼",
			encodeCredentials: false
		}),
		channel
	);
};

const tryDecode = (value: string): string => {
	if (!value) return "";
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

/** 從 rtsp_url 解析 host／帳密（供編輯表單回填） */
export const parseCameraRtspUrl = (
	rtsp: string
): { host: string; user: string; password: string } => {
	const creds = /^rtsp:\/\/(?<user>[^:]+):(?<pwd>[^@]+)@(?<host>[^/:]+)(?::\d+)?/i.exec(rtsp);
	if (creds?.groups) {
		const g = creds.groups as { user: string; pwd: string; host: string };
		return {
			host: g.host,
			user: tryDecode(g.user),
			password: tryDecode(g.pwd)
		};
	}
	const hostOnly = /^rtsp:\/\/(?<host>[^/:]+)(?::\d+)?\/?/i.exec(rtsp);
	if (hostOnly?.groups) {
		return {
			host: (hostOnly.groups as { host: string }).host,
			user: "",
			password: ""
		};
	}
	return { host: "", user: "", password: "" };
};
