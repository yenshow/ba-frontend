<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-6xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">地點管理</h3>
						<div class="flex items-center gap-3">
							<IconTrashButton
								v-if="zone && zone.id"
								:disabled="!canDeleteZone"
								:title="canDeleteZone ? '刪除區域' : '權限不足'"
								aria-label="刪除區域"
								@click="handleDeleteZone"
							/>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉對話框"
								@click="closeDialog"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="zone && displayZone" :key="`zone-${zone.id}`">
									<div class="space-y-3">
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<ZoneFormFields
												:zone="displayZone"
												:require-image-url="true"
												:read-only="true"
											/>
										</div>

										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<div class="mb-3 flex items-center justify-between">
												<span class="text-base font-medium 2xl:text-lg">地點列表</span>
											</div>

											<div
												v-if="!displayZone.locations || displayZone.locations.length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無地點
							</div>
							<div v-else class="space-y-2">
												<div
													v-for="(location, locationIndex) in displayZone.locations"
													:key="getLocationUiKey({ zone: displayZone, location, locationIndex })"
													class="flex min-w-0 items-end gap-2 rounded border border-white/10 bg-white/5 p-2"
												>
													<label
														class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>地點名稱</span>
											<div class="form-input-small flex cursor-default items-center text-white/70">
												{{ location.name || "未命名" }}
														</div>
													</label>
													<label
														class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>所屬系統</span>
														<div
															class="form-input-small flex cursor-default items-center text-white/70"
														>
															{{ getLocationSystemsLabel(location) || "無系統" }}
														</div>
													</label>
													<IconTrashButton
														button-class="ml-auto flex-shrink-0"
														:disabled="!canDeleteLocation"
												:title="canDeleteLocation ? '刪除地點' : '權限不足'"
														aria-label="刪除區域"
														@click="removeLocation(locationIndex)"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無地點資料</p>
								</div>
							</Transition>
						</div>
					</div>

					<p v-if="errorMessage" class="form-error-text-lg pr-7 2xl:pr-8">
						{{ errorMessage }}
					</p>
					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="closeDialog">關閉</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<ConfirmDialog
		v-model="showConfirmDialog"
		:title="confirmDialogConfig.title"
		:message="confirmDialogConfig.message"
		:details="confirmDialogConfig.details"
		:type="confirmDialogConfig.type"
		@confirm="
			confirmAction === 'delete'
				? handleConfirmDelete()
				: confirmAction === 'deleteLocation'
					? handleConfirmDeleteLocation()
					: undefined
		"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import ZoneFormFields from "~/components/location/ZoneFormFields.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions"
import { buildDeleteLocationConfirmCopy, buildDeleteZoneConfirmCopy } from "~/utils/confirmCopy"
import { getLocationUiKey } from "~/utils/locationUiId"
import { resolveFormApiError } from "~/utils/errorUtils"
import { getSystemTypeLabel } from "~/types/location"

interface Props {
	modelValue: boolean
	zone: UnifiedZone | null
	systemType?: SystemType
	allowDelete?: boolean
	allowDeleteZone?: boolean
	allowDeleteLocation?: boolean
}

interface Emits {
	(e: "update:modelValue", value: boolean): void
	(e: "delete", zoneId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const canDeleteZone = computed(
	() => props.allowDeleteZone !== false && props.allowDelete !== false,
)
const canDeleteLocation = computed(
	() => props.allowDeleteLocation !== false && props.allowDelete !== false,
)

const errorMessage = ref("")
const displayZone = ref<UnifiedZone | null>(null)

watch(
	() => props.zone,
	(zone) => {
		displayZone.value = zone ? (JSON.parse(JSON.stringify(zone)) as UnifiedZone) : null
	},
	{ immediate: true, deep: true },
)

const confirmDialog = useConfirmDialog()
const confirmAction = ref<"delete" | "deleteLocation">("delete")
const pendingDeleteLocationUiKey = ref<string | null>(null)

const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})

const confirmDialogConfig = computed(() => confirmDialog.config.value)

const closeDialog = () => {
	emit("update:modelValue", false)
	errorMessage.value = ""
}

const removeLocation = (locationIndex: number) => {
	if (!canDeleteLocation.value) return
	if (!displayZone.value) return
	const location = displayZone.value.locations?.[locationIndex]
	const locationUiKey = getLocationUiKey({
		zone: displayZone.value,
		location: location as UnifiedLocation,
		locationIndex,
	})
	pendingDeleteLocationUiKey.value = locationUiKey
	confirmAction.value = "deleteLocation"
	const hasId = Boolean(location && location.id)
	const systemCount = location?.systems?.length || 0
	const copy = buildDeleteLocationConfirmCopy({
		hasId,
		systemType: props.systemType,
		systemCount,
	})
	confirmDialog.show(copy)
}

const handleConfirmDeleteLocation = async () => {
	if (!canDeleteLocation.value) return
	if (!displayZone.value || !pendingDeleteLocationUiKey.value) return

	const resolvedIndex = (displayZone.value.locations || []).findIndex((loc, idx) => {
		return (
			getLocationUiKey({
				zone: displayZone.value as UnifiedZone,
				location: loc,
				locationIndex: idx,
			}) === pendingDeleteLocationUiKey.value
		)
	})
	if (resolvedIndex < 0) {
		pendingDeleteLocationUiKey.value = null
		return
	}

	const location = displayZone.value.locations?.[resolvedIndex]
	const locationId = location?.id ? String(location.id) : null

	if (locationId) {
		try {
			await removeLocationFromSystemOrDelete({ locationId, systemType: props.systemType })
		} catch (error) {
			errorMessage.value = resolveFormApiError(error, "刪除地點失敗")
			pendingDeleteLocationUiKey.value = null
			return
		}
	}

	displayZone.value.locations = displayZone.value.locations.filter(
		(_, index) => index !== resolvedIndex,
	)
	pendingDeleteLocationUiKey.value = null
}

const handleDeleteZone = () => {
	if (!canDeleteZone.value) return
	if (!props.zone?.id) return

	confirmAction.value = "delete"
	confirmDialog.show(buildDeleteZoneConfirmCopy({ systemType: props.systemType }))
}

const handleConfirmDelete = () => {
	if (props.zone?.id) {
		emit("delete", props.zone.id)
	}
}

const getLocationSystemsLabel = (location: UnifiedLocation): string => {
	if (!location.systems?.length) return ""
	return location.systems.map((system) => getSystemTypeLabel(system.systemType)).join("、")
}
</script>
