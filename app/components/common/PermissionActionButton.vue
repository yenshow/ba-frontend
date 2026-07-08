<template>

	<button

		v-if="allowed"

		:type="nativeType"

		:disabled="disabled"

		v-bind="passthroughAttrs"

		:class="['disabled:cursor-not-allowed disabled:opacity-60', attrs.class]"

		@click="emit('click')"

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



const emit = defineEmits<{ click: [] }>()

const attrs = useAttrs()



const passthroughAttrs = computed(() => {

	const { class: _class, onClick: _onClick, ...rest } = attrs

	return rest

})

</script>

