import type {
	PersonGroup,
	Person,
	AccessLocationsResponse,
	SyncableLocation,
	ImportPersonRow,
	ImportResult,
	SyncWarning,
	SyncLocationResult
} from "~/types/personnel";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

const PERSONNEL_PREFIX = "/personnel";

export const usePersonnelApi = () => {
	const { request } = useApiBase();

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
		}) => {
			const query: Record<string, string | number> = {};
			if (params?.personGroupId != null) query.personGroupId = params.personGroupId;
			if (params?.status) query.status = params.status;
			if (params?.employeeNo) query.employeeNo = params.employeeNo;
			if (params?.fullName) query.fullName = params.fullName;
			const path = Object.keys(query).length
				? buildPathWithQuery(`${PERSONNEL_PREFIX}/persons`, query)
				: `${PERSONNEL_PREFIX}/persons`;
			return request<Person[]>(path);
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
		syncLocation: (locationId: number) =>
			request<{ success: boolean; warnings: SyncWarning[] }>(
				`${PERSONNEL_PREFIX}/sync-location/${locationId}`,
				{ method: "POST", timeout: 60000 }
			),
		syncAllLocations: () =>
			request<{ synced: number; results: SyncLocationResult[] }>(
				`${PERSONNEL_PREFIX}/sync-all-locations`,
				{ method: "POST", timeout: 120000 }
			),

		// 批次匯入
		importPersons: (body: { persons: ImportPersonRow[] }) =>
			request<ImportResult>(`${PERSONNEL_PREFIX}/import`, {
				method: "POST",
				body: JSON.stringify(body)
			})
	};
};

