import type {
	PersonGroup,
	Person,
	AccessLocationsResponse,
	SyncableLocation,
	ImportResult,
	SyncWarning,
	PagedResult,
	SyncAllLocationsJob,
	SyncLocationJob
} from "~/types/personnel";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

const PERSONNEL_PREFIX = "/personnel";

export const usePersonnelApi = () => {
	const { request } = useApiBase();
	const config = useRuntimeConfig();

	return {
		// 人員群組
		getPersonGroups: (params?: { name?: string }) => {
			const path = params
				? buildPathWithQuery(`${PERSONNEL_PREFIX}/groups`, params)
				: `${PERSONNEL_PREFIX}/groups`;
			return request<PersonGroup[]>(path);
		},
		getPersonGroupById: (id: number) => request<PersonGroup>(`${PERSONNEL_PREFIX}/groups/${id}`),
		createPersonGroup: (body: { name: string; description?: string | null }) =>
			request<PersonGroup>(`${PERSONNEL_PREFIX}/groups`, {
				method: "POST",
				body: JSON.stringify(body)
			}),
		updatePersonGroup: (id: number, body: { name?: string; description?: string | null }) =>
			request<PersonGroup>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "PUT",
				body: JSON.stringify(body)
			}),
		deletePersonGroup: (id: number) =>
			request<{ success: boolean }>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "DELETE"
			}),

		// 人員
		getPersons: (params?: {
			personGroupId?: number;
			status?: string;
			employeeNo?: string;
			fullName?: string;
			q?: string;
			limit?: number;
			offset?: number;
		}) => {
			const query: Record<string, string | number> = {};
			if (params?.personGroupId != null) query.personGroupId = params.personGroupId;
			if (params?.status) query.status = params.status;
			if (params?.employeeNo) query.employeeNo = params.employeeNo;
			if (params?.fullName) query.fullName = params.fullName;
			if (params?.q) query.q = params.q;
			if (params?.limit != null) query.limit = params.limit;
			if (params?.offset != null) query.offset = params.offset;
			const path = Object.keys(query).length
				? buildPathWithQuery(`${PERSONNEL_PREFIX}/persons`, query)
				: `${PERSONNEL_PREFIX}/persons`;
			return request<PagedResult<Person>>(path);
		},
		getPersonById: (id: number) => request<Person>(`${PERSONNEL_PREFIX}/persons/${id}`),
		getPersonByEmployeeNo: (employeeNo: string) =>
			request<Person>(`${PERSONNEL_PREFIX}/persons/by-employee-no/${encodeURIComponent(employeeNo)}`),
		createPerson: (body: {
			employeeNo: string;
			fullName?: string | null;
			personGroupId?: number | null;
			status?: "active" | "inactive" | "deleted";
			faceUrl?: string | null;
		}) =>
			request<Person>(`${PERSONNEL_PREFIX}/persons`, {
				method: "POST",
				body: JSON.stringify(body)
			}),
		updatePerson: (
			id: number,
			body: Partial<{
				employeeNo: string;
				fullName: string | null;
				personGroupId: number | null;
				status: "active" | "inactive" | "deleted";
				faceUrl: string | null;
			}>
		) =>
			request<Person>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "PUT",
				body: JSON.stringify(body)
			}),
		/** 上傳該人員大頭照（檔名由後端依姓名/工號組成，並自動更新 face_url） */
		uploadFaceForPerson: (personId: number, file: File) => {
			const form = new FormData();
			form.append("file", file);
			return request<{ faceUrl: string; person: Person }>(
				`${PERSONNEL_PREFIX}/persons/${personId}/upload-face`,
				{
					method: "POST",
					body: form,
					timeout: 15000
				}
			);
		},
		deletePerson: (id: number) =>
			request<{ success: boolean }>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "DELETE"
			}),

		// 門禁權限
		getAccessLocations: (personId: number) =>
			request<AccessLocationsResponse>(`${PERSONNEL_PREFIX}/persons/${personId}/access-locations`),
		setAccessLocations: (personId: number, locationIds: number[]) =>
			request<AccessLocationsResponse>(`${PERSONNEL_PREFIX}/persons/${personId}/access-locations`, {
				method: "PUT",
				body: JSON.stringify({ locationIds })
			}),

		// 可同步地點與同步
		getSyncableLocations: () => request<SyncableLocation[]>(`${PERSONNEL_PREFIX}/syncable-locations`),
		startSyncLocationJob: (locationId: number) =>
			request<{ jobId: string }>(`${PERSONNEL_PREFIX}/sync-location/${locationId}/job`, {
				method: "POST",
				timeout: 15000
			}),
		getSyncLocationJob: (jobId: string) =>
			request<SyncLocationJob>(`${PERSONNEL_PREFIX}/sync-location/jobs/${encodeURIComponent(jobId)}`),
		syncLocation: async (locationId: number) => {
			const { jobId } = await request<{ jobId: string }>(
				`${PERSONNEL_PREFIX}/sync-location/${locationId}/job`,
				{ method: "POST", timeout: 15000 }
			);
			const startedAt = Date.now();
			for (;;) {
				const job = await request<SyncLocationJob>(
					`${PERSONNEL_PREFIX}/sync-location/jobs/${encodeURIComponent(jobId)}`
				);
				if (job.status !== "completed") {
					if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("同步逾時，請稍後再試");
					await new Promise(r => setTimeout(r, 1000));
					continue;
				}
				if (job.error?.message) throw new Error(job.error.message);
				return { success: true, warnings: job.result?.warnings ?? [] };
			}
		},
		syncAllLocations: () =>
			request<{ jobId: string }>(
				`${PERSONNEL_PREFIX}/sync-all-locations`,
				{ method: "POST", timeout: 15000 }
			),
		getSyncAllLocationsJob: (jobId: string) =>
			request<SyncAllLocationsJob>(
				`${PERSONNEL_PREFIX}/sync-all-locations/jobs/${encodeURIComponent(jobId)}`
			),

		// 批次匯入
		importPersons: (form: FormData) =>
			request<ImportResult>(`${PERSONNEL_PREFIX}/import`, {
				method: "POST",
				body: form,
				timeout: 120000
			}),
		downloadImportTemplate: async () => {
			const apiBase = (config.public.apiBase as string) || "http://localhost:4000/api";
			const url = `${apiBase}${PERSONNEL_PREFIX}/import-template`;
			const cookie = useCookie<string | null>("auth_token");
			const token = cookie.value;

			const headers: HeadersInit = {};
			if (token) headers.Authorization = `Bearer ${token}`;

			const res = await fetch(url, {
				method: "GET",
				headers,
				credentials: "include"
			});
			if (!res.ok) throw new Error(`下載範例檔失敗（${res.status}）`);
			return await res.blob();
		},
	};
};

