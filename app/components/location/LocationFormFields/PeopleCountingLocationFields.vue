<template>
	<div class="flex min-w-0 flex-1 flex-col gap-3">
		<!-- 基本資訊 -->
		<div class="flex min-w-0 flex-col gap-3">
			<label :class="fieldLabelClass">
				<span>地點名稱<span class="required-mark">*</span></span>
				<input
					v-model="localLocation.name"
					type="text"
					required
					class="form-input-small"
					placeholder="例如：工地A、工地B"
					@input="handleChange"
				/>
			</label>

			<span class="text-sm font-medium text-white/80 2xl:text-base"
				>資料來源<span class="required-mark">*</span></span
			>
			<div class="flex flex-wrap gap-4">
				<label v-if="enableYscpPeopleCounting" class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="yscp"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">YSCP 資料庫（出入口設備）</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="access_control"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">門禁設備</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						v-model="dataSource"
						type="radio"
						value="isapi_camera"
						class="h-4 w-4 accent-cyan-400"
						@change="handleDataSourceChange"
					/>
					<span class="text-sm text-white/90 2xl:text-base">攝影機人流</span>
				</label>
			</div>
		</div>

		<!-- YSCP：入口／出口設備 -->
		<div v-if="dataSource === 'yscp'" class="mt-3 border-t border-white/10 pt-3">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div :class="fieldLabelClass">
					<span>入口設備（可複選）<span class="required-mark">*</span></span>
					<div v-if="props.doors.length === 0" :class="emptyHintClass">無可用門設備</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="door in props.doors"
							:key="`entry-${door.id}`"
							:class="[
								selectCardBaseClass,
								isDoorSelected('entry', door.id) && selectCardSelectedClass,
								isDoorOverlapped(door.id) && selectCardOverlapClass,
							]"
						>
							<div
								v-if="isDoorOverlapped(door.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isDoorSelected('entry', door.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleDoor('entry', door.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ door.dev_name }}</span>
						</label>
					</div>
				</div>

				<div :class="fieldLabelClass">
					<span>出口設備（可複選）<span class="required-mark">*</span></span>
					<div v-if="props.doors.length === 0" :class="emptyHintClass">無可用門設備</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="door in props.doors"
							:key="`exit-${door.id}`"
							:class="[
								selectCardBaseClass,
								isDoorSelected('exit', door.id) && selectCardSelectedClass,
								isDoorOverlapped(door.id) && selectCardOverlapClass,
							]"
						>
							<div
								v-if="isDoorOverlapped(door.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isDoorSelected('exit', door.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleDoor('exit', door.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ door.dev_name }}</span>
						</label>
					</div>
					<p v-if="props.doors.length > 0 && !hasExitSelected" :class="warnHintClass">
						至少需要選擇一個出口設備
					</p>
				</div>
			</div>
		</div>

		<!-- 門禁設備：入口／出口設備（本系統） -->
		<div v-else-if="dataSource === 'access_control'" class="mt-3 border-t border-white/10 pt-3">
			<p class="mb-3 text-xs text-white/60 2xl:text-sm">
				人員群組依名單內人員自動顯示；請至門禁管理維護地點名單與設備同步。
			</p>
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div :class="fieldLabelClass">
					<span>入口設備（可複選）<span class="required-mark">*</span></span>
					<div v-if="props.accessControlDevices.length === 0" :class="emptyHintClass">
						請先在設備管理新增門禁設備
					</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="dev in props.accessControlDevices"
							:key="`ac-entry-${dev.id}`"
							:class="[
								selectCardBaseClass,
								isAccessControlSelected('entry', dev.id) && selectCardSelectedClass,
								isAccessControlOverlapped(dev.id) && selectCardOverlapClass,
							]"
						>
							<div
								v-if="isAccessControlOverlapped(dev.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isAccessControlSelected('entry', dev.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleAccessControl('entry', dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
				</div>

				<div :class="fieldLabelClass">
					<span>出口設備（可複選）<span class="required-mark">*</span></span>
					<div v-if="props.accessControlDevices.length === 0" :class="emptyHintClass">
						請先在設備管理新增門禁設備
					</div>
					<div v-else class="grid grid-cols-2 gap-2">
						<label
							v-for="dev in props.accessControlDevices"
							:key="`ac-exit-${dev.id}`"
							:class="[
								selectCardBaseClass,
								isAccessControlSelected('exit', dev.id) && selectCardSelectedClass,
								isAccessControlOverlapped(dev.id) && selectCardOverlapClass,
							]"
						>
							<div
								v-if="isAccessControlOverlapped(dev.id)"
								class="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-rose-500"
								title="入口與出口請勿選擇同一設備"
							>
								<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<input
								type="checkbox"
								:checked="isAccessControlSelected('exit', dev.id)"
								class="h-4 w-4 cursor-pointer accent-cyan-400"
								@change="handleToggleAccessControl('exit', dev.id)"
							/>
							<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
						</label>
					</div>
					<p
						v-if="props.accessControlDevices.length > 0 && !hasExitSelected"
						:class="warnHintClass"
					>
						至少需要選擇一個出口設備
					</p>
				</div>
			</div>

			<div v-if="canUseEventCameraLinkage" class="mt-3 border-t border-white/10 pt-3">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label :class="fieldLabelClass">
						<span>入口調閱攝影機</span>
						<FilterDropdown
							v-model="entryEventCameraSelect"
							:options="eventCameraDeviceOptions"
							placeholder="不設定"
							text-size="text-sm 2xl:text-base"
						/>
					</label>
					<label :class="fieldLabelClass">
						<span>出口調閱攝影機</span>
						<FilterDropdown
							v-model="exitEventCameraSelect"
							:options="eventCameraDeviceOptions"
							placeholder="不設定"
							text-size="text-sm 2xl:text-base"
						/>
					</label>
				</div>
			</div>
		</div>

		<!-- 攝影機人流（ISAPI PeopleCounting）：channel 固定由後端設定為 1，不提供欄位 -->

		<div v-if="dataSource === 'yscp'" class="mt-3 border-t border-white/10 pt-3">
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base"
					>人員群組<span class="required-mark">*</span></span
				>
			</div>
			<div
				v-if="personGroups.length === 0"
				class="py-2 text-center text-xs text-white/50 2xl:text-sm"
			>
				載入中...
			</div>
			<div v-else class="grid grid-cols-2 gap-2">
				<label
					v-for="group in personGroups"
					:key="group.id"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
					:class="{
						'border-cyan-400/50 bg-cyan-500/20': isPersonGroupSelected(group.id),
					}"
				>
					<input
						type="checkbox"
						:checked="isPersonGroupSelected(group.id)"
						@change="togglePersonGroup(group.id)"
						class="h-4 w-4 cursor-pointer accent-cyan-400"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">{{ group.name }}</span>
				</label>
			</div>
			<p
				v-if="
					(!localLocation.personGroupIds || localLocation.personGroupIds.length === 0) &&
					personGroups.length > 0
				"
				class="mt-2 text-xs text-amber-300 2xl:text-sm"
			>
				至少需要選擇一個人員群組
			</p>
		</div>

		<div v-else-if="dataSource === 'isapi_camera'" class="mt-3 border-t border-white/10 pt-3">
			<p class="mb-3 text-xs text-white/60 2xl:text-sm">
				「人流統計」顯示設備分區進／出；「人臉辨識」以進場／出場攝影機決定方向，並可至門禁管理同步臉庫。
			</p>
			<div class="mb-3">
				<span class="text-sm font-medium text-white/80 2xl:text-base"
					>攝影機用途<span class="required-mark">*</span></span
				>
				<div class="mt-2 grid grid-cols-2 gap-2">
					<label
						v-for="mode in CAMERA_MODE_OPTIONS"
						:key="mode.value"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
						:class="{
							'border-cyan-400/50 bg-cyan-500/20': cameraMode === mode.value,
						}"
					>
						<input
							v-model="cameraMode"
							type="radio"
							name="people-counting-camera-mode"
							:value="mode.value"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleCameraModeChange"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ mode.label }}</span>
					</label>
				</div>
			</div>

			<template v-if="isFaceMode">
				<label :class="[fieldLabelClass, 'max-w-xs']">
					<span>人臉比對準確度下限（%）<span class="required-mark">*</span></span>
					<input
						v-model.number="faceSimilarityThresholdInput"
						type="number"
						min="0"
						max="100"
						step="1"
						required
						class="form-input-small"
						placeholder="50"
						@input="handleChange"
					/>
					<span class="text-xs text-white/50">未達此準確度的事件將標為失敗，不計入進出統計</span>
				</label>

				<div class="mb-3 mt-3">
					<span class="text-sm font-medium text-white/80 2xl:text-base"
						>進場攝影機（可複選）<span class="required-mark">*</span></span
					>
				</div>
				<div
					v-if="isapiCameraDevices.length === 0"
					class="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
				>
					請先在設備管理新增支援 ISAPI 的攝影機
				</div>
				<div v-else class="mb-3 grid grid-cols-2 gap-2">
					<label
						v-for="dev in isapiCameraDevices"
						:key="`entry-cam-${dev.id}`"
						:class="[
							selectCardBaseClass,
							isFaceCameraSelected('entry', dev.id) ? selectCardSelectedClass : '',
							isFaceCameraOverlapped(dev.id) ? selectCardOverlapClass : '',
						]"
					>
						<input
							type="checkbox"
							:checked="isFaceCameraSelected('entry', dev.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleFaceCamera('entry', dev.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
					</label>
				</div>
				<p v-if="isapiCameraDevices.length > 0 && !hasFaceEntryCamera" :class="warnHintClass">
					至少需要選擇一台進場攝影機
				</p>

				<div class="mb-3 mt-3">
					<span class="text-sm font-medium text-white/80 2xl:text-base"
						>出場攝影機（可複選）<span class="required-mark">*</span></span
					>
				</div>
				<div v-if="isapiCameraDevices.length > 0" class="grid grid-cols-2 gap-2">
					<label
						v-for="dev in isapiCameraDevices"
						:key="`exit-cam-${dev.id}`"
						:class="[
							selectCardBaseClass,
							isFaceCameraSelected('exit', dev.id) ? selectCardSelectedClass : '',
							isFaceCameraOverlapped(dev.id) ? selectCardOverlapClass : '',
						]"
					>
						<input
							type="checkbox"
							:checked="isFaceCameraSelected('exit', dev.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleFaceCamera('exit', dev.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
					</label>
				</div>
				<p v-if="isapiCameraDevices.length > 0 && !hasFaceExitCamera" :class="warnHintClass">
					至少需要選擇一台出場攝影機
				</p>
				<div v-if="hasFaceCameraOverlap" :class="dangerHintClass">進場與出場請勿選擇同一攝影機</div>
			</template>

			<template v-else>
				<div class="mb-3">
					<span class="text-sm font-medium text-white/80 2xl:text-base"
						>攝影機設備（可複選）<span class="required-mark">*</span></span
					>
				</div>
				<div
					v-if="isapiCameraDevices.length === 0"
					class="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
				>
					請先在設備管理新增支援 ISAPI 的攝影機
				</div>
				<div v-else class="grid grid-cols-2 gap-2">
					<label
						v-for="dev in isapiCameraDevices"
						:key="dev.id"
						class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
						:class="{
							'border-cyan-400/50 bg-cyan-500/20': isCameraSelected(dev.id),
						}"
					>
						<input
							type="checkbox"
							:checked="isCameraSelected(dev.id)"
							class="h-4 w-4 cursor-pointer accent-cyan-400"
							@change="handleToggleCamera(dev.id)"
						/>
						<span class="text-xs text-white/90 2xl:text-sm">{{ dev.name }}</span>
					</label>
				</div>
				<p
					v-if="isapiCameraDevices.length > 0 && !hasSelectedCamera"
					class="mt-2 text-xs text-amber-300 2xl:text-sm"
				>
					至少需要選擇一台攝影機設備
				</p>
			</template>
		</div>

		<div class="mt-3 border-t border-white/10 pt-3">
			<span class="text-sm font-medium text-white/80 2xl:text-base">進出紀錄顯示欄位</span>
			<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
				<label
					v-for="colKey in TOGGLEABLE_LOG_COLUMN_KEYS"
					:key="colKey"
					class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 px-2 py-1.5 transition-colors hover:bg-white/10"
					:class="{ 'border-cyan-400/50 bg-cyan-500/15': isLogColumnSelected(colKey) }"
				>
					<input
						type="checkbox"
						class="h-4 w-4 accent-cyan-400"
						:checked="isLogColumnSelected(colKey)"
						@change="handleToggleLogColumn(colKey)"
					/>
					<span class="text-xs text-white/90 2xl:text-sm">
						{{ PEOPLE_COUNTING_LOG_COLUMN_LABELS[colKey] }}
					</span>
				</label>
			</div>
		</div>

		<!-- 警告提示 -->
		<div
			v-if="dataSource !== 'isapi_camera' && (hasDoorOverlap || hasAccessControlOverlap)"
			:class="dangerHintClass"
		>
			入口與出口請勿選擇同一設備
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PeopleCountingLocation } from "~/types/peopleCounting"
import type { Device } from "~/types/device"
import {
	PEOPLE_COUNTING_LOG_COLUMN_LABELS,
	TOGGLEABLE_LOG_COLUMN_KEYS,
	normalizeLogDisplayColumns,
	type PeopleCountingLogColumnKey,
	toStoredLogDisplayColumns,
} from "~/utils/peopleCountingLogColumns"
import {
	PEOPLE_COUNTING_CAMERA_MODE,
	PEOPLE_COUNTING_CAMERA_MODE_LABELS,
	normalizePeopleCountingCameraMode,
	type PeopleCountingCameraMode,
} from "~/utils/peopleCountingCameraMode"
import { useModuleRegistry } from "~/composables/core/useModuleRegistry"
import { useLicense } from "~/composables/core/useLicense"
import { storedPeopleCountingDataSource } from "~/utils/peopleCountingDataSource"
import {
	normalizeFaceSimilarityThreshold,
} from "~/utils/peopleCountingFaceThreshold"
import FilterDropdown from "~/components/common/FilterDropdown.vue"

const CAMERA_MODE_OPTIONS: Array<{ value: PeopleCountingCameraMode; label: string }> = [
	{
		value: PEOPLE_COUNTING_CAMERA_MODE.PEOPLE_COUNTING,
		label: PEOPLE_COUNTING_CAMERA_MODE_LABELS.people_counting,
	},
	{
		value: PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION,
		label: PEOPLE_COUNTING_CAMERA_MODE_LABELS.face_recognition,
	},
]

interface PersonGroup {
	id: number
	name: string
	is_deleted?: number
}

interface Door {
	id: number
	device_id: number
	dev_name: string
	door_index: number
	is_deleted?: number
}

interface Props {
	location: PeopleCountingLocation
	personGroups?: PersonGroup[]
	doors?: Door[]
	accessControlDevices?: Device[]
	isapiCameraDevices?: Device[]
	surveillanceCameraDevices?: Device[]
}

interface Emits {
	(e: "update", location: PeopleCountingLocation): void
}

const props = withDefaults(defineProps<Props>(), {
	personGroups: () => [],
	doors: () => [],
	accessControlDevices: () => [],
	isapiCameraDevices: () => [],
	surveillanceCameraDevices: () => [],
})

const emit = defineEmits<Emits>()

const { enableYscpPeopleCounting } = useModuleRegistry()
const { hasFeature } = useLicense()
const canUseEventCameraLinkage = computed(
	() => hasFeature("surveillance") && dataSource.value === "access_control"
)

const eventCameraDeviceOptions = computed(() => [
	{ value: "", label: "不設定" },
	...props.surveillanceCameraDevices.map((dev) => ({
		value: String(dev.id),
		label: dev.name?.trim() || `設備 #${dev.id}`,
	})),
])

const toEventCameraSelectValue = (id: number | null | undefined): string => {
	if (id == null || !Number.isFinite(Number(id)) || Number(id) <= 0) return ""
	return String(Math.trunc(Number(id)))
}

const entryEventCameraSelect = computed({
	get: () => toEventCameraSelectValue(localLocation.value.entryEventCameraDeviceId),
	set: (raw: string) => {
		localLocation.value.entryEventCameraDeviceId = parseEventCameraSelect(raw)
		handleChange()
	},
})

const exitEventCameraSelect = computed({
	get: () => toEventCameraSelectValue(localLocation.value.exitEventCameraDeviceId),
	set: (raw: string) => {
		localLocation.value.exitEventCameraDeviceId = parseEventCameraSelect(raw)
		handleChange()
	},
})

const localLocation = ref<PeopleCountingLocation>({ ...props.location })

const fieldLabelClass =
	"flex min-w-0 flex-1 flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base"
const emptyHintClass =
	"rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 2xl:text-sm"
const selectCardBaseClass =
	"relative flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 pr-10 transition-colors hover:bg-white/10"
const selectCardSelectedClass = "border-cyan-400/50 bg-cyan-500/20"
const selectCardOverlapClass =
	"border-rose-500 bg-rose-500/15 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]"
const dangerHintClass =
	"mt-3 rounded border border-rose-500/60 bg-rose-500/15 p-2 text-xs text-rose-200 2xl:text-sm"
const warnHintClass = "mt-2 text-xs text-amber-300 2xl:text-sm"
const dataSource = ref(storedPeopleCountingDataSource(props.location.dataSource))
const cameraMode = ref<PeopleCountingCameraMode>(
	normalizePeopleCountingCameraMode(props.location.cameraMode)
)

const activeLogColumns = computed(() =>
	normalizeLogDisplayColumns(localLocation.value.logDisplayColumns)
)

const isLogColumnSelected = (key: PeopleCountingLogColumnKey): boolean =>
	activeLogColumns.value.includes(key)

const handleToggleLogColumn = (key: PeopleCountingLogColumnKey) => {
	const next = new Set(activeLogColumns.value)
	if (next.has(key)) next.delete(key)
	else next.add(key)
	localLocation.value.logDisplayColumns = toStoredLogDisplayColumns(
		normalizeLogDisplayColumns([...next])
	)
	handleChange()
}

const getEffectiveCameraDeviceIds = (): number[] => {
	return Array.isArray(localLocation.value.cameraDeviceIds)
		? localLocation.value.cameraDeviceIds
		: []
}

const getEffectiveEntryCameraDeviceIds = (): number[] => {
	const entry = Array.isArray(localLocation.value.entryCameraDeviceIds)
		? localLocation.value.entryCameraDeviceIds
		: []
	if (entry.length > 0) return entry
	// 舊資料：僅有 cameraDeviceIds 時視為進場
	if (cameraMode.value === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION) {
		return getEffectiveCameraDeviceIds()
	}
	return []
}

const getEffectiveExitCameraDeviceIds = (): number[] => {
	return Array.isArray(localLocation.value.exitCameraDeviceIds)
		? localLocation.value.exitCameraDeviceIds
		: []
}

const isFaceMode = computed(() => cameraMode.value === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION)

const faceSimilarityThresholdInput = computed({
	get: () =>
		normalizeFaceSimilarityThreshold(localLocation.value.faceSimilarityThreshold),
	set: (raw: number) => {
		localLocation.value.faceSimilarityThreshold = normalizeFaceSimilarityThreshold(raw)
	},
})

const hasSelectedCamera = computed(() => getEffectiveCameraDeviceIds().length > 0)
const hasFaceEntryCamera = computed(() => getEffectiveEntryCameraDeviceIds().length > 0)
const hasFaceExitCamera = computed(() => getEffectiveExitCameraDeviceIds().length > 0)

const faceCameraOverlapSet = computed(() => {
	const entry = new Set(getEffectiveEntryCameraDeviceIds())
	const exit = new Set(getEffectiveExitCameraDeviceIds())
	const overlap = new Set<number>()
	for (const id of entry) {
		if (exit.has(id)) overlap.add(id)
	}
	return overlap
})
const hasFaceCameraOverlap = computed(() => faceCameraOverlapSet.value.size > 0)
const isFaceCameraOverlapped = (deviceId: number): boolean =>
	faceCameraOverlapSet.value.has(Number(deviceId))

const isFaceCameraSelected = (role: "entry" | "exit", deviceId: number): boolean => {
	const ids =
		role === "entry" ? getEffectiveEntryCameraDeviceIds() : getEffectiveExitCameraDeviceIds()
	return ids.includes(deviceId)
}

const handleToggleFaceCamera = (role: "entry" | "exit", deviceId: number) => {
	const key = role === "entry" ? "entryCameraDeviceIds" : "exitCameraDeviceIds"
	const current =
		role === "entry"
			? [...getEffectiveEntryCameraDeviceIds()]
			: [...getEffectiveExitCameraDeviceIds()]
	const idx = current.indexOf(deviceId)
	if (idx >= 0) current.splice(idx, 1)
	else current.push(deviceId)
	localLocation.value[key] = current
	localLocation.value.cameraDeviceIds = undefined
	handleChange()
}

const isPersonGroupSelected = (groupId: number): boolean => {
	return localLocation.value.personGroupIds?.includes(groupId) || false
}

const togglePersonGroup = (groupId: number) => {
	if (!localLocation.value.personGroupIds) {
		localLocation.value.personGroupIds = []
	}
	const index = localLocation.value.personGroupIds.indexOf(groupId)
	if (index > -1) {
		localLocation.value.personGroupIds.splice(index, 1)
	} else {
		localLocation.value.personGroupIds.push(groupId)
	}
	handleChange()
}

const handleDataSourceChange = () => {
	localLocation.value.dataSource = dataSource.value
	if (dataSource.value === "access_control") {
		localLocation.value.entryDoorIds = []
		localLocation.value.exitDoorIds = []
		localLocation.value.cameraDeviceIds = undefined
		localLocation.value.preferRegion = undefined
		localLocation.value.cameraMode = undefined
		cameraMode.value = PEOPLE_COUNTING_CAMERA_MODE.PEOPLE_COUNTING
		if (!Array.isArray(localLocation.value.entryDeviceIds)) localLocation.value.entryDeviceIds = []
		if (!Array.isArray(localLocation.value.exitDeviceIds)) localLocation.value.exitDeviceIds = []
	} else if (dataSource.value === "isapi_camera") {
		localLocation.value.entryEventCameraDeviceId = undefined
		localLocation.value.exitEventCameraDeviceId = undefined
		localLocation.value.personGroupIds = []
		localLocation.value.entryDoorIds = []
		localLocation.value.exitDoorIds = []
		localLocation.value.entryDeviceIds = []
		localLocation.value.exitDeviceIds = []
		if (!Array.isArray(localLocation.value.cameraDeviceIds)) {
			localLocation.value.cameraDeviceIds = []
		}
		if (!Array.isArray(localLocation.value.entryCameraDeviceIds)) {
			localLocation.value.entryCameraDeviceIds = []
		}
		if (!Array.isArray(localLocation.value.exitCameraDeviceIds)) {
			localLocation.value.exitCameraDeviceIds = []
		}
		localLocation.value.preferRegion = true
		cameraMode.value = normalizePeopleCountingCameraMode(localLocation.value.cameraMode)
		localLocation.value.cameraMode = cameraMode.value
	} else {
		localLocation.value.entryDeviceIds = []
		localLocation.value.exitDeviceIds = []
		localLocation.value.entryEventCameraDeviceId = undefined
		localLocation.value.exitEventCameraDeviceId = undefined
		localLocation.value.cameraDeviceIds = undefined
		localLocation.value.preferRegion = undefined
		localLocation.value.cameraMode = undefined
		cameraMode.value = PEOPLE_COUNTING_CAMERA_MODE.PEOPLE_COUNTING
		if (!Array.isArray(localLocation.value.entryDoorIds)) localLocation.value.entryDoorIds = []
		if (!Array.isArray(localLocation.value.exitDoorIds)) localLocation.value.exitDoorIds = []
	}
	handleChange()
}

const handleCameraModeChange = () => {
	localLocation.value.cameraMode = cameraMode.value
	if (cameraMode.value === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION) {
		const legacy = getEffectiveCameraDeviceIds()
		if (
			(!Array.isArray(localLocation.value.entryCameraDeviceIds) ||
				localLocation.value.entryCameraDeviceIds.length === 0) &&
			legacy.length > 0
		) {
			localLocation.value.entryCameraDeviceIds = [...legacy]
		}
		if (!Array.isArray(localLocation.value.exitCameraDeviceIds)) {
			localLocation.value.exitCameraDeviceIds = []
		}
		localLocation.value.cameraDeviceIds = undefined
	} else {
		localLocation.value.faceSimilarityThreshold = undefined
		const union = [
			...new Set([
				...getEffectiveEntryCameraDeviceIds(),
				...getEffectiveExitCameraDeviceIds(),
				...getEffectiveCameraDeviceIds(),
			]),
		]
		localLocation.value.cameraDeviceIds = union
		localLocation.value.entryCameraDeviceIds = undefined
		localLocation.value.exitCameraDeviceIds = undefined
	}
	handleChange()
}

watch(
	() => [props.location, enableYscpPeopleCounting.value] as const,
	([newLocation]) => {
		localLocation.value = { ...newLocation }
		const normalized = normalizeLogDisplayColumns(localLocation.value.logDisplayColumns)
		localLocation.value.logDisplayColumns = toStoredLogDisplayColumns(normalized)
		if (!localLocation.value.personGroupIds) localLocation.value.personGroupIds = []
		if (!Array.isArray(localLocation.value.entryDoorIds)) localLocation.value.entryDoorIds = []
		if (!Array.isArray(localLocation.value.exitDoorIds)) localLocation.value.exitDoorIds = []
		if (!Array.isArray(localLocation.value.entryDeviceIds)) localLocation.value.entryDeviceIds = []
		if (!Array.isArray(localLocation.value.exitDeviceIds)) localLocation.value.exitDeviceIds = []
		if (
			(newLocation.dataSource as string) === "isapi_camera" &&
			!Array.isArray(localLocation.value.cameraDeviceIds)
		) {
			localLocation.value.cameraDeviceIds = []
		}
		if (!Array.isArray(localLocation.value.entryCameraDeviceIds)) {
			localLocation.value.entryCameraDeviceIds = []
		}
		if (!Array.isArray(localLocation.value.exitCameraDeviceIds)) {
			localLocation.value.exitCameraDeviceIds = []
		}
		const next = storedPeopleCountingDataSource(newLocation.dataSource)
		dataSource.value = next
		localLocation.value.dataSource = next
		if ((newLocation.dataSource as string) === "isapi_camera") {
			localLocation.value.preferRegion = true
			cameraMode.value = normalizePeopleCountingCameraMode(newLocation.cameraMode)
			localLocation.value.cameraMode = cameraMode.value
			if (cameraMode.value === PEOPLE_COUNTING_CAMERA_MODE.FACE_RECOGNITION) {
				const entry = Array.isArray(newLocation.entryCameraDeviceIds)
					? newLocation.entryCameraDeviceIds
					: []
				const legacy = Array.isArray(newLocation.cameraDeviceIds) ? newLocation.cameraDeviceIds : []
				localLocation.value.entryCameraDeviceIds = entry.length > 0 ? entry : [...legacy]
				localLocation.value.exitCameraDeviceIds = Array.isArray(newLocation.exitCameraDeviceIds)
					? newLocation.exitCameraDeviceIds
					: []
				localLocation.value.cameraDeviceIds = undefined
			}
		} else {
			cameraMode.value = PEOPLE_COUNTING_CAMERA_MODE.PEOPLE_COUNTING
			localLocation.value.cameraMode = undefined
		}
	},
	{ immediate: true, deep: true }
)

const normalizeIdList = (value: number[] | undefined): number[] => {
	if (!Array.isArray(value)) return []
	return value
		.map((v) => Number(v))
		.filter((n) => Number.isFinite(n) && n > 0)
		.map((n) => Math.trunc(n))
}

const normalizedEntryDoorIds = computed(() => normalizeIdList(localLocation.value.entryDoorIds))
const normalizedExitDoorIds = computed(() => normalizeIdList(localLocation.value.exitDoorIds))
const normalizedEntryDeviceIds = computed(() => normalizeIdList(localLocation.value.entryDeviceIds))
const normalizedExitDeviceIds = computed(() => normalizeIdList(localLocation.value.exitDeviceIds))

const doorOverlapSet = computed(() => {
	const entry = new Set(normalizedEntryDoorIds.value)
	const exit = new Set(normalizedExitDoorIds.value)
	const overlap = new Set<number>()
	for (const id of entry) {
		if (exit.has(id)) overlap.add(id)
	}
	return overlap
})

const hasDoorOverlap = computed(() => doorOverlapSet.value.size > 0)

const isDoorOverlapped = (doorId: number): boolean => {
	return doorOverlapSet.value.has(Number(doorId))
}

const isDoorSelected = (role: "entry" | "exit", doorId: number): boolean => {
	const ids = role === "entry" ? normalizedEntryDoorIds.value : normalizedExitDoorIds.value
	return ids.includes(doorId)
}

const handleToggleDoor = (role: "entry" | "exit", doorId: number) => {
	const key = role === "entry" ? "entryDoorIds" : "exitDoorIds"
	const current =
		role === "entry" ? [...normalizedEntryDoorIds.value] : [...normalizedExitDoorIds.value]
	const idx = current.indexOf(doorId)
	if (idx >= 0) current.splice(idx, 1)
	else current.push(doorId)
	localLocation.value[key] = current
	handleChange()
}

const isAccessControlSelected = (role: "entry" | "exit", deviceId: number): boolean => {
	const ids = role === "entry" ? normalizedEntryDeviceIds.value : normalizedExitDeviceIds.value
	return ids.includes(deviceId)
}

const handleToggleAccessControl = (role: "entry" | "exit", deviceId: number) => {
	const key = role === "entry" ? "entryDeviceIds" : "exitDeviceIds"
	const current =
		role === "entry" ? [...normalizedEntryDeviceIds.value] : [...normalizedExitDeviceIds.value]
	const idx = current.indexOf(deviceId)
	if (idx >= 0) current.splice(idx, 1)
	else current.push(deviceId)
	localLocation.value[key] = current
	handleChange()
}

const accessControlOverlapSet = computed(() => {
	const entry = new Set(normalizedEntryDeviceIds.value)
	const exit = new Set(normalizedExitDeviceIds.value)
	const overlap = new Set<number>()
	for (const id of entry) {
		if (exit.has(id)) overlap.add(id)
	}
	return overlap
})

const hasAccessControlOverlap = computed(() => accessControlOverlapSet.value.size > 0)

const isAccessControlOverlapped = (deviceId: number): boolean => {
	return accessControlOverlapSet.value.has(Number(deviceId))
}

const hasEntrySelected = computed(() => {
	if (dataSource.value === "access_control") return normalizedEntryDeviceIds.value.length > 0
	return normalizedEntryDoorIds.value.length > 0
})

const hasExitSelected = computed(() => {
	if (dataSource.value === "access_control") return normalizedExitDeviceIds.value.length > 0
	return normalizedExitDoorIds.value.length > 0
})

const isCameraSelected = (deviceId: number): boolean => {
	return getEffectiveCameraDeviceIds().includes(deviceId)
}

const handleToggleCamera = (deviceId: number) => {
	if (!Array.isArray(localLocation.value.cameraDeviceIds)) {
		localLocation.value.cameraDeviceIds = getEffectiveCameraDeviceIds()
	}
	const ids = localLocation.value.cameraDeviceIds
	const idx = ids.indexOf(deviceId)
	if (idx >= 0) ids.splice(idx, 1)
	else ids.push(deviceId)

	handleChange()
}

const parseEventCameraSelect = (raw: string): number | null | undefined => {
	const trimmed = String(raw || "").trim()
	if (!trimmed) return null
	const n = Number(trimmed)
	if (!Number.isFinite(n) || n <= 0) return undefined
	return Math.trunc(n)
}

const handleChange = () => {
	emit("update", { ...localLocation.value })
}
</script>
