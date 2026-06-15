import type { FeatureKey, LicenseState } from "~/types/license";
import { useAuth } from "~/composables/core/useAuth";
import { useApiBase } from "~/composables/core/useApiBase";

const DEFAULT_LICENSE: LicenseState = {
	features: [],
	expiresAt: null,
	expired: false,
	canActivate: false,
	quotas: {},
	usage: {},
	serialNumber: null,
	licenseKey: null,
	activationMethod: null,
	deviceFingerprint: null,
	extensionKeys: [],
	licenseEntitlements: []
};

let licenseFetchInFlight: Promise<LicenseState> | null = null;

export const useLicense = () => {
	const { isAuthenticated } = useAuth();
	const { request } = useApiBase();

	const license = useState<LicenseState>("license_state", () => DEFAULT_LICENSE);
	const isLoading = useState<boolean>("license_is_loading", () => false);
	const lastLoadedAt = useState<number>("license_last_loaded_at", () => 0);

	const setLicense = (next: LicenseState) => {
		license.value = next;
		lastLoadedAt.value = Date.now();
	};

	const clearLicense = () => {
		license.value = DEFAULT_LICENSE;
		lastLoadedAt.value = 0;
		isLoading.value = false;
		licenseFetchInFlight = null;
	};

	const isOpenAll = () =>
		(useRuntimeConfig().public as { licenseOpenAllFeatures?: boolean }).licenseOpenAllFeatures ===
		true;

	const fetchLicense = async (options: { force?: boolean } = {}) => {
		if (!isAuthenticated.value) {
			clearLicense();
			return license.value;
		}
		const force = options.force === true;
		if (!force && Date.now() - lastLoadedAt.value < 15_000) return license.value;
		if (licenseFetchInFlight) return licenseFetchInFlight;

		licenseFetchInFlight = (async () => {
			isLoading.value = true;
			try {
				const res = await request<LicenseState>("/license", { method: "GET" });
				setLicense(res);
				return res;
			} finally {
				isLoading.value = false;
				licenseFetchInFlight = null;
			}
		})();

		return licenseFetchInFlight;
	};

	/** 用於鎖頭、路由守衛：openAll 時不鎖，否則依後端授權 */
	const hasFeature = (featureKey: FeatureKey) => {
		if (isOpenAll()) return true;
		if (license.value.expired) return false;
		return license.value.features.includes(featureKey);
	};

	/** 用於是否載入資料（首頁等）：一律依後端授權，不套用 openAll，避免前後端不一致 */
	const canLoadFeature = (featureKey: FeatureKey) => {
		if (license.value.expired) return false;
		return license.value.features.includes(featureKey);
	};

	const isLoaded = computed(() => lastLoadedAt.value > 0);

	return {
		license: readonly(license),
		isLoading: readonly(isLoading),
		isLoaded,
		fetchLicense,
		clearLicense,
		hasFeature,
		canLoadFeature,
	};
};
