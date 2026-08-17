import { expect, type APIRequestContext, type Page } from "@playwright/test"
import { makeE2eTag } from "./testData"
import {
	attachPageGuards,
	closeDialogByAria,
	deleteZoneInDialog,
	openFloorZoneManagementDialog,
	openZoneManagementDialog,
	suppressAlertToasts,
	visitSystemPage,
	zoneManagementPanel,
} from "./selectors"
import {
	createE2eZoneApi,
	type AccessLocationType,
	type InfraZoneSystem,
} from "./zoneApi"

type AccessZoneCrudOpts = {
	kind: "access"
	path: string
	title: string
	locationType: AccessLocationType
	openDialog: "location" | "floor"
	nameSuffix: string
}

type InfraZoneCrudOpts = {
	kind: "infra"
	path: string
	title: string
	system: InfraZoneSystem
	nameSuffix: string
}

/** API 建 → UI 可見 → API 改名 → UI 刪（避開「儲存變更」設備同步） */
export const runZoneSafeCrud = async (
	page: Page,
	request: APIRequestContext,
	opts: AccessZoneCrudOpts | InfraZoneCrudOpts,
) => {
	const guards = attachPageGuards(page)
	const api = await createE2eZoneApi(request)
	const tag = makeE2eTag()
	const nameCreate = `${tag}-${opts.nameSuffix}`
	const nameUpdated = `${tag}-${opts.nameSuffix}-改`
	let zoneId: string | null = null

	const openMgmt = () => {
		if (opts.kind === "infra") return openFloorZoneManagementDialog(page)
		return opts.openDialog === "location"
			? openZoneManagementDialog(page)
			: openFloorZoneManagementDialog(page)
	}

	try {
		if (opts.kind === "access") {
			const created = await api.createAccessZone(opts.locationType, nameCreate)
			zoneId = created.id
		} else {
			const created = await api.createInfraZone(opts.system, nameCreate)
			zoneId = created.id
		}

		const manageButton: "地點管理" | "樓層管理" =
			opts.kind === "infra"
				? "樓層管理"
				: opts.openDialog === "floor"
					? "樓層管理"
					: "地點管理"
		await visitSystemPage(page, {
			path: opts.path,
			title: opts.title,
			expectManageButton: manageButton,
		})

		await openMgmt()
		await expect(
			zoneManagementPanel(page).getByRole("heading", { name: nameCreate, exact: true }),
		).toBeVisible({ timeout: 15_000 })
		await closeDialogByAria(page)

		if (opts.kind === "access") {
			await api.renameAccessZone(opts.locationType, zoneId, nameUpdated)
		} else {
			await api.renameInfraZone(opts.system, zoneId, nameUpdated)
		}
		await page.reload({ waitUntil: "domcontentloaded" })
		await suppressAlertToasts(page)
		await openMgmt()
		await expect(
			zoneManagementPanel(page).getByRole("heading", { name: nameUpdated, exact: true }),
		).toBeVisible({ timeout: 15_000 })

		await deleteZoneInDialog(page, nameUpdated)
		zoneId = null
		await closeDialogByAria(page)
	} finally {
		if (zoneId != null) {
			if (opts.kind === "access") {
				await api.deleteAccessZone(opts.locationType, zoneId).catch(() => undefined)
			} else {
				await api.deleteInfraZone(opts.system, zoneId).catch(() => undefined)
			}
		} else {
			const leftover =
				opts.kind === "access"
					? (await api.findAccessZoneByName(opts.locationType, nameCreate).catch(() => null)) ||
						(await api.findAccessZoneByName(opts.locationType, nameUpdated).catch(() => null))
					: (await api.findInfraZoneByName(opts.system, nameCreate).catch(() => null)) ||
						(await api.findInfraZoneByName(opts.system, nameUpdated).catch(() => null))
			if (leftover?.id) {
				if (opts.kind === "access") {
					await api.deleteAccessZone(opts.locationType, leftover.id).catch(() => undefined)
				} else {
					await api.deleteInfraZone(opts.system, leftover.id).catch(() => undefined)
				}
			}
		}
	}

	await guards.assertClean()
}
