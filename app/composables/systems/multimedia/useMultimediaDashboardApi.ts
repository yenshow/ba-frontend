import { useApiBase } from "~/composables/core/useApiBase"
import type {
	MultimediaDashboardSettings,
	MultimediaEnvReadingsSnapshotResponse,
} from "~/types/multimedia"

export const useMultimediaDashboardApi = () => {
	const { request } = useApiBase()

	const getSettings = async (): Promise<{ settings: MultimediaDashboardSettings }> => {
		return request("/multimedia/dashboard/settings", { method: "GET" } as any)
	}

	const updateSettings = async (
		settings: Partial<MultimediaDashboardSettings>
	): Promise<{ settings: MultimediaDashboardSettings }> => {
		return request("/multimedia/dashboard/settings", {
			method: "PUT",
			body: JSON.stringify(settings),
		} as any)
	}

	const uploadMedia = async (file: File): Promise<{ file: { url: string } }> => {
		const formData = new FormData()
		formData.append("file", file)
		return request("/multimedia/dashboard/upload", {
			method: "POST",
			body: formData as any,
		} as any)
	}

	const getEnvReadingsSnapshot =
		async (): Promise<MultimediaEnvReadingsSnapshotResponse> => {
			return request("/multimedia/dashboard/env-readings", { method: "GET" } as any)
		}

	const listWallSeats = async (): Promise<{
		seats: Array<{
			fingerprint: string
			hostname: string | null
			registeredAt: string
			lastSeenAt: string
			active: boolean
		}>
	}> => {
		return request("/multimedia/wall/seats", { method: "GET" } as any)
	}

	const revokeWallSeat = async (
		fingerprint: string,
	): Promise<{ revoked: boolean; fingerprint: string }> => {
		return request(`/multimedia/wall/seats/${encodeURIComponent(fingerprint)}`, {
			method: "DELETE",
		} as any)
	}

	return {
		getSettings,
		updateSettings,
		uploadMedia,
		getEnvReadingsSnapshot,
		listWallSeats,
		revokeWallSeat,
	}
}
