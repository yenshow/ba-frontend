<template>
	<button
		v-if="allowed"
		:type="nativeType"
		:disabled="disabled"
		v-bind="passthroughAttrs"
		:class="['disabled:cursor-not-allowed disabled:opacity-60', attrs.class]"
	>
		<slot />
	</button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from "vue"

defineOptions({ inheritAttrs: false })

withDefaults(
	defineProps<{
		/** 具備操作權限時才渲染；無權限則不顯示 */
		allowed: boolean
		/** 有權限但暫時不可操作（例如儲存中） */
		disabled?: boolean
		nativeType?: "button" | "submit"
	}>(),
	{ nativeType: "button", disabled: false },
)

/**
 * 不 declare `click` emit：讓父層 `@click` 以原生 listener（attrs.onClick）綁到 button。
 * 如此 `@click="flag = true"` 與 `@click="openXxx"` 皆可正常運作。
 */
const attrs = useAttrs()

const passthroughAttrs = computed(() => {
	const { class: _class, ...rest } = attrs
	return rest
})
</script>
