/** 設備型號未設定樣板時的預設 RTSP 樣板 */
export const DEFAULT_CAMERA_RTSP_TEMPLATE =
	"rtsp://{username}:{password}@{ip}:554/Streaming/channels/101";

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
	password: string
): string => {
	const safeIp = ip.trim();
	const safeUser = username.trim() || "admin";
	const safePwd = password.trim();
	if (!safeIp || !safePwd) return "";

	return applyRtspTemplate(template, {
		ipForBraces: safeIp,
		legacyHostIp: safeIp,
		user: safeUser,
		password: safePwd,
		encodeCredentials: true
	});
};

/** 表單預覽：未填 IP／密碼時保留 ip、密碼佔位 */
export const previewCameraRtspTemplate = (
	template: string,
	ip: string,
	username: string,
	password: string
): string => {
	const safeIp = ip.trim();
	const safeUser = username.trim() || "admin";
	const safePwd = password.trim();
	const ipDisp = safeIp || "ip";
	const pwdDisp = safePwd || "密碼";

	return applyRtspTemplate(template, {
		ipForBraces: ipDisp,
		legacyHostIp: safeIp || null,
		user: safeUser,
		password: pwdDisp,
		encodeCredentials: false
	});
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
