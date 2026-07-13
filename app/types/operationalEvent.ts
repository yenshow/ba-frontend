export type OperationalEventKind =
	| "control_write"
	| "state_change"
	| "linkage_write"
	| "access"
	| "vehicle"
	| "elevator"

export type OperationalEvent = {
	id: number
	occurred_at: string
	source: string
	event_kind: OperationalEventKind
	location_id: number | null
	system_id: number | null
	device_id: number | null
	bit_key: string | null
	address: number | null
	old_value: boolean | null
	new_value: boolean | null
	summary: string
	actor_user_id: number | null
	alert_id: number | null
	ref_table: string | null
	ref_id: number | null
	payload: Record<string, unknown> | null
	created_at: string
}

export type OperationalEventFilters = {
	source?: string
	event_kind?: string
	start_date?: string
	end_date?: string
	q?: string
	limit?: number
	offset?: number
}

export type OperationalEventListResponse = {
	events: OperationalEvent[]
	total: number
	limit: number
	offset: number
	byKind: Array<{ event_kind: string; count: number }>
}
