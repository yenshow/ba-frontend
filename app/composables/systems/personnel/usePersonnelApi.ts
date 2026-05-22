import type {
	PersonGroup,
	Person,
	Paged,
	SyncableLocation,
	ImportResult,
	SyncWarning,
	SyncAllLocationsJob,
	SyncLocationJob,
	SyncLocationJobItemsPage,
	SyncLocationCandidate,
} from "~/types/personnel"
import type { HandleErrorOptions } from "~/composables/core/useErrorHandler"
import { useApiBase } from "~/composables/core/useApiBase"
import { buildPathWithQuery } from "~/utils/apiUtils"

const PERSONNEL_PREFIX = "/personnel"

/** GET /personnel/persons 查詢參數 */
export type GetPersonsParams = {
	mainGroupId?: number
	personGroupId?: number
	personGroupIds?: number[]
	/** 僅 person_group_id IS NULL（與群組篩選互斥，由後端處理） */
	ungroupedOnly?: boolean
	status?: string
	employeeNo?: string
	fullName?: string
	q?: string
	sortOrder?: "asc" | "desc"
	limit?: number
	offset?: number
}

export type PersonnelHandleApiError = (
	err: unknown,
	fallbackMessage: string,
	options?: HandleErrorOptions
) => string | void | null

/** 人員主檔 API：優先顯示後端 message */
export const PERSONNEL_API_ERROR_OPTS: HandleErrorOptions = { preferBackendMessage: true }

export type PersonnelApi = {
	// 人員群組
	getPersonGroups: (params?: {
		name?: string
		tree?: boolean
		parentId?: number
	}) => Promise<PersonGroup[]>
	getPersonGroupById: (id: number) => Promise<PersonGroup>
	createPersonGroup: (body: { name: string; parentId?: number | null }) => Promise<PersonGroup>
	updatePersonGroup: (
		id: number,
		body: { name?: string; parentId?: number | null }
	) => Promise<PersonGroup>
	deletePersonGroup: (id: number) => Promise<{ ok: boolean }>
	getPersonGroupMembers: (
		groupId: number,
		params?: { limit?: number; offset?: number; status?: string; q?: string }
	) => Promise<Paged<Person>>
	getPersonGroupMemberIds: (groupId: number) => Promise<{ ids: number[] }>
	replacePersonGroupMembers: (
		groupId: number,
		memberPersonIds: number[]
	) => Promise<Paged<Person>>

	// 人員
	getPersons: (params?: GetPersonsParams) => Promise<Paged<Person>>
	getPersonById: (id: number) => Promise<Person>
	getPersonByEmployeeNo: (employeeNo: string) => Promise<Person>
	createPerson: (body: {
		employeeNo: string
		fullName?: string | null
		status?: "active" | "inactive"
		faceUrl?: string | null
		personGroupId?: number | null
	}) => Promise<Person>
	updatePerson: (
		id: number,
		body: Partial<{
			employeeNo: string
			fullName: string | null
			status: "active" | "inactive"
			faceUrl: string | null
			personGroupId: number | null
		}>
	) => Promise<Person>
	uploadFaceForPerson: (
		personId: number,
		file: File
	) => Promise<{ faceUrl: string; person: Person }>
	deletePerson: (id: number) => Promise<{ ok: boolean }>

	// 可同步地點與同步
	getSyncableLocations: () => Promise<SyncableLocation[]>
	/** 某地點應同步人員名單（人臉/卡/指紋是否有值） */
	getSyncLocationCandidates: (locationId: number) => Promise<{ persons: SyncLocationCandidate[] }>
	/** 某地點門禁名單（SSOT: person_location_access） */
	getLocationMembers: (
		locationId: number,
		params?: { limit?: number; offset?: number; q?: string; status?: string }
	) => Promise<Paged<Person>>
	getLocationMemberIds: (locationId: number) => Promise<{ ids: number[] }>
	replaceLocationMembers: (
		locationId: number,
		memberPersonIds: number[]
	) => Promise<Paged<Person>>
	startSyncLocationJob: (locationId: number) => Promise<{ jobId: string }>
	getSyncLocationJob: (
		jobId: string,
		params?: { includeIssues?: boolean; includeTail?: boolean; issuesLimit?: number; tailLimit?: number }
	) => Promise<SyncLocationJob>
	getSyncLocationJobItems: (
		jobId: string,
		params?: { type?: "issues" | "tail"; limit?: number; offset?: number }
	) => Promise<SyncLocationJobItemsPage>
	syncAllLocations: () => Promise<{ jobId: string }>
	getSyncAllLocationsJob: (jobId: string) => Promise<SyncAllLocationsJob>

	// 批次匯入
	importPersons: (form: FormData) => Promise<ImportResult>
	downloadImportTemplate: () => Promise<Blob>

	// 人員門禁設定（僅存平台；一次寫入）
	setPersonAccessControlConfig: (
		personId: number,
		body: {
			validity: { longTerm: boolean; beginTime: string; endTime: string }
			cardNo: string | null
			fingerData: string | null
			password: string | null
		}
	) => Promise<{ person: Person }>
}

export const usePersonnelApi = (): PersonnelApi => {
	const { request, requestBlob } = useApiBase()

	return {
		// 人員群組
		getPersonGroups: (params?: { name?: string; tree?: boolean; parentId?: number }) => {
			const path = params
				? buildPathWithQuery(`${PERSONNEL_PREFIX}/groups`, params)
				: `${PERSONNEL_PREFIX}/groups`
			return request<PersonGroup[]>(path)
		},
		getPersonGroupById: (id: number) => request<PersonGroup>(`${PERSONNEL_PREFIX}/groups/${id}`),
		createPersonGroup: (body: { name: string; parentId?: number | null }) =>
			request<PersonGroup>(`${PERSONNEL_PREFIX}/groups`, {
				method: "POST",
				body: JSON.stringify(body),
			}),
		updatePersonGroup: (id: number, body: { name?: string; parentId?: number | null }) =>
			request<PersonGroup>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "PUT",
				body: JSON.stringify(body),
			}),
		deletePersonGroup: (id: number) =>
			request<{ ok: boolean }>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "DELETE",
			}),
		getPersonGroupMembers: (
			groupId: number,
			params?: { limit?: number; offset?: number; status?: string; q?: string }
		) => {
			const query: Record<string, string | number> = {}
			if (params?.limit != null) query.limit = params.limit
			if (params?.offset != null) query.offset = params.offset
			if (params?.q) query.q = params.q
			if (params?.status) query.status = params.status
			const path =
				Object.keys(query).length > 0
					? buildPathWithQuery(`${PERSONNEL_PREFIX}/groups/${groupId}/members`, query)
					: `${PERSONNEL_PREFIX}/groups/${groupId}/members`
			return request<Paged<Person>>(path)
		},
		getPersonGroupMemberIds: (groupId: number) =>
			request<{ ids: number[] }>(`${PERSONNEL_PREFIX}/groups/${groupId}/member-ids`),
		replacePersonGroupMembers: (groupId: number, memberPersonIds: number[]) =>
			request<Paged<Person>>(`${PERSONNEL_PREFIX}/groups/${groupId}/members`, {
				method: "PUT",
				body: JSON.stringify({ memberPersonIds }),
			}),

		// 人員
		getPersons: (params?: GetPersonsParams) => {
			const query: Record<string, string | number> = {}
			if (params?.mainGroupId != null) query.mainGroupId = params.mainGroupId
			if (params?.personGroupId != null) query.personGroupId = params.personGroupId
			if (params?.personGroupIds?.length) query.personGroupIds = params.personGroupIds.join(",")
			if (params?.ungroupedOnly) query.ungroupedOnly = "true"
			if (params?.status) query.status = params.status
			if (params?.employeeNo) query.employeeNo = params.employeeNo
			if (params?.fullName) query.fullName = params.fullName
			if (params?.q) query.q = params.q
			if (params?.sortOrder) query.sortOrder = params.sortOrder
			if (params?.limit != null) query.limit = params.limit
			if (params?.offset != null) query.offset = params.offset
			const path = Object.keys(query).length
				? buildPathWithQuery(`${PERSONNEL_PREFIX}/persons`, query)
				: `${PERSONNEL_PREFIX}/persons`
			return request<Paged<Person>>(path)
		},
		getPersonById: (id: number) => request<Person>(`${PERSONNEL_PREFIX}/persons/${id}`),
		getPersonByEmployeeNo: (employeeNo: string) =>
			request<Person>(
				`${PERSONNEL_PREFIX}/persons/by-employee-no/${encodeURIComponent(employeeNo)}`
			),
		createPerson: (body: {
			employeeNo: string
			fullName?: string | null
			status?: "active" | "inactive"
			faceUrl?: string | null
			personGroupId?: number | null
		}) =>
			request<Person>(`${PERSONNEL_PREFIX}/persons`, {
				method: "POST",
				body: JSON.stringify(body),
			}),
		updatePerson: (
			id: number,
			body: Partial<{
				employeeNo: string
				fullName: string | null
				status: "active" | "inactive"
				faceUrl: string | null
				personGroupId: number | null
			}>
		) =>
			request<Person>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "PUT",
				body: JSON.stringify(body),
			}),
		/** 上傳該人員大頭照（檔名由後端依姓名/工號組成，並自動更新 face_url） */
		uploadFaceForPerson: (personId: number, file: File) => {
			const form = new FormData()
			form.append("file", file)
			return request<{ faceUrl: string; person: Person }>(
				`${PERSONNEL_PREFIX}/persons/${personId}/upload-face`,
				{
					method: "POST",
					body: form,
					timeout: 15000,
				}
			)
		},
		deletePerson: (id: number) =>
			request<{ ok: boolean }>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "DELETE",
			}),

		// 可同步地點與同步
		getSyncableLocations: () =>
			request<SyncableLocation[]>(`${PERSONNEL_PREFIX}/syncable-locations`),
		getSyncLocationCandidates: (locationId: number) =>
			request<{ persons: SyncLocationCandidate[] }>(
				`${PERSONNEL_PREFIX}/locations/${locationId}/sync-candidates`
			),
		getLocationMembers: (
			locationId: number,
			params?: { limit?: number; offset?: number; q?: string; status?: string }
		) => {
			const query: Record<string, string | number> = {}
			if (params?.limit != null) query.limit = params.limit
			if (params?.offset != null) query.offset = params.offset
			if (params?.q) query.q = params.q
			if (params?.status) query.status = params.status
			const path =
				Object.keys(query).length > 0
					? buildPathWithQuery(`${PERSONNEL_PREFIX}/locations/${locationId}/members`, query)
					: `${PERSONNEL_PREFIX}/locations/${locationId}/members`
			return request<Paged<Person>>(path)
		},
		getLocationMemberIds: (locationId: number) =>
			request<{ ids: number[] }>(`${PERSONNEL_PREFIX}/locations/${locationId}/member-ids`),
		replaceLocationMembers: (locationId: number, memberPersonIds: number[]) =>
			request<Paged<Person>>(`${PERSONNEL_PREFIX}/locations/${locationId}/members`, {
				method: "PUT",
				body: JSON.stringify({ memberPersonIds }),
			}),
		startSyncLocationJob: (locationId: number) =>
			request<{ jobId: string }>(`${PERSONNEL_PREFIX}/sync-location/${locationId}/job`, {
				method: "POST",
				timeout: 15000,
			}),
		getSyncLocationJob: (
			jobId: string,
			params?: { includeIssues?: boolean; includeTail?: boolean; issuesLimit?: number; tailLimit?: number }
		) => {
			const query: Record<string, string | number> = {}
			if (params?.includeIssues) query.includeIssues = 1
			if (params?.includeTail) query.includeTail = 1
			if (params?.issuesLimit != null) query.issuesLimit = params.issuesLimit
			if (params?.tailLimit != null) query.tailLimit = params.tailLimit
			const p =
				Object.keys(query).length > 0
					? buildPathWithQuery(
							`${PERSONNEL_PREFIX}/sync-location/jobs/${encodeURIComponent(jobId)}`,
							query
						)
					: `${PERSONNEL_PREFIX}/sync-location/jobs/${encodeURIComponent(jobId)}`
			return request<SyncLocationJob>(p)
		},
		getSyncLocationJobItems: (
			jobId: string,
			params?: { type?: "issues" | "tail"; limit?: number; offset?: number }
		) => {
			const query: Record<string, string | number> = {}
			if (params?.type) query.type = params.type
			if (params?.limit != null) query.limit = params.limit
			if (params?.offset != null) query.offset = params.offset
			const p = buildPathWithQuery(
				`${PERSONNEL_PREFIX}/sync-location/jobs/${encodeURIComponent(jobId)}/items`,
				query
			)
			return request<SyncLocationJobItemsPage>(p)
		},
		syncAllLocations: () =>
			request<{ jobId: string }>(`${PERSONNEL_PREFIX}/sync-all-locations`, {
				method: "POST",
				timeout: 15000,
			}),
		getSyncAllLocationsJob: (jobId: string) =>
			request<SyncAllLocationsJob>(
				`${PERSONNEL_PREFIX}/sync-all-locations/jobs/${encodeURIComponent(jobId)}`
			),

		// 批次匯入
		importPersons: (form: FormData) =>
			request<ImportResult>(`${PERSONNEL_PREFIX}/import`, {
				method: "POST",
				body: form,
				timeout: 120000,
			}),

		downloadImportTemplate: () => requestBlob(`${PERSONNEL_PREFIX}/import-template`),

		setPersonAccessControlConfig: (
			personId: number,
			body: {
				validity: { longTerm: boolean; beginTime: string; endTime: string }
				cardNo: string | null
				fingerData: string | null
				password: string | null
			}
		) =>
			request<{ person: Person }>(
				`${PERSONNEL_PREFIX}/persons/${personId}/access-control-config`,
				{
					method: "PUT",
					body: JSON.stringify(body),
					timeout: 15000,
				}
			),
	}
}
