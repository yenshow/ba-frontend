import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from "vue"

/** 監控雙欄：左欄高度 → 右欄 `--overview-aside-h`（lg+ 內捲） */
export const useMonitoringAsideHeightSync = () => {
	const detailPanelRef = ref<HTMLElement | null>(null)
	const heightPx = ref<number | null>(null)
	let observer: ResizeObserver | null = null

	const sync = () => {
		if (detailPanelRef.value) heightPx.value = detailPanelRef.value.offsetHeight
	}

	const asideHeightStyle = computed((): CSSProperties | undefined => {
		if (heightPx.value == null) return undefined
		return { "--overview-aside-h": `${heightPx.value}px` } as CSSProperties
	})

	onMounted(() => {
		sync()
		if (typeof ResizeObserver === "undefined" || !detailPanelRef.value) return
		observer = new ResizeObserver(sync)
		observer.observe(detailPanelRef.value)
	})

	onBeforeUnmount(() => {
		observer?.disconnect()
		observer = null
	})

	return { detailPanelRef, asideHeightStyle }
}
