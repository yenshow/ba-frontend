import { useApiBase } from "~/composables/core/useApiBase"
import type { MultimediaDashboardSettings } from "~/types/multimedia"

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

	const uploadImage = async (file: File): Promise<{ file: { url: string } }> => {
		const formData = new FormData()
		formData.append("file", file)
		return request("/multimedia/dashboard/upload", {
			method: "POST",
			body: formData as any,
		} as any)
	}

	return { getSettings, updateSettings, uploadImage }
}

