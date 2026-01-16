import { ref, onBeforeUnmount, type Ref } from "vue";

/**
 * 通用資料載入 composable
 * 提供防抖、請求去重、分頁重置、載入狀態與錯誤處理等功能
 */
export interface UseDataLoaderOptions<T, P extends Record<string, unknown>> {
  /** 真正呼叫後端 API 的函式 */
  fetcher: (params: P) => Promise<{ items: T[]; total?: number }>;
  /** 防抖延遲 (ms)，預設 300 */
  debounce?: number;
  /** 每頁筆數，預設 20 */
  pageSize?: number;
  /** 最小載入延遲時間（ms），防止畫面閃爍，預設 0 */
  minLoadingDelay?: number;
  /** 載入時是否清空數據，預設 false */
  clearOnLoad?: boolean;
  /** 自訂錯誤處理 */
  onError?: (err: unknown) => void;
}

export const useDataLoader = <T, P extends Record<string, unknown>>(
  options: UseDataLoaderOptions<T, P>
) => {
  const {
    fetcher,
    debounce = 300,
    pageSize = 20,
    minLoadingDelay = 0,
    clearOnLoad = false,
    onError
  } = options;

  const data: Ref<T[]> = ref([]) as Ref<T[]>;
  const total = ref(0);
  const offset = ref(0);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  // 內部請求去重旗標
  let isRequesting = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const internalLoad = async (params: P) => {
    if (isRequesting) return;
    isRequesting = true;
    isLoading.value = true;
    errorMessage.value = null;

    // 如果設置了載入時清空數據
    if (clearOnLoad) {
      data.value = [];
    }

    const startTime = Date.now();

    try {
      const { items, total: t } = await fetcher({ ...params, limit: pageSize, offset: offset.value } as P);
      
      // 計算已用時間，確保至少顯示最小延遲時間以緩和閃爍
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, minLoadingDelay - elapsed);

      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

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

  // 組件卸載時清理定時器
  onBeforeUnmount(() => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });

  return {
    data,
    total,
    offset,
    isLoading,
    errorMessage,
    load,
    nextPage,
    prevPage,
    resetPage
  };
};
