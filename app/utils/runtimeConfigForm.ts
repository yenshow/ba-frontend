/** 營運設定表單（GET|PUT /api/runtime-config） */

export type RuntimeConfigFieldKind = "text" | "password" | "number"

export type RuntimeConfigField = {
	key: string
	label: string
	kind: RuntimeConfigFieldKind
}

export type RuntimeConfigSection = {
	title: string
	fields: RuntimeConfigField[]
}

export type RuntimeConfigSchema = {
	sections: RuntimeConfigSection[]
}

export const mergeRuntimeFormValues = (
	schema: RuntimeConfigSchema,
	values: Record<string, string>,
): Record<string, string> => {
	const out: Record<string, string> = {}
	for (const section of schema.sections) {
		for (const field of section.fields) {
			out[field.key] = values[field.key] ?? ""
		}
	}
	return out
}

export const getRuntimeSectionRows = (schema: RuntimeConfigSchema) =>
	schema.sections.map((section) => [section])
