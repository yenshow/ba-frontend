<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:gap-6 2xl:p-8"
				>
					<header class="flex items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<h3
								class="min-w-0 truncate text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl"
							>
								{{ state.editingPerson ? "編輯人員" : "新增人員" }}
							</h3>
							<FormChangeIndicator
								v-if="state.ui.hasUnsavedChanges.value"
								:has-changes="state.ui.hasUnsavedChanges.value"
								:changed-fields="state.ui.changedFieldsList.value"
							/>
						</div>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉"
							@click="handleClose"
						>
							&times;
						</button>
					</header>
					<form class="grid grid-cols-2 gap-4 2xl:gap-6" @submit.prevent="handleSubmit">
						<div
							v-if="!hasAccessControlDevices"
							class="col-span-2 rounded-lg border border-white/20 bg-white/5 p-3 text-xs text-white/70 2xl:text-sm"
							role="status"
						>
							尚無可用的門禁設備（請先到設備管理建立 type_code=access_control 的設備）
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>大頭照</p>
							<div class="gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex items-center gap-4">
									<div
										class="flex h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 2xl:h-28 2xl:w-28"
									>
										<img
											v-if="resolvedFaceUrl"
											:src="resolvedFaceUrl"
											alt="大頭照預覽"
											class="h-full w-full object-cover"
										/>
										<div
											v-else
											class="flex h-full w-full items-center justify-center text-2xl text-white/40"
											aria-hidden="true"
										>
											?
										</div>
									</div>

									<div class="flex flex-col gap-3">
										<input
											ref="faceFileInputRef"
											type="file"
											accept="image/*"
											class="hidden"
											aria-label="選擇大頭照"
											@change="handleFaceFileChange"
										/>
										<button
											type="button"
											class="w-full rounded-lg bg-white/20 px-3 py-2 text-sm text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 md:w-auto"
											@click="triggerFaceFileSelect"
										>
											上傳圖片
										</button>
										<button
											v-if="resolvedFaceUrl"
											type="button"
											class="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 md:w-auto"
											@click="handleClearFace"
										>
											清除
										</button>
									</div>
								</div>

								<div class="flex items-center gap-3 pt-3">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localCaptureDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:opacity-50"
										:disabled="
											isCapturingFace || !hasSelectedCaptureDevice || !hasAccessControlDevices
										"
										aria-label="從設備截圖"
										@click="handleCaptureFace"
									>
										{{ isCapturingFace ? "截圖中..." : "截圖" }}
									</button>
								</div>

								<p
									v-if="captureErrorText"
									class="form-error-text-inline"
									role="alert"
									aria-live="polite"
								>
									{{ captureErrorText }}
								</p>
							</div>
						</div>

						<div class="flex flex-col justify-center gap-3">
							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>姓名 *</span>
								<input
									v-model="state.form.fullName"
									type="text"
									required
									class="form-input-small"
								/>
							</label>

							<label class="flex flex-col gap-2 text-base text-white/80">
								<span>ID *</span>
								<input
									v-model="state.form.employeeNo"
									type="text"
									required
									class="form-input-small"
									:readonly="!!state.editingPerson"
									:title="state.editingPerson ? '建立後無法修改 ID' : undefined"
								/>
							</label>
						</div>

						<label class="flex flex-col gap-2 text-base text-white/80">
							<span>密碼設定</span>
							<input
								:value="localPassword"
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								class="form-input-small"
								placeholder="僅數字（4~12 碼）"
								aria-label="門禁密碼"
								@input="handlePasswordInput"
							/>
						</label>

						<label v-if="state.editingPerson" class="flex flex-col gap-2 text-base text-white/80">
							<span>群組</span>
							<FilterDropdown
								v-model="localPersonGroupId"
								:options="childGroupOptions"
								placeholder="未分組"
								text-size="text-sm 2xl:text-base"
							/>
						</label>

						<div class="col-span-2 flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<p>有效期限</p>
							<div class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3">
								<label class="relative inline-flex cursor-pointer items-center">
									<input
										v-model="localIsLongTerm"
										type="checkbox"
										class="peer sr-only"
										aria-label="永久授權：開啟或關閉"
									/>
									<div
										class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-cyan-500 peer-checked:after:translate-x-full peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
									></div>
									<span class="ml-3 text-sm 2xl:text-base">永久授權</span>
								</label>

								<div v-if="!localIsLongTerm" class="grid grid-cols-2 gap-3">
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
										<span>起始日 *</span>
										<input
											v-model="localValidBeginDate"
											type="datetime-local"
											step="60"
											required
											class="form-input-small"
											aria-label="有效期限起始時間（年/月/日/時/分）"
										/>
									</label>
									<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
										<span>結束日 *</span>
										<input
											v-model="localValidEndDate"
											type="datetime-local"
											step="60"
											required
											class="form-input-small"
											aria-label="有效期限結束時間（年/月/日/時/分）"
										/>
									</label>
								</div>
							</div>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="flex items-center justify-between gap-2">
								<p>卡片設定</p>
								<div class="flex items-center gap-2">
									<PersonnelFormItemTabs
										v-model:active-index="activeCardTab"
										:count="state.accessControl.cardItems.value.length"
										:max="MAX_PERSON_CARDS"
										aria-label="卡號"
										@add="handleAddCardTab"
									/>
									<IconTrashButton
										v-if="state.accessControl.cardItems.value.length > 1"
										size="md"
										button-class="flex-shrink-0"
										title="移除目前卡號"
										:aria-label="`移除第 ${activeCardTab + 1} 張卡號`"
										@click="handleRemoveCardTab"
									/>
								</div>
							</div>
							<div class="rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localCardDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 disabled:opacity-50 md:w-auto"
										:disabled="
											isCapturingCard || !hasSelectedCardDevice || !hasAccessControlDevices
										"
										aria-label="從設備讀取卡號"
										@click="handleCaptureCard"
									>
										{{ isCapturingCard ? "讀卡中..." : "讀卡" }}
									</button>
								</div>

								<div v-if="activeCardItem" class="mt-3 flex items-center gap-2">
									<input
										v-model="activeCardItem.cardNo"
										type="text"
										inputmode="numeric"
										class="form-input w-full max-w-[320px] border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:py-2 2xl:text-base"
										:placeholder="`卡號 ${activeCardTab + 1}（可手動輸入）`"
										:aria-label="`第 ${activeCardTab + 1} 張卡號`"
										:readonly="activeCardItem.source === 'virtual'"
									/>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-violet-500/80 px-3 py-2 text-sm text-white hover:bg-violet-400 disabled:opacity-50"
										:disabled="isGeneratingVirtualCard"
										aria-label="生成卡號"
										@click="handleGenerateVirtualCard"
									>
										{{ isGeneratingVirtualCard ? "產生中..." : "生成卡號" }}
									</button>
								</div>

								<p
									v-if="cardErrorText"
									class="form-error-text-inline"
									role="alert"
									aria-live="polite"
								>
									{{ cardErrorText }}
								</p>
							</div>
						</div>

						<div class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<div class="flex items-center justify-between gap-2">
								<p>指紋設定</p>
								<div class="flex items-center gap-2">
									<PersonnelFormItemTabs
										v-model:active-index="activeFingerTab"
										:count="state.accessControl.fingerPrintItems.value.length"
										:max="MAX_PERSON_FINGERPRINTS"
										aria-label="指紋"
										@add="handleAddFingerTab"
									/>
									<IconTrashButton
										v-if="state.accessControl.fingerPrintItems.value.length > 1"
										size="md"
										button-class="flex-shrink-0"
										title="移除目前指紋"
										:aria-label="`移除第 ${activeFingerTab + 1} 筆指紋`"
										@click="handleRemoveFingerTab"
									/>
								</div>
							</div>
							<div class="rounded-xl border border-white/10 bg-white/5 p-3">
								<div class="flex items-center gap-2">
									<div class="w-full md:max-w-[240px]">
										<FilterDropdown
											v-model="localFingerDeviceIdString"
											:options="accessControlDeviceOptions"
											placeholder="選擇門禁設備"
											text-size="text-sm 2xl:text-base"
										/>
									</div>
									<button
										type="button"
										class="whitespace-nowrap rounded-lg bg-cyan-500/80 px-3 py-2 text-sm text-white hover:bg-cyan-400 disabled:opacity-50"
										:disabled="
											isCapturingFingerPrint || !hasSelectedFingerDevice || !hasAccessControlDevices
										"
										aria-label="讀取指紋模板"
										@click="handleCaptureFingerPrint"
									>
										{{ isCapturingFingerPrint ? "讀取中..." : "讀取" }}
									</button>
								</div>
								<div v-if="activeFingerItem" class="mt-3 flex flex-wrap items-center gap-2">
									<input
										v-model="activeFingerItem.fingerData"
										type="text"
										class="form-input w-full border-white/30 bg-white/10 py-1.5 text-sm text-white placeholder:text-white/40 2xl:py-2 2xl:text-base"
										placeholder="指紋模板值"
										:aria-label="`第 ${activeFingerTab + 1} 筆指紋模板值`"
										:readonly="activeFingerItem.source === 'captured'"
									/>
									<span
										v-if="activeFingerItem.source === 'captured'"
										class="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-100"
									>
										讀取
									</span>
								</div>

								<p
									v-if="fingerPrintErrorText"
									class="form-error-text-inline"
									role="alert"
									aria-live="polite"
								>
									{{ fingerPrintErrorText }}
								</p>
							</div>
						</div>

						<div class="col-span-2 flex flex-col gap-3 text-sm text-white/80 2xl:text-base">
							<div class="flex items-center justify-between gap-2">
								<p>車牌設定</p>
								<div class="flex items-center gap-2">
									<PersonnelFormItemTabs
										v-model:active-index="activePlateTab"
										:count="state.form.licensePlateItems.length"
										:max="MAX_PERSON_LICENSE_PLATES"
										aria-label="車牌"
										@add="handleAddPlateTab"
									/>
									<IconTrashButton
										v-if="state.form.licensePlateItems.length > 1"
										size="md"
										button-class="flex-shrink-0"
										title="移除目前車牌"
										:aria-label="`移除第 ${activePlateTab + 1} 筆車牌`"
										@click="handleRemovePlateTab"
									/>
								</div>
							</div>

							<div
								v-if="activePlateItem"
								class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3"
							>
								<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
									<label class="flex flex-col gap-2">
										<span>車牌</span>
										<input
											v-model="activePlateItem.plateNumber"
											type="text"
											class="form-input-small"
											placeholder="例如 ABC1234"
											:aria-label="`第 ${activePlateTab + 1} 筆車牌`"
										/>
									</label>
									<label class="flex flex-col gap-2">
										<span>名單類型</span>
										<FilterDropdown
											v-model="activePlateItem.listType"
											:options="LICENSE_PLATE_LIST_TYPE_OPTIONS"
											placeholder="請選擇名單類型"
											text-size="text-sm 2xl:text-base"
										/>
									</label>
									<label class="flex flex-col gap-2">
										<span>開始時間</span>
										<input
											v-model="activePlateItem.effectiveBegin"
											type="datetime-local"
											step="60"
											class="form-input-small"
											:aria-label="`第 ${activePlateTab + 1} 筆開始時間`"
										/>
									</label>
									<label class="flex flex-col gap-2">
										<span>結束時間</span>
										<input
											v-model="activePlateItem.effectiveEnd"
											type="datetime-local"
											step="60"
											class="form-input-small"
											:aria-label="`第 ${activePlateTab + 1} 筆結束時間`"
										/>
									</label>
								</div>
							</div>
						</div>

						<div class="col-span-2 flex flex-col gap-3 text-sm text-white/80 2xl:text-base">
							<div class="flex items-center justify-between gap-2">
								<p>梯控卡設定</p>
								<div v-if="elevatorLocationOptions.length > 0" class="flex items-center gap-2">
									<PersonnelFormItemTabs
										v-model:active-index="activeLadderTab"
										:count="state.ladderCard.locationItems.value.length"
										unlimited
										aria-label="梯控地點"
										@add="handleAddLadderTab"
									/>
									<IconTrashButton
										v-if="state.ladderCard.locationItems.value.length > 1"
										size="md"
										button-class="flex-shrink-0"
										title="移除目前地點"
										:aria-label="`移除第 ${activeLadderTab + 1} 筆地點`"
										@click="handleRemoveLadderTab"
									/>
								</div>
							</div>

							<div
								v-if="elevatorLocationOptions.length === 0"
								class="rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-4 text-sm text-white/50"
							>
								尚無電梯地點或地點尚未設定樓層，請先於電梯系統區域管理設定。
							</div>

							<div
								v-else-if="activeLadderItem"
								class="space-y-3 rounded-xl border border-white/10 bg-white/5 p-3"
							>
								<label class="flex flex-col gap-2">
									<span>地點</span>
									<FilterDropdown
										v-model="activeLadderItem.locationId"
										:options="ladderLocationOptionsForRow(activeLadderTab)"
										placeholder="選擇電梯地點"
										text-size="text-sm 2xl:text-base"
									/>
								</label>

								<div
									v-if="resolveElevatorLocation(activeLadderItem.locationId)"
									class="flex flex-col gap-2"
								>
									<span>授權樓層</span>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<label
											v-for="floor in buildFloorOptionsForLocation(
												resolveElevatorLocation(activeLadderItem.locationId)!
											)"
											:key="`ladder-floor-${activeLadderItem.locationId}-${floor.index}`"
											class="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/10"
										>
											<input
												type="checkbox"
												class="h-4 w-4 shrink-0 accent-cyan-400"
												:checked="
													isLadderFloorChecked(Number(activeLadderItem.locationId), floor.index)
												"
												:aria-label="`授權樓層 ${floor.label}`"
												@change="
													state.ladderCard.toggleFloor(
														Number(activeLadderItem.locationId),
														floor.index,
														($event.target as HTMLInputElement).checked
													)
												"
											/>
											<span class="text-sm text-white/90">{{ floor.label }}</span>
										</label>
									</div>
								</div>
							</div>
						</div>

						<div
							class="col-span-2 flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base"
						>
							<label class="relative inline-flex cursor-pointer items-center">
								<input
									v-model="state.form.status"
									type="checkbox"
									value="active"
									true-value="active"
									false-value="inactive"
									class="peer sr-only"
									aria-label="狀態：已啟用或已停用"
								/>
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									state.form.status === "active" ? "已啟用" : "已停用"
								}}</span>
							</label>
						</div>

						<p v-if="state.ui.errorMessage" class="form-error-text col-span-2">
							{{ state.ui.errorMessage }}
						</p>

						<footer class="col-span-2 mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="handleClose">取消</button>
							<div class="flex-1"></div>
							<button type="submit" class="btn-primary" :disabled="isSubmitting">
								{{ isSubmitting ? "處理中..." : state.editingPerson ? "更新" : "建立" }}
							</button>
						</footer>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type { PersonnelPersonDialogState, PersonGroup } from "~/types/personnel"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import FormChangeIndicator from "~/components/common/FormChangeIndicator.vue"
import IconTrashButton from "~/components/common/IconTrashButton.vue"
import PersonnelFormItemTabs from "~/components/personnel/PersonnelFormItemTabs.vue"
import { buildPersonnelChildGroupOptions } from "~/utils/personnelGroups"
import {
	createEmptyLicensePlateFormItem,
	LICENSE_PLATE_LIST_TYPE_OPTIONS,
	MAX_PERSON_LICENSE_PLATES,
} from "~/utils/licensePlateFormUtils"
import {
	buildFloorOptionsForLocation,
	createEmptyLadderLocationFormItem,
} from "~/utils/ladderFloorFormUtils"
import { MAX_PERSON_CARDS, createEmptyCardFormItem } from "~/utils/cardFormUtils"
import {
	MAX_PERSON_FINGERPRINTS,
	createEmptyFingerprintFormItem,
} from "~/utils/fingerprintFormUtils"
import { createFormItemTabHandlers } from "~/utils/personnelFormTabUtils"

const props = defineProps<{
	modelValue: boolean
	state: PersonnelPersonDialogState
	groupTree: PersonGroup[]
}>()

const emit = defineEmits<{
	"update:modelValue": [value: boolean]
	submit: []
	"face-file-change": [file: File]
	"clear-face": []
	"capture-face": []
	"capture-card": [tabIndex: number]
	"generate-virtual-card": [tabIndex: number]
	"capture-fingerprint": [tabIndex: number]
}>()

const faceFileInputRef = ref<HTMLInputElement | null>(null)

const activeCardTab = ref(0)
const activeFingerTab = ref(0)
const activeLadderTab = ref(0)
const activePlateTab = ref(0)

const {
	activeItem: activeCardItem,
	handleAdd: handleAddCardTab,
	handleRemove: handleRemoveCardTab,
} = createFormItemTabHandlers(props.state.accessControl.cardItems, activeCardTab, {
	max: MAX_PERSON_CARDS,
	createEmpty: createEmptyCardFormItem,
	onClearLastItem: () => {
		props.state.accessControl.cardItems.value[0] = createEmptyCardFormItem()
	},
})

const {
	activeItem: activeFingerItem,
	handleAdd: handleAddFingerTab,
	handleRemove: handleRemoveFingerTab,
} = createFormItemTabHandlers(props.state.accessControl.fingerPrintItems, activeFingerTab, {
	max: MAX_PERSON_FINGERPRINTS,
	createEmpty: createEmptyFingerprintFormItem,
	onClearLastItem: () => {
		props.state.accessControl.fingerPrintItems.value[0] = createEmptyFingerprintFormItem()
	},
})

const licensePlateItems = toRef(props.state.form, "licensePlateItems")

const {
	activeItem: activePlateItem,
	handleAdd: handleAddPlateTab,
	handleRemove: handleRemovePlateTab,
} = createFormItemTabHandlers(licensePlateItems, activePlateTab, {
	max: MAX_PERSON_LICENSE_PLATES,
	createEmpty: createEmptyLicensePlateFormItem,
})

const {
	activeItem: activeLadderItem,
	handleAdd: handleAddLadderTab,
	handleRemove: handleRemoveLadderTab,
} = createFormItemTabHandlers(props.state.ladderCard.locationItems, activeLadderTab, {
	createEmpty: createEmptyLadderLocationFormItem,
	onAdd: () => props.state.ladderCard.addLocationRow(),
	onRemove: (index) => props.state.ladderCard.removeLocationRow(index),
	onClearLastItem: () => {
		props.state.ladderCard.locationItems.value[0] = createEmptyLadderLocationFormItem()
	},
})

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		activeCardTab.value = 0
		activeFingerTab.value = 0
		activeLadderTab.value = 0
		activePlateTab.value = 0
	}
)

const childGroupOptions = computed(() => buildPersonnelChildGroupOptions(props.groupTree || []))

const localPersonGroupId = computed<string>({
	get: () => props.state.form.personGroupId || "",
	set: (v) => {
		props.state.form.personGroupId = v
	},
})

const resolvedFaceUrl = computed(() => {
	const url = props.state.ui.facePreviewUrl.value || props.state.form.faceUrl || null
	if (!url) return null
	const trimmed = String(url).trim()
	return trimmed ? trimmed : null
})

const hasAccessControlDevices = computed(
	() =>
		Array.isArray(props.state.accessControl.accessControlDevices.value) &&
		props.state.accessControl.accessControlDevices.value.length > 0
)

const isCapturingFace = computed(() => Boolean(props.state.capture.isCapturingFace.value))
const isCapturingCard = computed(() => Boolean(props.state.capture.isCapturingCard.value))
const isCapturingFingerPrint = computed(() =>
	Boolean(props.state.capture.isCapturingFingerPrint.value)
)
const isSubmitting = computed(() => Boolean(props.state.ui.isSubmitting.value))

const captureErrorText = computed(
	() => (props.state.capture.captureErrorMessage.value || "").trim() || null
)
const cardErrorText = computed(
	() => (props.state.capture.cardErrorMessage.value || "").trim() || null
)

const accessControlDeviceOptions = computed(() => {
	return (props.state.accessControl.accessControlDevices.value || []).map((d) => ({
		value: String(d.id),
		label: d.name,
	}))
})

const localCaptureDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.captureDeviceId.value == null
			? ""
			: String(props.state.capture.captureDeviceId.value),
	set: (v) => (props.state.capture.captureDeviceId.value = v ? Number(v) : null),
})

const hasSelectedCaptureDevice = computed(() => props.state.capture.captureDeviceId.value != null)

const localCardDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.cardDeviceId.value == null
			? ""
			: String(props.state.capture.cardDeviceId.value),
	set: (v) => (props.state.capture.cardDeviceId.value = v ? Number(v) : null),
})

const hasSelectedCardDevice = computed(() => props.state.capture.cardDeviceId.value != null)

const isGeneratingVirtualCard = computed(() => props.state.capture.isGeneratingVirtualCard.value)

const handleCaptureCard = () => {
	emit("capture-card", activeCardTab.value)
}

const handleGenerateVirtualCard = () => {
	emit("generate-virtual-card", activeCardTab.value)
}

const handleCaptureFingerPrint = () => {
	emit("capture-fingerprint", activeFingerTab.value)
}

const elevatorLocationOptions = computed(
	() => props.state.ladderCard.elevatorLocationOptions.value || []
)

const resolveElevatorLocation = (locationId: string) => {
	const id = Number(locationId)
	if (!Number.isFinite(id) || id <= 0) return null
	return elevatorLocationOptions.value.find((loc) => loc.id === id) ?? null
}

const usedLadderLocationIds = (excludeRowIndex: number) => {
	const used = new Set<string>()
	for (let i = 0; i < props.state.ladderCard.locationItems.value.length; i++) {
		if (i === excludeRowIndex) continue
		const id = props.state.ladderCard.locationItems.value[i]?.locationId?.trim()
		if (id) used.add(id)
	}
	return used
}

const ladderLocationOptionsForRow = (rowIndex: number) => {
	const used = usedLadderLocationIds(rowIndex)
	return elevatorLocationOptions.value
		.filter((loc) => !used.has(String(loc.id)))
		.map((loc) => ({
			value: String(loc.id),
			label: `${loc.zoneName} / ${loc.name}`,
		}))
}

const isLadderFloorChecked = (locationId: number, floorIndex: number) =>
	props.state.ladderCard.isFloorChecked(locationId, floorIndex)

const localFingerDeviceIdString = computed<string>({
	get: () =>
		props.state.capture.fingerDeviceId.value == null
			? ""
			: String(props.state.capture.fingerDeviceId.value),
	set: (v) => (props.state.capture.fingerDeviceId.value = v ? Number(v) : null),
})

const hasSelectedFingerDevice = computed(() => props.state.capture.fingerDeviceId.value != null)

const localPassword = computed<string>({
	get: () => props.state.accessControl.password.value || "",
	set: (v) => (props.state.accessControl.password.value = v),
})

const handlePasswordInput = (e: Event) => {
	const input = e.target as HTMLInputElement | null
	if (!input) return
	const next = String(input.value || "").replace(/\D+/g, "")
	if (next !== input.value) input.value = next
	localPassword.value = next
}

const localIsLongTerm = computed<boolean>({
	get: () => Boolean(props.state.accessControl.isLongTerm.value),
	set: (v) => (props.state.accessControl.isLongTerm.value = Boolean(v)),
})

const localValidBeginDate = computed<string>({
	get: () => props.state.accessControl.validBeginDate.value || "",
	set: (v) => (props.state.accessControl.validBeginDate.value = v),
})

const localValidEndDate = computed<string>({
	get: () => props.state.accessControl.validEndDate.value || "",
	set: (v) => (props.state.accessControl.validEndDate.value = v),
})

const fingerPrintErrorText = computed(
	() => (props.state.capture.fingerPrintErrorMessage.value || "").trim() || null
)

const handleClose = () => props.state.ui.requestClose()
const handleSubmit = () => emit("submit")
const triggerFaceFileSelect = () => faceFileInputRef.value?.click()
const handleCaptureFace = () => emit("capture-face")

const handleFaceFileChange = (e: Event) => {
	const input = e.target as HTMLInputElement
	const file = input.files?.[0]
	if (file) emit("face-file-change", file)
	input.value = ""
}

const handleClearFace = () => emit("clear-face")

watch(
	() => props.modelValue,
	(open) => {
		if (open) return
		if (faceFileInputRef.value) faceFileInputRef.value.value = ""
	}
)
</script>
