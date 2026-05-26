import { ref, watch, computed, type MaybeRefOrGetter, toValue } from "vue";
import { resolveDirectDisplayUrl, resolveDisplayUrl } from "~/utils/imageCenter";
import { convertBase64ToImageUrl } from "~/utils/imageUtils";
import { useExternalDataApi } from "~/composables/systems/externalData/useExternalDataApi";

type PicUri = string;
type MediaId = string | number;

const picUriCache = new Map<PicUri, string>();
const inFlight = new Map<PicUri, Promise<string>>();

const fetchOnePicUri = async (
	picUri: string,
	getPictureByUri: ReturnType<typeof useExternalDataApi>["getPictureByUri"]
): Promise<string> => {
	const v = String(picUri || "").trim();
	if (!v) return "";

	const cached = picUriCache.get(v);
	if (cached) return cached;

	const running = inFlight.get(v);
	if (running) return running;

	const job = (async () => {
		try {
			const res = await getPictureByUri(v);
			const img = res?.data?.image ? convertBase64ToImageUrl(res.data.image) : "";
			if (img) picUriCache.set(v, img);
			return img;
		} catch {
			return "";
		} finally {
			inFlight.delete(v);
		}
	})();

	inFlight.set(v, job);
	return job;
};

const fetchPicUris = async (
	picUris: string[],
	api: Pick<ReturnType<typeof useExternalDataApi>, "getBatchPicturesByUri" | "getPictureByUri">
): Promise<Map<PicUri, string>> => {
	const result = new Map<PicUri, string>();
	const unique = Array.from(new Set(picUris.map((p) => String(p || "").trim()).filter(Boolean)));

	const toFetch: PicUri[] = [];
	for (const picUri of unique) {
		const cached = picUriCache.get(picUri);
		if (cached) {
			result.set(picUri, cached);
			continue;
		}
		toFetch.push(picUri);
	}

	if (toFetch.length === 0) return result;

	try {
		const res = await api.getBatchPicturesByUri(toFetch);
		for (const row of res?.data?.results ?? []) {
			if (!row?.picUri || !row.success || !row.image) continue;
			const url = convertBase64ToImageUrl(row.image);
			picUriCache.set(row.picUri, url);
			result.set(row.picUri, url);
		}
	} catch {
		// 批次失敗時改由單筆補齊
	}

	const missing = toFetch.filter((p) => !result.has(p));
	if (missing.length > 0) {
		await Promise.allSettled(
			missing.map(async (picUri) => {
				const url = await fetchOnePicUri(picUri, api.getPictureByUri);
				if (url) result.set(picUri, url);
			})
		);
	}

	return result;
};

export const useImageCenter = () => {
	const apiBase = String(useRuntimeConfig().public.apiBase || "");
	const externalDataApi = useExternalDataApi();

	const resolveUrl = (raw: string | null | undefined): string => resolveDisplayUrl(raw, apiBase);

	const resolveDirectUrl = (raw: string | null | undefined): string | null =>
		resolveDirectDisplayUrl(raw, apiBase);

	const resolvePicUris = (picUris: string[]) => fetchPicUris(picUris, externalDataApi);

	const useDisplaySrc = (source: MaybeRefOrGetter<string | null | undefined>) =>
		computed(() => resolveUrl(toValue(source) ?? ""));

	const openPreviewWindow = (raw: string | null | undefined, title = "圖片預覽") => {
		const src = resolveUrl(raw);
		if (!src) return;
		const win = window.open();
		if (!win) return;
		win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>body{margin:0;padding:20px;background:#1a1a1a;display:flex;justify-content:center;align-items:center;min-height:100vh}
img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>
<body><img src="${src}" alt="${title}"/></body></html>`);
		win.document.close();
	};

	return { resolveUrl, resolveDirectUrl, resolvePicUris, useDisplaySrc, openPreviewWindow };
};

/** 列表/表格批次載入媒體 URL（人流截圖、車牌圖等） */
export const useResolvedMediaList = <T>(
	items: MaybeRefOrGetter<T[]>,
	options: {
		getRaw: (item: T) => string | null | undefined;
		getId: (item: T) => MediaId;
	}
) => {
	const { resolveDirectUrl, resolvePicUris } = useImageCenter();

	const urls = ref<Record<MediaId, string>>({});
	const loading = ref<Record<MediaId, boolean>>({});
	const errors = ref<Record<MediaId, boolean>>({});

	const markError = (id: MediaId) => {
		errors.value[id] = true;
		delete urls.value[id];
	};

	const onImageError = (_event: Event, id: MediaId) => markError(id);

	const loadAll = async () => {
		const list = toValue(items) ?? [];
		const toLoad = list.filter(
			(item) =>
				Boolean(String(options.getRaw(item) || "").trim()) &&
				!urls.value[options.getId(item)] &&
				!loading.value[options.getId(item)]
		);
		if (toLoad.length === 0) return;

		const picUris: string[] = [];
		const idByPicUri = new Map<string, MediaId>();

		for (const item of toLoad) {
			const raw = String(options.getRaw(item) || "").trim();
			const id = options.getId(item);
			const direct = resolveDirectUrl(raw);
			if (direct) {
				urls.value[id] = direct;
				continue;
			}
			picUris.push(raw);
			idByPicUri.set(raw, id);
		}

		if (picUris.length === 0) return;

		for (const id of idByPicUri.values()) {
			loading.value[id] = true;
			errors.value[id] = false;
		}

		try {
			const resolved = await resolvePicUris(picUris);
			for (const [picUri, id] of idByPicUri.entries()) {
				const url = resolved.get(picUri);
				if (url) urls.value[id] = url;
			}
		} catch {
			for (const id of idByPicUri.values()) errors.value[id] = true;
		} finally {
			for (const id of idByPicUri.values()) loading.value[id] = false;
		}
	};

	watch(() => toValue(items), loadAll, { immediate: true, deep: true });

	return { urls, loading, errors, markError, onImageError, reload: loadAll };
};
