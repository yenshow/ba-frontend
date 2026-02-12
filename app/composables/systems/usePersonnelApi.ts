import type {
	PersonGroup,
	Person,
	AccessLocationsResponse,
	SyncableLocation,
	ImportPersonRow
} from "~/types/personnel";
import { useApiBase } from "~/composables/core/useApiBase";
import { buildPathWithQuery } from "~/utils/apiUtils";

const PERSONNEL_PREFIX = "/personnel";

/**
 * 人員管理 API Composable
 * 對接後端 /api/personnel：群組、人員、門禁權限、可同步地點、同步、批次匯入
 */
export const usePersonnelApi = () => {
	const { request } = useApiBase();

	return {
		// ---------- 人員群組 ----------
		getPersonGroups: (params?: { limit?: number; offset?: number }) => {
			const query = params ? buildPathWithQuery(`${PERSONNEL_PREFIX}/groups`, params) : `${PERSONNEL_PREFIX}/groups`;
			return request<{ groups: PersonGroup[]; total: number }>(query);
		},

		getPersonGroupById: (id: number) => {
			return request<PersonGroup>(`${PERSONNEL_PREFIX}/groups/${id}`);
		},

		createPersonGroup: (body: { name: string; description?: string }) => {
			return request<{ message: string; group: PersonGroup }>(`${PERSONNEL_PREFIX}/groups`, {
				method: "POST",
				body: JSON.stringify(body)
			});
		},

		updatePersonGroup: (id: number, body: { name: string; description?: string }) => {
			return request<{ message: string; group: PersonGroup }>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "PUT",
				body: JSON.stringify(body)
			});
		},

		deletePersonGroup: (id: number) => {
			return request<{ message: string }>(`${PERSONNEL_PREFIX}/groups/${id}`, {
				method: "DELETE"
			});
		},

		// ---------- 人員 ----------
		getPersons: (params?: {
			personGroupId?: number;
			status?: string;
			employeeNo?: string;
			fullName?: string;
			limit?: number;
			offset?: number;
		}) => {
			const filterParams: Record<string, unknown> = {};
			if (params?.personGroupId != null) filterParams.personGroupId = params.personGroupId;
			if (params?.status) filterParams.status = params.status;
			if (params?.employeeNo) filterParams.employeeNo = params.employeeNo;
			if (params?.fullName) filterParams.fullName = params.fullName;
			if (params?.limit != null) filterParams.limit = params.limit;
			if (params?.offset != null) filterParams.offset = params.offset;
			const path = buildPathWithQuery(`${PERSONNEL_PREFIX}/persons`, filterParams);
			return request<{ persons: Person[]; total: number }>(path);
		},

		getPersonById: (id: number) => {
			return request<Person>(`${PERSONNEL_PREFIX}/persons/${id}`);
		},

		getPersonByEmployeeNo: (no: string) => {
			return request<Person>(`${PERSONNEL_PREFIX}/persons/by-employee-no/${encodeURIComponent(no)}`);
		},

		createPerson: (body: {
			employee_no: string;
			full_name?: string;
			person_group_id?: number;
			status?: "active" | "inactive";
		}) => {
			return request<{ message: string; person: Person }>(`${PERSONNEL_PREFIX}/persons`, {
				method: "POST",
				body: JSON.stringify(body)
			});
		},

		updatePerson: (
			id: number,
			body: {
				employee_no?: string;
				full_name?: string;
				person_group_id?: number;
				status?: "active" | "inactive" | "deleted";
			}
		) => {
			return request<{ message: string; person: Person }>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "PUT",
				body: JSON.stringify(body)
			});
		},

		deletePerson: (id: number) => {
			return request<{ message: string }>(`${PERSONNEL_PREFIX}/persons/${id}`, {
				method: "DELETE"
			});
		},

		// ---------- 門禁權限 ----------
		getAccessLocations: (personId: number) => {
			return request<AccessLocationsResponse>(
				`${PERSONNEL_PREFIX}/persons/${personId}/access-locations`
			);
		},

		setAccessLocations: (personId: number, locationIds: number[]) => {
			return request<{ message: string }>(`${PERSONNEL_PREFIX}/persons/${personId}/access-locations`, {
				method: "PUT",
				body: JSON.stringify({ locationIds })
			});
		},

		// ---------- 可同步地點與同步 ----------
		getSyncableLocations: () => {
			return request<SyncableLocation[]>(`${PERSONNEL_PREFIX}/syncable-locations`);
		},

		syncLocation: (locationId: number) => {
			return request<{ message: string }>(
				`${PERSONNEL_PREFIX}/sync-location/${locationId}`,
				{ method: "POST", timeout: 60000 }
			);
		},

		syncAllLocations: () => {
			return request<{ message: string }>(`${PERSONNEL_PREFIX}/sync-all-locations`, {
				method: "POST",
				timeout: 120000
			});
		},

		// ---------- 批次匯入 ----------
		importPersons: (body: { persons: ImportPersonRow[] }) => {
			return request<{ created: number; errors?: { row: number; message: string }[] }>(
				`${PERSONNEL_PREFIX}/import`,
				{
					method: "POST",
					body: JSON.stringify(body)
				}
			);
		}
	};
};
