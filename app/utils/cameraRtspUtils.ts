/** 設備型號未設定樣板時的預設 RTSP 樣板 */
export const DEFAULT_CAMERA_RTSP_TEMPLATE =
	"rtsp://{username}:{password}@{ip}:554/Streaming/channels/101";

/** RTSP 預設埠（區網／未填 NAT 對外埠時） */
export const DEFAULT_CAMERA_RTSP_PORT = 554;

/** 設備表單共用：僅允許 IPv4（含公網固定 IP；不含 hostname／DDNS） */
export const DEVICE_IPV4_HOST_PATTERN = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$";

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

/** 正規化埠：有效則回傳整數，否則預設 554 */
export const normalizeCameraRtspPort = (port?: number | null): number => {
	const n = Number(port);
	if (!Number.isFinite(n) || n < 1 || n > 65535) return DEFAULT_CAMERA_RTSP_PORT;
	return Math.floor(n);
};

/**
 * 將 `@host` 或 `@host:舊埠` 正規成 `@host:port`（authority 在 path／query 之前）
 */
const applyRtspAuthorityPort = (url: string, host: string, port: number): string => {
	const safeHost = String(host || "").trim();
	if (!safeHost) return url;
	const portNum = normalizeCameraRtspPort(port);
	return String(url || "").replace(
		/@([^/@?]+)(?=[:/?]|$)/,
		(_m, authority: string) => {
			const withoutPort = String(authority).replace(/:\d+$/, "");
			const hostPart = withoutPort || safeHost;
			return `@${hostPart}:${portNum}`;
		}
	);
};

/** 補預設 :554（若缺埠）並套用 stream1 / stream2；實際埠由 build／preview 覆寫 */
export const resolveTpLinkRtspTemplate = (
	template: string,
	stream: TpLinkStreamPath
): string => {
	let s = String(template || "").trim();
	if (!isTpLinkStyleTemplate(s)) return s;
	s = s.replace(/@([^/?]+?)(\/stream[12])/i, (_: string, host: string, path: string) =>
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
		port: number;
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
	s = applyRtspAuthorityPort(s, opts.ipForBraces, opts.port);
	return s;
};

/** 組出要送出的 rtsp_url（userinfo 經 encodeURIComponent；port 預設 554） */
export const buildCameraRtspUrl = (
	template: string,
	ip: string,
	username: string,
	password: string,
	channel?: number | null,
	port?: number | null
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
			encodeCredentials: true,
			port: normalizeCameraRtspPort(port),
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
	channel?: number | null,
	port?: number | null
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
			encodeCredentials: false,
			port: normalizeCameraRtspPort(port),
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

/** 從 rtsp_url 解析 host／埠／帳密（供編輯表單回填；無埠則 554） */
export const parseCameraRtspUrl = (
	rtsp: string
): { host: string; port: number; user: string; password: string } => {
	const creds =
		/^rtsp:\/\/(?<user>[^:]+):(?<pwd>[^@]+)@(?<host>[^/:]+)(?::(?<port>\d+))?/i.exec(
			rtsp
		);
	if (creds?.groups) {
		const g = creds.groups as {
			user: string;
			pwd: string;
			host: string;
			port?: string;
		};
		return {
			host: g.host,
			port: normalizeCameraRtspPort(g.port ? Number(g.port) : null),
			user: tryDecode(g.user),
			password: tryDecode(g.pwd),
		};
	}
	const hostOnly =
		/^rtsp:\/\/(?<host>[^/:]+)(?::(?<port>\d+))?\/?/i.exec(rtsp);
	if (hostOnly?.groups) {
		const g = hostOnly.groups as { host: string; port?: string };
		return {
			host: g.host,
			port: normalizeCameraRtspPort(g.port ? Number(g.port) : null),
			user: "",
			password: "",
		};
	}
	return { host: "", port: DEFAULT_CAMERA_RTSP_PORT, user: "", password: "" };
};

/** 列表／卡片顯示：非預設埠時顯示 host:port */
export const formatCameraHostPort = (
	host: string | undefined | null,
	port?: number | null
): string => {
	const h = String(host || "").trim();
	if (!h) return "";
	const p = normalizeCameraRtspPort(port);
	if (p === DEFAULT_CAMERA_RTSP_PORT) return h;
	return `${h}:${p}`;
};

/** 非攝影機設備列表：有 port 時一律顯示 host:port */
export const formatDeviceHostPort = (
	host: string | undefined | null,
	port?: number | null
): string => {
	const h = String(host || "").trim();
	if (!h) return "";
	if (port != null && Number(port) > 0) return `${h}:${Number(port)}`;
	return h;
};
