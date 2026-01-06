import { ref, watch, type Ref } from "vue";

/**
 * 通用資料載入 composable
 * 提供防抖、請求去重、分頁重置、載入狀態與錯誤處理等功能
 */
export interface UseDataLoaderOptions<P extends Record<string, unknown>> {
  /** 真正呼叫後端 API 的函式 */
  fetcher: (params: P) => Promise<{ items: unknown[]; total?: number }>;
  /** 防抖延遲 (ms)，預設 300 */
  debounce?: number;
  /** 每頁筆數，預設 20 */
  pageSize?: number;
  /** 自訂錯誤處理 */
  onError?: (err: unknown) => void;
}

export const useDataLoader = <P extends Record<string, unknown>>(
  options: UseDataLoaderOptions<P>
) => {
  const {
    fetcher,
    debounce = 300,
    pageSize = 20,
    onError
  } = options;

  const data: Ref<unknown[]> = ref([]);
  const total = ref(0);
  const offset = ref(0);
  const isLoading = ref(false);

  // 內部請求去重旗標
  let isRequesting = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const internalLoad = async (params: P) => {
    if (isRequesting) return;
    isRequesting = true;
    isLoading.value = true;
    try {
      const { items, total: t } = await fetcher({ ...params, limit: pageSize, offset: offset.value } as P);
      data.value = items;
      if (typeof t === "number") total.value = t;
    } catch (err) {
      onError?.(err);
    } finally {
      isLoading.value = false;
      isRequesting = false;
    }
  };

  const load = (params: P, immediate = false) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (immediate) {
      void internalLoad(params);
    } else {
      timer = setTimeout(() => void internalLoad(params), debounce);
    }
  };

  const resetPage = () => {
    offset.value = 0;
  };

  const nextPage = (params: P) => {
    if (offset.value + pageSize < total.value) {
      offset.value += pageSize;
      void internalLoad(params);
    }
  };

  const prevPage = (params: P) => {
    if (offset.value > 0) {
      offset.value = Math.max(0, offset.value - pageSize);
      void internalLoad(params);
    }
  };

  return {
    data,
    total,
    offset,
    isLoading,
    load,
    nextPage,
    prevPage,
    resetPage
  };
};
