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
							<!-- 變更提示 -->
							<FormChangeIndicator
								v-if="hasUnsavedChanges"
								:has-changes="hasUnsavedChanges"
								:changed-fields="changedFieldsList"
								:message="changeSummary"
							/>
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
								@click="handleClose"
							>
								&times;
							</button>
						</div>
					</header>

					<div class="show-scrollbar flex-1 overflow-y-auto pr-7 2xl:pr-8">
						<div class="min-h-[200px]">
							<Transition name="fade" mode="out-in">
								<div v-if="zone && pendingZone" :key="`zone-${zone.id}`">
									<div class="space-y-3">
										<!-- 區域基本資訊 -->
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<ZoneFormFields
												:zone="pendingZone"
												:require-image-url="true"
												:read-only="!canEdit"
												@update="handleZoneFieldsUpdate"
											/>
										</div>

										<!-- 地點列表 -->
										<div class="overflow-hidden rounded-lg border border-white/20 bg-white/10 p-4">
											<div class="mb-3 flex items-center justify-between">
												<span class="text-base font-medium 2xl:text-lg">地點列表</span>
												<PermissionActionButton
													:allowed="canEdit"
													aria-label="新增地點"
													class="btn-secondary text-sm 2xl:text-base"
													@click="addLocation"
												>
													新增地點
												</PermissionActionButton>
											</div>

											<!-- 地點項目 -->
											<div
												v-if="!pendingZone.locations || pendingZone.locations.length === 0"
												class="py-4 text-center text-sm text-white/60 2xl:text-base"
											>
												尚無地點，請新增地點
											</div>
											<div v-else class="space-y-2">
												<div
													v-for="(location, locationIndex) in pendingZone.locations"
													:key="getLocationUiKey({ zone: pendingZone, location, locationIndex })"
													class="flex min-w-0 items-end gap-2 rounded border border-white/10 bg-white/5 p-2"
												>
													<label
														class="flex flex-[2] flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
													>
														<span>地點名稱 *</span>
														<input
															v-model="location.name"
															type="text"
															required
															class="form-input-small"
															placeholder="例如：主控室"
															:readonly="!canEdit"
														/>
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
														aria-label="刪除地點"
														@click="removeLocation(locationIndex)"
													/>
												</div>
											</div>
										</div>
									</div>
								</div>
								<!-- 空狀態 -->
								<div v-else key="empty" class="py-8 text-center text-white/60">
									<p class="text-base 2xl:text-lg">尚無區域資料</p>
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
						<button type="button" class="btn-secondary" @click="handleClose">關閉</button>
						<div class="flex-1"></div>
						<PermissionActionButton
							:allowed="canEdit && hasUnsavedChanges"
							aria-label="儲存變更"
							class="btn-primary"
							@click="saveChanges"
						>
							儲存變更
						</PermissionActionButton>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- 確認對話框 -->
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
					: handleConfirmClose()
		"
	/>
</template>

<script setup lang="ts">
import type { UnifiedZone, UnifiedLocation, SystemType } from "~/types/location"
import ConfirmDialog from "~/components/common/ConfirmDialog.vue"
import ZoneFormFields from "~/components/location/ZoneFormFields.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PermissionActionButton from "~/components/common/PermissionActionButton.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import { useConfirmDialog } from "~/composables/core/useConfirmDialog"
import { useErrorHandler } from "~/composables/core/useErrorHandler"
import { removeLocationFromSystemOrDelete } from "~/composables/location/locationSystemActions"
import { buildDeleteLocationConfirmCopy, buildDeleteZoneConfirmCopy } from "~/utils/confirmCopy"
import { getLocationUiKey } from "~/utils/locationUiId"
import { useLocationValidationPipeline } from "~/composables/location/validation/useLocationValidationPipeline"
import { useUnifiedZoneDraft } from "~/composables/location/ui/useZoneDrafts"
import { getSystemTypeLabel } from "~/types/location"

interface Props {
	modelValue: boolean
	zone: UnifiedZone | null
	/** 可選：提供時刪除地點僅移除此系統 */
	systemType?: SystemType
	readOnly?: boolean
	/**
	 * full：完整管理（可新增/編輯/儲存，是否可刪由 allowDelete 決定）
	 * delete-only：只允許刪除（用於全區點位圖彙整頁）
	 */
	mode?: "full" | "delete-only"
	/** @deprecated 請改用 allowDeleteZone / allowDeleteLocation */
	allowDelete?: boolean
	allowDeleteZone?: boolean
	allowDeleteLocation?: boolean
}

interface Emits {
	(e: "update:modelValue", value: boolean): void
	(e: "save", zone: UnifiedZone): void
	(e: "delete", zoneId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const mode = computed(() => props.mode ?? "full")
const isReadOnly = computed(() => props.readOnly === true)
const canEdit = computed(() => !isReadOnly.value && mode.value === "full")
const canDeleteZone = computed(
	() => props.allowDeleteZone !== false && props.allowDelete !== false,
)
const canDeleteLocation = computed(
	() => props.allowDeleteLocation !== false && props.allowDelete !== false,
)

const errorMessage = ref("")

const { handleError } = useErrorHandler()
const { validateUnifiedZoneForSave } = useLocationValidationPipeline()

const { pendingZone, hasUnsavedChanges, changedFieldsList, changeSummary, resetToSource } =
	useUnifiedZoneDraft({
		sourceZone: computed(() => props.zone),
	})

// 確認對話框
const confirmDialog = useConfirmDialog()
const confirmAction = ref<"close" | "delete" | "deleteLocation">("close")
const pendingDeleteLocationUiKey = ref<string | null>(null)

// 解包 ref 以便在模板中使用
const showConfirmDialog = computed({
	get: () => confirmDialog.showDialog.value,
	set: (value: boolean) => {
		confirmDialog.showDialog.value = value
	},
})

const confirmDialogConfig = computed(() => confirmDialog.config.value)

const handleClose = () => {
	if (!canEdit.value) {
		closeDialog()
		return
	}
	if (hasUnsavedChanges.value) {
		confirmAction.value = "close"
		confirmDialog.show({
			title: "確認關閉",
			message: "您有未保存的變更，確定要關閉嗎？",
			details: "未保存的變更將會遺失。",
			type: "warning",
		})
		return
	}
	closeDialog()
}

// 關閉對話框（清除狀態）
const closeDialog = () => {
	emit("update:modelValue", false)
	errorMessage.value = ""
	// 重置 pendingZone
	resetToSource()
}

// 確認關閉
const handleConfirmClose = () => {
	closeDialog()
}

const handleZoneFieldsUpdate = (updates: Partial<UnifiedZone>) => {
	if (!canEdit.value || !pendingZone.value) return
	Object.assign(pendingZone.value, updates)
	errorMessage.value = ""
}

const addLocation = () => {
	if (!canEdit.value) return
	if (!pendingZone.value) return
	const newLocation: Omit<UnifiedLocation, "id" | "zoneId"> = {
		name: "",
		description: "",
		systems: [],
	}
	pendingZone.value.locations = [
		...(pendingZone.value.locations || []),
		newLocation as UnifiedLocation,
	]
}

const removeLocation = (locationIndex: number) => {
	if (!canDeleteLocation.value) return
	if (!pendingZone.value) return
	const location = pendingZone.value.locations?.[locationIndex]
	const locationUiKey = getLocationUiKey({
		zone: pendingZone.value,
		location: location as any,
		locationIndex,
	})
	pendingDeleteLocationUiKey.value = locationUiKey
	confirmAction.value = "deleteLocation"
	const hasId = Boolean(location && (location as any).id)
	const systemCount = (location as any)?.systems?.length || 0
	const copy = buildDeleteLocationConfirmCopy({
		hasId,
		systemType: props.systemType,
		systemCount,
	})
	confirmDialog.show(copy)
}

// 確認刪除地點
const handleConfirmDeleteLocation = async () => {
	if (!canDeleteLocation.value) return
	if (!pendingZone.value || !pendingDeleteLocationUiKey.value) return

	const resolvedIndex = (pendingZone.value.locations || []).findIndex((loc, idx) => {
		return (
			getLocationUiKey({
				zone: pendingZone.value as any,
				location: loc as any,
				locationIndex: idx,
			}) === pendingDeleteLocationUiKey.value
		)
	})
	if (resolvedIndex < 0) {
		pendingDeleteLocationUiKey.value = null
		return
	}

	const location = pendingZone.value.locations?.[resolvedIndex]
	const locationId = location && (location as any).id ? String((location as any).id) : null

	if (locationId) {
		try {
			await removeLocationFromSystemOrDelete({ locationId, systemType: props.systemType })
		} catch (error) {
			handleError(error, "刪除地點失敗")
			pendingDeleteLocationUiKey.value = null
			return
		}
	}

	pendingZone.value.locations = pendingZone.value.locations.filter(
		(_, index) => index !== resolvedIndex
	)
	pendingDeleteLocationUiKey.value = null
}

// 刪除區域
const handleDeleteZone = () => {
	if (!canDeleteZone.value) return
	if (!props.zone || !props.zone.id) return

	confirmAction.value = "delete"
	confirmDialog.show(buildDeleteZoneConfirmCopy({ systemType: props.systemType }))
}

// 確認刪除區域
const handleConfirmDelete = () => {
	if (props.zone && props.zone.id) {
		emit("delete", props.zone.id)
	}
}

const getLocationSystemsLabel = (location: UnifiedLocation): string => {
	if (!location.systems || location.systems.length === 0) return ""
	return location.systems.map((system) => getSystemTypeLabel(system.systemType)).join("、")
}

const saveChanges = async () => {
	if (!canEdit.value) return
	if (!pendingZone.value || !hasUnsavedChanges.value) return

	const result = validateUnifiedZoneForSave({ zone: pendingZone.value })
	if (!result.isValid) {
		errorMessage.value = result.errors.join("\n")
		return
	}

	emit("save", pendingZone.value)
	errorMessage.value = ""
	// 更新 pendingZone 以反映已保存的狀態
	resetToSource()
}
</script>
