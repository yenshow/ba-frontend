<template>
	<div class="space-y-6 2xl:space-y-8">
		<header class="flex flex-wrap items-end justify-between gap-4 2xl:gap-6">
			<div class="space-y-2 2xl:space-y-4">
				<h1 class="text-3xl font-semibold text-white 2xl:text-4xl">人員管理</h1>
				<p class="text-base text-white/80 2xl:text-xl">管理人員群組、人員主檔與門禁權限</p>
			</div>
		</header>

		<!-- Tab 切換 -->
		<nav class="flex gap-2 border-b border-white/20">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				type="button"
				:class="[
					'rounded-t-xl px-4 py-2 text-sm font-medium transition-colors 2xl:px-6 2xl:py-3 2xl:text-base',
					activeTab === tab.id ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
				]"
				:aria-label="tab.label"
				@click="activeTab = tab.id"
			>
				{{ tab.label }}
			</button>
		</nav>

		<!-- Tab: 人員群組 -->
		<section
			v-show="activeTab === 'groups'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">群組列表</h2>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
					@click="openGroupCreate"
				>
					新增群組
				</button>
			</div>
			<div class="min-h-[300px]">
				<Transition name="fade" mode="out-in">
					<div v-if="groups.length > 0" key="groups">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">名稱</th>
									<th :class="tableHeaderClass">說明</th>
									<th v-if="canEdit" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="g in groups"
									:key="g.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ g.name }}</td>
									<td :class="tableCellClass">{{ g.description || "—" }}</td>
									<td v-if="canEdit" :class="tableCellClass">
										<div class="flex justify-center gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="editGroup(g)"
											>
												編輯
											</button>
											<button
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
												@click="confirmDeleteGroup(g)"
											>
												刪除
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else key="empty-groups" class="py-12 text-center text-white/60">
						<p class="text-base 2xl:text-lg">尚無群組，請點擊「新增群組」</p>
					</div>
				</Transition>
			</div>
		</section>

		<!-- Tab: 人員列表 -->
		<section
			v-show="activeTab === 'persons'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">人員列表</h2>
				<div v-if="canEdit" class="flex gap-2">
					<button
						type="button"
						class="rounded-xl bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="showImportDialog = true"
					>
						批次匯入
					</button>
					<button
						type="button"
						class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 2xl:px-6 2xl:py-3 2xl:text-base"
						@click="openPersonCreate"
					>
						新增人員
					</button>
				</div>
			</div>
			<div class="min-h-[300px]">
				<table class="w-full text-center">
					<thead>
							<tr class="border-b border-white/20">
								<th :class="tableHeaderClass">頭像</th>
								<th :class="tableHeaderClass">員工編號</th>
								<th :class="tableHeaderClass">姓名</th>
								<th :class="tableHeaderClass">
									<select
										v-model="personFilter.groupId"
										class="form-input form-select inline-block max-w-[140px] border-white/30 bg-white/10 py-1.5 text-sm text-white 2xl:max-w-[160px] 2xl:py-2 2xl:text-base"
										aria-label="依群組篩選"
										@change="loadPersons"
									>
										<option :value="null">全部群組</option>
										<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
									</select>
								</th>
								<th :class="tableHeaderClass">狀態</th>
								<th v-if="canEdit" :class="tableHeaderClass">操作</th>
							</tr>
						</thead>
						<tbody>
							<template v-if="persons.length > 0">
								<tr
									v-for="p in persons"
									:key="p.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">
										<div class="flex justify-center">
											<img
												v-if="getFaceImageSrc(p.face_url)"
												:src="getFaceImageSrc(p.face_url)!"
												:alt="p.full_name || p.employee_no"
												class="h-10 w-10 rounded-full object-cover 2xl:h-12 2xl:w-12"
											/>
											<div
												v-else
												class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg text-white/60 2xl:h-12 2xl:w-12"
												aria-hidden="true"
											>
												{{ (p.full_name || p.employee_no).charAt(0) || "?" }}
											</div>
										</div>
									</td>
									<td :class="tableCellClass">{{ p.employee_no }}</td>
									<td :class="tableCellClass">{{ p.full_name || "—" }}</td>
									<td :class="tableCellClass">{{ p.group_name || "—" }}</td>
									<td :class="tableCellClass">
										<span
											:class="[getPersonStatusBadgeClass(p.status), 'rounded px-2 py-1 2xl:px-3 2xl:py-1.5']"
										>
											{{ personStatusLabels[p.status] }}
										</span>
									</td>
									<td v-if="canEdit" :class="tableCellClass">
										<div class="flex flex-wrap justify-center gap-2 2xl:gap-3">
											<button
												type="button"
												class="rounded bg-cyan-500/80 px-3 py-1 text-white hover:bg-cyan-400 2xl:px-4 2xl:py-2"
												@click="openAccessLocations(p)"
											>
												門禁權限
											</button>
											<button
												type="button"
												class="rounded bg-blue-500/80 px-3 py-1 text-white hover:bg-blue-400 2xl:px-4 2xl:py-2"
												@click="editPerson(p)"
											>
												編輯
											</button>
											<button
												type="button"
												class="rounded bg-red-500/80 px-3 py-1 text-white hover:bg-red-400 2xl:px-4 2xl:py-2"
												@click="confirmDeletePerson(p)"
											>
												刪除
											</button>
										</div>
									</td>
								</tr>
							</template>
							<tr v-else class="text-white/60">
								<td :colspan="canEdit ? 6 : 5" class="py-12 text-center text-base 2xl:text-lg">
									{{ isLoadingPersons ? "載入中..." : "尚無人員或無符合群組篩選結果" }}
								</td>
							</tr>
						</tbody>
					</table>
			</div>
		</section>

		<!-- Tab: 設備同步 -->
		<section
			v-show="activeTab === 'sync'"
			class="rounded-2xl border border-white/20 bg-white/15 p-6 2xl:p-8"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white 2xl:text-2xl">可同步地點</h2>
				<button
					v-if="canEdit"
					type="button"
					class="rounded-xl bg-emerald-500/80 px-4 py-2 text-sm text-white hover:bg-emerald-400 disabled:opacity-50 2xl:px-6 2xl:py-3 2xl:text-base"
					:disabled="isSyncingAll || syncableLocations.length === 0"
					@click="syncAllLocations"
				>
					{{ isSyncingAll ? "同步中..." : "同步全部" }}
				</button>
			</div>
			<p class="mb-4 text-sm text-white/70 2xl:text-base">
				可同步地點為人流統計中已設定門禁入口設備的地點；同步會將有權限的人員寫入該地點的門禁設備。
			</p>
			<div class="min-h-[200px]">
				<Transition name="fade" mode="out-in">
					<div v-if="syncableLocations.length > 0" key="sync-list">
						<table class="w-full text-center">
							<thead>
								<tr class="border-b border-white/20">
									<th :class="tableHeaderClass">區域</th>
									<th :class="tableHeaderClass">地點名稱</th>
									<th v-if="canEdit" :class="tableHeaderClass">操作</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="loc in syncableLocations"
									:key="loc.id"
									class="border-b border-white/10 text-base text-white hover:bg-white/5 2xl:text-lg"
								>
									<td :class="tableCellClass">{{ loc.zone_name }}</td>
									<td :class="tableCellClass">{{ loc.name }}</td>
									<td v-if="canEdit" :class="tableCellClass">
										<button
											type="button"
											class="rounded bg-cyan-500/80 px-3 py-1 text-white hover:bg-cyan-400 disabled:opacity-50 2xl:px-4 2xl:py-2"
											:disabled="syncingLocationId === loc.id"
											@click="syncOneLocation(loc.id)"
										>
											{{ syncingLocationId === loc.id ? "同步中..." : "同步" }}
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div v-else key="empty-sync" class="py-12 text-center text-white/60">
						<p class="text-base 2xl:text-lg">
							{{
								isLoadingSyncable
									? "載入中..."
									: "尚無可同步地點，請先在人流統計中建立區域與地點並配對門禁設備"
							}}
						</p>
					</div>
				</Transition>
			</div>
			<div
				v-if="syncWarnings.length > 0"
				class="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 text-sm text-amber-200 2xl:text-base"
				role="alert"
			>
				<p class="mb-2 font-medium">同步警告（{{ syncWarnings.length }} 筆）</p>
				<ul class="list-inside list-disc space-y-1">
					<li v-for="(w, i) in syncWarnings" :key="i" class="break-words">
						<span v-if="w.locationName" class="text-white/90">{{ w.locationName }}：</span>
						<span v-if="w.employeeNo" class="text-white/90">員工 {{ w.employeeNo }}</span>
						<span class="text-amber-200">{{ syncWarningTypeLabel(w.type) }}</span>
						<span class="text-white/70"> — {{ w.message }}</span>
					</li>
				</ul>
			</div>
		</section>

		<!-- 群組 新增/編輯 彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showGroupDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closeGroupDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								{{ editingGroup ? "編輯群組" : "新增群組" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="closeGroupDialog"
							>
								&times;
							</button>
						</header>
						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="submitGroup">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>名稱 *</span>
								<input v-model="groupForm.name" type="text" required class="form-input" />
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>說明</span>
								<input v-model="groupForm.description" type="text" class="form-input" />
							</label>
							<p v-if="errorMessage" class="text-sm text-rose-300">{{ errorMessage }}</p>
							<footer class="mt-2 flex gap-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closeGroupDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSubmitting">
									{{ isSubmitting ? "處理中..." : editingGroup ? "更新" : "建立" }}
								</button>
							</footer>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 人員 新增/編輯 彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showPersonDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closePersonDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								{{ editingPerson ? "編輯人員" : "新增人員" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="closePersonDialog"
							>
								&times;
							</button>
						</header>
						<form class="flex flex-col gap-4 2xl:gap-6" @submit.prevent="submitPerson">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>員工編號 *</span>
								<input
									v-model="personForm.employeeNo"
									type="text"
									required
									class="form-input"
									:readonly="!!editingPerson"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>姓名</span>
								<input v-model="personForm.fullName" type="text" class="form-input" />
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>群組</span>
								<select v-model="personForm.personGroupId" class="form-input form-select">
									<option :value="null">未指定</option>
									<option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
								</select>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>大頭照</span>
								<div class="flex flex-wrap items-center gap-3">
									<div
										class="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 2xl:h-24 2xl:w-24"
									>
										<img
											v-if="personFormFacePreview"
											:src="personFormFacePreview"
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
									<div class="flex flex-col gap-1">
										<input
											ref="faceFileInputRef"
											type="file"
											accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
											class="hidden"
											aria-label="選擇大頭照"
											@change="handleFaceFileChange"
										/>
										<button
											type="button"
											class="rounded-lg bg-white/20 px-3 py-2 text-sm text-white hover:bg-white/30"
											@click="triggerFaceFileSelect"
										>
											選擇圖片
										</button>
										<button
											v-if="hasFacePreview"
											type="button"
											class="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20"
											@click="clearFaceUrl"
										>
											清除
										</button>
									</div>
								</div>
							</label>
							<label v-if="editingPerson" class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
								<span>狀態</span>
								<select v-model="personForm.status" class="form-input form-select">
									<option value="active">啟用</option>
									<option value="inactive">停用</option>
									<option value="deleted">已刪除</option>
								</select>
							</label>
							<p v-if="errorMessage" class="text-sm text-rose-300">{{ errorMessage }}</p>
							<footer class="mt-2 flex gap-3 2xl:gap-4">
								<button type="button" class="btn-secondary" @click="closePersonDialog">取消</button>
								<div class="flex-1"></div>
								<button type="submit" class="btn-primary" :disabled="isSubmitting">
									{{ isSubmitting ? "處理中..." : editingPerson ? "更新" : "建立" }}
								</button>
							</footer>
						</form>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 門禁權限 彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showAccessDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="closeAccessDialog"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">
								門禁權限 — {{ accessPerson?.employee_no }} {{ accessPerson?.full_name || "" }}
							</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="closeAccessDialog"
							>
								&times;
							</button>
						</header>
						<p class="text-sm text-white/70">
							此處為「可進出之地點」（可多選），不是門禁設備列表。門禁設備請在「設備管理」新增；地點需在「人流統計」中建立並綁定入口/出口設備後，才會出現在下方。
						</p>
						<div v-if="isLoadingAccess" class="py-8 text-center text-white/70">載入中...</div>
						<div v-else class="space-y-2">
							<label
								v-for="loc in syncableLocations"
								:key="loc.id"
								class="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
								:class="{ 'border-cyan-400/50 bg-cyan-500/20': selectedLocationIds.includes(loc.id) }"
							>
								<input
									v-model="selectedLocationIds"
									type="checkbox"
									:value="loc.id"
									class="h-4 w-4 accent-cyan-400"
								/>
								<span class="text-sm text-white/90 2xl:text-base"
									>{{ loc.zone_name }} — {{ loc.name }}</span
								>
							</label>
							<div
								v-if="syncableLocations.length === 0"
								class="rounded border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200/90"
							>
								<p class="font-medium">尚無可同步地點</p>
								<p class="mt-2 text-white/80">請依序完成：</p>
								<ol class="mt-1 list-inside list-decimal space-y-1 text-white/70">
									<li>在「設備管理」新增門禁設備（您已有設備則可略過）</li>
									<li>至「人流統計」→ 點「地點管理」→ 建立區域與地點</li>
									<li>在各地點中選擇「門禁設備（本系統）」並綁定入口／出口設備</li>
								</ol>
								<p class="mt-2 text-white/70">
									完成綁定後，此地點會出現在上方列表，即可為人員設定可進出之地點。
								</p>
							</div>
						</div>
						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="closeAccessDialog">取消</button>
							<div class="flex-1"></div>
							<button
								type="button"
								class="btn-primary"
								:disabled="isSavingAccess || !accessPerson"
								@click="saveAccessLocations"
							>
								{{ isSavingAccess ? "儲存中..." : "儲存" }}
							</button>
						</footer>
					</div>
				</div>
			</Transition>
		</Teleport>

		<!-- 批次匯入 彈窗 -->
		<Teleport to="body">
			<Transition name="dialog-fade">
				<div
					v-if="showImportDialog"
					class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
					@click.self="showImportDialog = false"
				>
					<div
						class="dialog-panel-bg show-scrollbar flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-3xl p-7 2xl:p-8"
					>
						<header class="flex items-center justify-between">
							<h3 class="text-lg font-semibold tracking-[4px] text-white 2xl:text-xl">批次匯入</h3>
							<button
								type="button"
								class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
								aria-label="關閉"
								@click="showImportDialog = false"
							>
								&times;
							</button>
						</header>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:text-base">
							<span>JSON 陣列（每筆含 employeeNo；可選 fullName, personGroupId, locationIds）</span>
							<textarea
								v-model="importJsonText"
								class="form-input min-h-[200px] font-mono text-sm"
								placeholder='[{"employeeNo":"A001","fullName":"王小明","personGroupId":1,"locationIds":[1,2]}]'
							></textarea>
						</label>
						<p v-if="importError" class="text-sm text-rose-300">{{ importError }}</p>
						<div
							v-if="importResult"
							class="rounded border border-white/20 bg-white/5 p-3 text-sm text-white/90"
						>
							<p>成功：{{ importResult.created }} 筆</p>
							<p v-if="importResult.errors?.length" class="mt-2 text-amber-300">
								錯誤：{{ importResult.errors.length }} 筆 —
								{{ importResult.errors.map(e => `第${e.row}行 ${e.message}`).join("；") }}
							</p>
						</div>
						<footer class="mt-2 flex gap-3 2xl:gap-4">
							<button type="button" class="btn-secondary" @click="showImportDialog = false">關閉</button>
							<div class="flex-1"></div>
							<button
								type="button"
								class="btn-primary"
								:disabled="isImporting || !importJsonText.trim()"
								@click="submitImport"
							>
								{{ isImporting ? "匯入中..." : "匯入" }}
							</button>
						</footer>
					</div>
				</div>
			</Transition>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import type {
	PersonGroup,
	Person,
	SyncableLocation,
	ImportResult,
	SyncWarning
} from "~/types/personnel";
import { useAuth } from "~/composables/core/useAuth";
import { useToast } from "~/composables/core/useToast";
import { useErrorHandler } from "~/composables/core/useErrorHandler";
import { usePersonnelApi } from "~/composables/systems/usePersonnelApi";

definePageMeta({
	layout: "default"
});

const personnelApi = usePersonnelApi();
const toast = useToast();
const { handleError: handleApiError } = useErrorHandler();
const { isAdmin, isOperator } = useAuth();
const canEdit = computed(() => isAdmin || isOperator);

const activeTab = ref<"groups" | "persons" | "sync">("groups");
const tabs: { id: "groups" | "persons" | "sync"; label: string }[] = [
	{ id: "groups", label: "人員群組" },
	{ id: "persons", label: "人員列表" },
	{ id: "sync", label: "設備同步" }
];
const tableHeaderClass = "py-3 2xl:py-4 px-4 2xl:px-6 text-sm 2xl:text-base text-white/80";
const tableCellClass = "py-3 2xl:py-4 px-4 2xl:px-6";

const personStatusLabels: Record<string, string> = {
	active: "啟用",
	inactive: "停用",
	deleted: "已刪除"
};

const getPersonStatusBadgeClass = (status: string) => {
	const classes: Record<string, string> = {
		active: "bg-emerald-500/20 text-emerald-200",
		inactive: "bg-yellow-500/20 text-yellow-200",
		deleted: "bg-gray-500/20 text-gray-200"
	};
	return classes[status] || classes.inactive;
};

// ---------- 群組 ----------
const groups = ref<PersonGroup[]>([]);
const showGroupDialog = ref(false);
const editingGroup = ref<PersonGroup | null>(null);
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const groupForm = reactive({ name: "", description: "" });

const loadGroups = async () => {
	try {
		groups.value = await personnelApi.getPersonGroups();
	} catch (err) {
		handleApiError(err, "載入群組失敗");
		groups.value = [];
	}
};

const openGroupCreate = () => {
	editingGroup.value = null;
	groupForm.name = "";
	groupForm.description = "";
	errorMessage.value = null;
	showGroupDialog.value = true;
};

const editGroup = (g: PersonGroup) => {
	editingGroup.value = g;
	groupForm.name = g.name;
	groupForm.description = g.description ?? "";
	errorMessage.value = null;
	showGroupDialog.value = true;
};

const closeGroupDialog = () => {
	showGroupDialog.value = false;
	editingGroup.value = null;
	errorMessage.value = null;
};

const submitGroup = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingGroup.value) {
			const updated = await personnelApi.updatePersonGroup(editingGroup.value.id, {
				name: groupForm.name,
				description: groupForm.description || null
			});
			const idx = groups.value.findIndex(x => x.id === editingGroup.value!.id);
			if (idx > -1) groups.value[idx] = updated;
			toast.success("已更新群組");
		} else {
			const created = await personnelApi.createPersonGroup({
				name: groupForm.name,
				description: groupForm.description || null
			});
			groups.value.push(created);
			toast.success("已新增群組");
		}
		closeGroupDialog();
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗";
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeleteGroup = async (g: PersonGroup) => {
	if (!confirm(`確定要刪除群組「${g.name}」嗎？若群組下有人員則無法刪除。`)) return;
	try {
		await personnelApi.deletePersonGroup(g.id);
		groups.value = groups.value.filter(x => x.id !== g.id);
		toast.success("已刪除群組");
	} catch (err) {
		handleApiError(err, "刪除群組失敗");
	}
};

// ---------- 人員 ----------
const persons = ref<Person[]>([]);
const isLoadingPersons = ref(false);
const personFilter = reactive<{
	groupId: number | null;
}>({ groupId: null });
const showPersonDialog = ref(false);
const editingPerson = ref<Person | null>(null);
const personForm = reactive<{
	employeeNo: string;
	fullName: string;
	personGroupId: number | null;
	status: "active" | "inactive" | "deleted";
	faceUrl: string;
}>({ employeeNo: "", fullName: "", personGroupId: null, status: "active", faceUrl: "" });

const config = useRuntimeConfig();
const getFaceImageSrc = (url: string | null | undefined): string | null => {
	if (!url) return null;
	if (url.startsWith("http")) return url;
	const base = (config.public.apiBase as string) || "";
	const origin = base.replace(/\/api\/?$/, "");
	return `${origin}${url}`;
};

const pendingFaceFile = ref<File | null>(null);
const facePreviewObjectUrl = ref<string | null>(null);

const personFormFacePreview = computed(() => {
	if (facePreviewObjectUrl.value) return facePreviewObjectUrl.value;
	const u = personForm.faceUrl?.trim();
	if (!u) return null;
	if (u.startsWith("data:")) return u;
	return getFaceImageSrc(u);
});

const hasFacePreview = computed(() => !!personForm.faceUrl?.trim() || !!facePreviewObjectUrl.value);

const faceFileInputRef = ref<HTMLInputElement | null>(null);
const triggerFaceFileSelect = () => faceFileInputRef.value?.click();
const resetFaceFileInput = () => {
	faceFileInputRef.value && (faceFileInputRef.value.value = "");
};
const clearFaceUrl = () => {
	personForm.faceUrl = "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	resetFaceFileInput();
};
const handleFaceFileChange = async (e: Event) => {
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	if (editingPerson.value) {
		try {
			const res = await personnelApi.uploadFaceForPerson(editingPerson.value.id, file);
			if (res?.faceUrl) personForm.faceUrl = res.faceUrl;
		} catch (err) {
			handleApiError(err, "上傳大頭照失敗");
		}
	} else {
		pendingFaceFile.value = file;
		if (facePreviewObjectUrl.value) URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = URL.createObjectURL(file);
	}
	input.value = "";
};

const loadPersons = async () => {
	isLoadingPersons.value = true;
	try {
		const params = personFilter.groupId != null ? { personGroupId: personFilter.groupId } : {};
		persons.value = await personnelApi.getPersons(params);
	} catch (err) {
		handleApiError(err, "載入人員失敗");
		persons.value = [];
	} finally {
		isLoadingPersons.value = false;
	}
};

const openPersonCreate = () => {
	editingPerson.value = null;
	personForm.employeeNo = "";
	personForm.fullName = "";
	personForm.personGroupId = null;
	personForm.status = "active";
	personForm.faceUrl = "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	resetFaceFileInput();
	errorMessage.value = null;
	showPersonDialog.value = true;
};

const editPerson = (p: Person) => {
	editingPerson.value = p;
	personForm.employeeNo = p.employee_no;
	personForm.fullName = p.full_name ?? "";
	personForm.personGroupId = p.person_group_id ?? null;
	personForm.status = p.status;
	personForm.faceUrl = p.face_url ?? "";
	pendingFaceFile.value = null;
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	resetFaceFileInput();
	errorMessage.value = null;
	showPersonDialog.value = true;
};

const closePersonDialog = () => {
	if (facePreviewObjectUrl.value) {
		URL.revokeObjectURL(facePreviewObjectUrl.value);
		facePreviewObjectUrl.value = null;
	}
	showPersonDialog.value = false;
	editingPerson.value = null;
	errorMessage.value = null;
};

const submitPerson = async () => {
	isSubmitting.value = true;
	errorMessage.value = null;
	try {
		if (editingPerson.value) {
			const updated = await personnelApi.updatePerson(editingPerson.value.id, {
				fullName: personForm.fullName || null,
				personGroupId: personForm.personGroupId,
				status: personForm.status,
				faceUrl: personForm.faceUrl.trim() || null
			});
			const idx = persons.value.findIndex(x => x.id === editingPerson.value!.id);
			if (idx > -1) persons.value[idx] = updated;
			toast.success("已更新人員");
		} else {
			const created = await personnelApi.createPerson({
				employeeNo: personForm.employeeNo.trim(),
				fullName: personForm.fullName.trim() || null,
				personGroupId: personForm.personGroupId,
				status: personForm.status
			});
			if (pendingFaceFile.value) {
				const uploadRes = await personnelApi.uploadFaceForPerson(created.id, pendingFaceFile.value);
				persons.value.push(uploadRes.person);
				pendingFaceFile.value = null;
				if (facePreviewObjectUrl.value) {
					URL.revokeObjectURL(facePreviewObjectUrl.value);
					facePreviewObjectUrl.value = null;
				}
			} else {
				persons.value.push(created);
			}
			toast.success("已新增人員");
		}
		closePersonDialog();
	} catch (err) {
		errorMessage.value = handleApiError(err, "儲存失敗") || "儲存失敗";
	} finally {
		isSubmitting.value = false;
	}
};

const confirmDeletePerson = async (p: Person) => {
	if (!confirm(`確定要刪除人員「${p.employee_no} ${p.full_name || ""}」嗎？`)) return;
	try {
		await personnelApi.deletePerson(p.id);
		persons.value = persons.value.filter(x => x.id !== p.id);
		toast.success("已刪除人員");
	} catch (err) {
		handleApiError(err, "刪除人員失敗");
	}
};

// ---------- 門禁權限彈窗 ----------
const showAccessDialog = ref(false);
const accessPerson = ref<Person | null>(null);
const selectedLocationIds = ref<number[]>([]);
const isLoadingAccess = ref(false);
const isSavingAccess = ref(false);

const openAccessLocations = async (p: Person) => {
	accessPerson.value = p;
	selectedLocationIds.value = [];
	showAccessDialog.value = true;
	isLoadingAccess.value = true;
	try {
		const [res, syncList] = await Promise.all([
			personnelApi.getAccessLocations(p.id),
			syncableLocations.value.length > 0
				? Promise.resolve(syncableLocations.value)
				: personnelApi.getSyncableLocations()
		]);
		selectedLocationIds.value = res.locations.map(l => l.location_id);
		if (syncableLocations.value.length === 0) syncableLocations.value = syncList;
	} catch (err) {
		handleApiError(err, "載入門禁權限失敗");
	} finally {
		isLoadingAccess.value = false;
	}
};

const closeAccessDialog = () => {
	showAccessDialog.value = false;
	accessPerson.value = null;
};

const saveAccessLocations = async () => {
	if (!accessPerson.value) return;
	isSavingAccess.value = true;
	try {
		await personnelApi.setAccessLocations(accessPerson.value.id, selectedLocationIds.value);
		toast.success("已更新門禁權限");
		closeAccessDialog();
	} catch (err) {
		handleApiError(err, "更新門禁權限失敗");
	} finally {
		isSavingAccess.value = false;
	}
};

// ---------- 同步 ----------
const syncableLocations = ref<SyncableLocation[]>([]);
const isLoadingSyncable = ref(false);
const isSyncingAll = ref(false);
const syncingLocationId = ref<number | null>(null);
const syncWarnings = ref<SyncWarning[]>([]);
const syncWarningTypeLabel = (type: string) =>
	({ face: "人臉更新失敗", add: "新增失敗", update: "更新失敗", delete: "刪除失敗", sync: "同步失敗" }[
		type
	] ?? type);

const loadSyncableLocations = async () => {
	isLoadingSyncable.value = true;
	try {
		syncableLocations.value = await personnelApi.getSyncableLocations();
	} catch (err) {
		handleApiError(err, "載入可同步地點失敗");
		syncableLocations.value = [];
	} finally {
		isLoadingSyncable.value = false;
	}
};

const syncOneLocation = async (locationId: number) => {
	syncingLocationId.value = locationId;
	syncWarnings.value = [];
	try {
		const result = await personnelApi.syncLocation(locationId);
		syncWarnings.value = result.warnings ?? [];
		if (syncWarnings.value.length > 0) {
			toast.warning(`同步完成，但有 ${syncWarnings.value.length} 筆警告`);
		} else {
			toast.success("同步完成");
		}
	} catch (err) {
		handleApiError(err, "同步失敗");
	} finally {
		syncingLocationId.value = null;
	}
};

const syncAllLocations = async () => {
	isSyncingAll.value = true;
	syncWarnings.value = [];
	try {
		const result = await personnelApi.syncAllLocations();
		const allWarnings = (result.results ?? []).flatMap((r) =>
			(r.warnings ?? []).map((w) => ({ ...w, locationName: r.locationName }))
		);
		syncWarnings.value = allWarnings;
		if (allWarnings.length > 0) {
			toast.warning(`已同步 ${result.synced} 個地點，但有 ${allWarnings.length} 筆警告`);
		} else {
			toast.success(`已同步 ${result.synced} 個地點`);
		}
	} catch (err) {
		handleApiError(err, "同步全部失敗");
	} finally {
		isSyncingAll.value = false;
	}
};

// ---------- 批次匯入 ----------
const showImportDialog = ref(false);
const importJsonText = ref("");
const importError = ref("");
const importResult = ref<ImportResult | null>(null);
const isImporting = ref(false);

const submitImport = async () => {
	importError.value = "";
	importResult.value = null;
	let arr: unknown[];
	try {
		const parsed = JSON.parse(importJsonText.value);
		arr = Array.isArray(parsed) ? parsed : [parsed];
	} catch {
		importError.value = "JSON 格式錯誤";
		return;
	}
	const personsPayload = arr.map((row: any) => ({
		employeeNo: row.employeeNo ?? row.employee_no ?? "",
		fullName: row.fullName ?? row.full_name,
		personGroupId: row.personGroupId ?? row.person_group_id,
		locationIds: row.locationIds ?? row.location_ids ?? []
	}));
	isImporting.value = true;
	try {
		const result = await personnelApi.importPersons({ persons: personsPayload });
		importResult.value = result;
		if (result.created > 0) {
			toast.success(`已匯入 ${result.created} 筆`);
			loadPersons();
		}
		if (result.errors?.length) toast.error(`部分失敗：${result.errors.length} 筆`);
	} catch (err) {
		importError.value = handleApiError(err, "匯入失敗") || "匯入失敗";
	} finally {
		isImporting.value = false;
	}
};

// ---------- 生命週期與 watch ----------
watch(
	activeTab,
	tab => {
		if (tab === "groups") loadGroups();
		else if (tab === "persons") {
			loadGroups();
			loadPersons();
		} else if (tab === "sync") {
			loadSyncableLocations();
		}
	},
	{ immediate: true }
);
</script>

<style scoped>
.dialog-panel-bg {
	background: linear-gradient(145deg, rgba(9, 106, 133, 0.95), rgba(20, 64, 92, 0.98));
	border: 1px solid rgba(255, 255, 255, 0.25);
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
	color: #f5f9ff;
}
.form-input {
	border-radius: 0.75rem;
	border: 1px solid rgba(255, 255, 255, 0.35);
	background: rgba(255, 255, 255, 0.1);
	padding: 0.65rem 0.85rem;
	color: #f7fbff;
	transition:
		border-color 0.2s ease,
		background 0.2s ease;
}
.form-input:focus {
	border-color: #5be7f1;
	background: rgba(255, 255, 255, 0.18);
	outline: none;
}
.form-select {
	cursor: pointer;
}
.form-select option {
	background: rgba(20, 64, 92, 0.98);
	color: #f7fbff;
}
.btn-primary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: linear-gradient(135deg, #2dd4bf, #1ba9d3);
	color: #0b2c3c;
	border: none;
	box-shadow: 0 10px 25px rgba(23, 217, 199, 0.35);
}
.btn-primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 12px 30px rgba(23, 217, 199, 0.45);
}
.btn-primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
.btn-secondary {
	border-radius: 999px;
	padding: 0.6rem 1.4rem;
	font-weight: 500;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(91, 231, 241, 0.5);
	color: #e8fbff;
}
.btn-secondary:hover {
	background: rgba(255, 255, 255, 0.12);
	border-color: rgba(91, 231, 241, 0.7);
}
.dialog-fade-enter-active,
.dialog-fade-leave-active {
	transition: opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
	opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
