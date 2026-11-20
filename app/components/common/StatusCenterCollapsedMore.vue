<template>
	<!-- 固定槽寬：有無圖示都佔同寬，避免擠壓地點卡導致跨區對不齊 -->
	<div
		class="flex w-5 shrink-0 flex-col items-center justify-center self-center 2xl:w-6"
		:class="show ? 'text-white/55' : 'invisible'"
		role="presentation"
		:aria-hidden="show ? undefined : 'true'"
		:aria-label="show ? ariaLabel : undefined"
		:title="show ? '選取區域後展開' : undefined"
	>
		<svg
			class="h-5 w-5 2xl:h-6 2xl:w-6"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M10 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM10 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
			/>
		</svg>
		<svg
			class="-mt-0.5 h-3.5 w-3.5 opacity-80 2xl:h-4 2xl:w-4"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				fill-rule="evenodd"
				d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
				clip-rule="evenodd"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		/** 是否顯示「尚有未展開」圖示（槽寬仍固定保留） */
		show?: boolean
		/** 無障礙用；畫面不顯示文字 */
		ariaLabel?: string
	}>(),
	{
		show: false,
		ariaLabel: "還有未展開的地點，選取區域後展開",
	}
)
</script>
