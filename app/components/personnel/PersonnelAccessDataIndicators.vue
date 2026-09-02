<template>
	<div
		class="flex flex-wrap items-center justify-center gap-1.5"
		role="group"
		aria-label="平台資料"
	>
		<button
			v-for="item in items"
			:key="item.key"
			type="button"
			class="inline-flex h-8 w-8 items-center justify-center rounded-md border 2xl:h-9 2xl:w-9"
			:class="pillClass(item.active, item.key)"
			:title="item.label"
			:aria-label="item.label"
			:disabled="!item.tabKey || !onIconClick"
			@click="handleIconClick(item)"
		>
			<svg
				class="shrink-0"
				:class="item.iconClass"
				:viewBox="item.viewBox"
				fill="none"
				aria-hidden="true"
			>
				<path v-bind="item.path" />
			</svg>
		</button>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { PERSONNEL_PLATFORM_ICONS } from "~/utils/syncCredentialIcons"

export type PersonnelAccessDataTabKey =
	| "password"
	| "card"
	| "fingerprint"
	| "licensePlate"

const props = defineProps<{
	summary: {
		hasPassword: boolean
		hasCard: boolean
		hasFingerprint: boolean
		hasLicensePlate: boolean
	}
	onIconClick?: (tabKey: PersonnelAccessDataTabKey) => void
}>()

const items = computed(() => {
	const s = props.summary
	return [
		{
			key: "password",
			tabKey: "password" as const,
			active: s.hasPassword,
			label: s.hasPassword ? "有設定門禁密碼" : "未設定門禁密碼",
			...PERSONNEL_PLATFORM_ICONS.password,
		},
		{
			key: "card",
			tabKey: "card" as const,
			active: s.hasCard,
			label: s.hasCard ? "有設定卡號" : "未設定卡號",
			...PERSONNEL_PLATFORM_ICONS.card,
		},
		{
			key: "fingerprint",
			tabKey: "fingerprint" as const,
			active: s.hasFingerprint,
			label: s.hasFingerprint ? "有指紋模板" : "未設定指紋模板",
			...PERSONNEL_PLATFORM_ICONS.fingerprint,
		},
		{
			key: "licensePlate",
			tabKey: "licensePlate" as const,
			active: s.hasLicensePlate,
			label: s.hasLicensePlate ? "有設定車牌" : "未設定車牌",
			...PERSONNEL_PLATFORM_ICONS.licensePlate,
		},
	]
})

const handleIconClick = (item: { tabKey?: PersonnelAccessDataTabKey }) => {
	if (!item.tabKey || !props.onIconClick) return
	props.onIconClick(item.tabKey)
}

const pillClass = (active: boolean, key: string) => {
	const interactive = props.onIconClick
		? "cursor-pointer transition-colors enabled:hover:border-cyan-400/40 enabled:hover:bg-cyan-500/10"
		: ""
	return [
		interactive,
		active
			? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
			: key === "fingerprint"
				? "border-white/15 bg-white/5 text-white"
				: "border-white/15 bg-white/5 text-white/55",
	]
}
</script>
