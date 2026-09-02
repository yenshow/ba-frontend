<template>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		<component
			:is="variant === 'group' ? 'label' : 'div'"
			v-for="person in candidates"
			:key="person.id"
			class="rounded-lg border transition-colors"
			:class="cardClass(person)"
		>
			<template v-if="variant === 'group'">
				<span class="flex min-w-0 items-center gap-2">
					<input
						type="checkbox"
						class="h-4 w-4 shrink-0 accent-cyan-400"
						:checked="isChecked(person.id)"
						:disabled="!canEdit || isDisabled"
						:aria-label="checkboxAriaLabel(person)"
						@change="handleToggle(person.id, $event)"
					/>
					<span class="min-w-0 truncate text-sm text-white/90 2xl:text-base">
						<span class="font-mono">{{ person.employee_no }}</span>
						<span class="ms-2">{{ person.full_name || "—" }}</span>
					</span>
				</span>
				<span v-if="$slots['person-badge']" class="flex shrink-0 flex-col items-end gap-1">
					<slot name="person-badge" :person="person" />
				</span>
			</template>

			<template v-else>
				<label class="flex min-h-10 cursor-pointer items-center gap-2.5 2xl:min-h-11">
					<input
						type="checkbox"
						class="h-[1.125rem] w-[1.125rem] shrink-0 accent-cyan-400 2xl:h-5 2xl:w-5"
						:checked="isChecked(person.id)"
						:disabled="!canEdit || isDisabled"
						:aria-label="checkboxAriaLabel(person)"
						@change="handleToggle(person.id, $event)"
					/>
					<span class="min-w-0 flex-1 truncate text-sm text-white/90 2xl:text-base">
						<span class="font-mono">{{ person.employee_no }}</span>
						<span class="ms-2">{{ person.full_name || "—" }}</span>
					</span>
					<div class="flex h-9 shrink-0 items-center justify-end 2xl:h-10">
						<slot name="person-indicators" :person="person" />
					</div>
				</label>
				<slot name="person-extra" :person="person" />
			</template>
		</component>
	</div>
</template>

<script setup lang="ts">
import type { Person } from "~/types/personnel"

const props = withDefaults(
	defineProps<{
		candidates: Person[]
		isChecked: (personId: number) => boolean
		canEdit: boolean
		isDisabled?: boolean
		variant?: "default" | "group"
		checkboxAriaLabel?: (person: Person) => string
	}>(),
	{
		isDisabled: false,
		variant: "default",
		checkboxAriaLabel: (person: Person) =>
			`${person.employee_no} ${person.full_name || ""}`.trim(),
	},
)

const emit = defineEmits<{
	toggle: [personId: number, checked: boolean]
}>()

const cardClass = (person: Person) => {
	if (props.variant === "group") {
		return [
			"flex cursor-pointer items-center justify-between gap-2 px-2.5 py-2 hover:bg-white/10",
			props.isChecked(person.id)
				? "border-cyan-400/50 bg-cyan-500/20"
				: "border-white/10 bg-white/[0.03]",
		]
	}
	return [
		"border-white/10 bg-white/5 px-3 py-2.5",
		{ "ring-1 ring-cyan-400/35": props.isChecked(person.id) },
	]
}

const handleToggle = (personId: number, event: Event) => {
	const checked = (event.target as HTMLInputElement | null)?.checked ?? false
	emit("toggle", personId, checked)
}
</script>
