<template>
	<Teleport to="body">
		<Transition name="dialog-fade">
			<div
				v-if="modelValue"
				class="fixed inset-0 z-[2000] flex items-center justify-center bg-[rgba(5,24,40,0.8)] backdrop-blur-[10px]"
			>
				<div
					class="dialog-panel-bg flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-hidden rounded-3xl pb-7 pl-7 pr-0 pt-7 2xl:max-w-2xl 2xl:gap-6 2xl:pb-8 2xl:pl-8 2xl:pr-0 2xl:pt-8"
				>
					<header class="flex items-center justify-between pr-7 2xl:pr-8">
						<h3 class="text-xl font-semibold tracking-[4px] text-white 2xl:text-2xl">
							{{ editingRule ? "編輯警報規則" : "新增警報規則" }}
						</h3>
						<button
							type="button"
							class="cursor-pointer border-none bg-transparent text-[1.75rem] leading-none text-white transition-opacity hover:opacity-70"
							aria-label="關閉規則對話框"
							@click="emit('update:modelValue', false)"
						>
							&times;
						</button>
					</header>

					<form
						class="show-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto pb-4 pr-7 2xl:gap-6 2xl:pb-6 2xl:pr-8"
						@submit.prevent
					>
						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>系統<span class="required-mark">*</span></span>
							<p
								v-if="editingRule && isEnergySource"
								class="form-input opacity-70"
							>
								能源管理
							</p>
							<FilterDropdown
								v-else
								v-model="form.source"
								:options="sourceSelectOptions"
								placeholder="請選擇來源系統"
								text-size="text-sm 2xl:text-base"
							/>
						</label>
						<div v-if="!isEnergySource" class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>類型<span class="required-mark">*</span></span>
								<FilterDropdown
									v-model="form.alert_type"
									:options="alertTypeOptions"
									placeholder="請選擇警報類型"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>狀態<span class="required-mark">*</span></span>
								<FilterDropdown
									v-model="form.severity"
									:options="severityOptionsForForm"
									placeholder="請選擇狀態（異常／警報）"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>
						<div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>狀態<span class="required-mark">*</span></span>
								<FilterDropdown
									v-model="form.severity"
									:options="severityOptionsForForm"
									placeholder="請選擇狀態"
									text-size="text-sm 2xl:text-base"
								/>
							</label>
						</div>

						<div
							v-if="!isEnergySource"
							class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6"
						>
							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>目標區域 (zone)</span>
								<FilterDropdown
									:model-value="selectedZoneId"
									:options="zoneOptions"
									placeholder="全域（不限定區域）"
									text-size="text-sm 2xl:text-base"
									@update:model-value="
										(v) => {
											handleSelectZone(v)
										}
									"
								/>
							</label>

							<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
								<span>目標地點 (location)</span>
								<FilterDropdown
									:model-value="selectedLocationId"
									:options="locationOptions"
									:disabled="!selectedZoneId"
									placeholder="先選擇區域"
									text-size="text-sm 2xl:text-base"
									@update:model-value="(v) => handleSelectLocation(v)"
								/>
							</label>
						</div>

						<div
							v-if="form.alert_type === 'threshold' && !isEnergySource"
							class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 2xl:gap-6">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>參數 (parameter)<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="thresholdConfig.parameter"
										:options="parameterOptions"
										placeholder="請選擇參數"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>運算子 (operator)<span class="required-mark">*</span></span>
									<FilterDropdown
										v-model="thresholdConfig.operator"
										:options="thresholdOperatorOptions"
										placeholder="請選擇運算子"
										text-size="text-sm 2xl:text-base"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>門檻值 (value)<span class="required-mark">*</span></span>
									<input
										v-model.number="thresholdConfig.value"
										type="number"
										step="any"
										required
										class="form-input"
										placeholder="數值"
									/>
								</label>
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>單位 (unit)</span>
									<input
										v-model="thresholdConfig.unit"
										type="text"
										class="form-input"
										placeholder="例如：ug/m³"
									/>
								</label>
							</div>
						</div>

						<div
							v-else-if="isEnergySource"
							class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5"
						>
							<div class="mb-4 space-y-1 text-sm text-white/80 2xl:text-base">
								<p class="text-white/60">能源 Incident 類型</p>
								<p class="font-medium text-white/90">{{ energyConditionLabel }}</p>
							</div>

							<div
								v-if="energyConditionType === 'energy_contract_stage'"
								class="grid grid-cols-1 gap-3 sm:grid-cols-2"
							>
								<div class="space-y-1 text-sm text-white/80 2xl:text-base">
									<p class="text-white/60">分級（1～3）</p>
									<p class="font-medium text-white/90">{{ energyConfig.level }}</p>
								</div>
								<div class="space-y-1 text-sm text-white/80 2xl:text-base">
									<p class="text-white/60">門檻（%）</p>
									<p class="font-medium text-white/90">{{ energyConfig.threshold_pct }}</p>
								</div>
							</div>

							<div
								v-else-if="energyConditionType === 'energy_meter_stale'"
								class="space-y-1 text-sm text-white/80 2xl:text-base"
							>
								<p class="text-white/60">逾時（分鐘）</p>
								<p class="font-medium text-white/90">{{ energyConfig.stale_minutes }}</p>
							</div>

							<div
								v-else-if="energyConditionType === 'energy_reading_jump'"
								class="grid grid-cols-1 gap-3 sm:grid-cols-2"
							>
								<div class="space-y-1 text-sm text-white/80 2xl:text-base">
									<p class="text-white/60">倍數門檻</p>
									<p class="font-medium text-white/90">{{ energyConfig.multiplier }}</p>
								</div>
								<div class="space-y-1 text-sm text-white/80 2xl:text-base">
									<p class="text-white/60">最小跳動 (kWh)</p>
									<p class="font-medium text-white/90">{{ energyConfig.min_kwh }}</p>
								</div>
							</div>

							<p class="mt-3 text-xs text-white/50 2xl:text-sm">
								門檻請至
								<NuxtLink
									to="/utilities/energy"
									class="text-cyan-300 underline-offset-2 hover:underline"
								>
									能源參數設定
								</NuxtLink>
								修改；此處可設定啟用、嚴重度與連動。
							</p>
						</div>

						<div v-else class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<template v-if="form.alert_type === 'offline'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>最小錯誤次數 (min_errors)<span class="required-mark">*</span></span>
									<input
										v-model.number="errorCountConfig.min_errors"
										type="number"
										min="1"
										required
										class="form-input"
										placeholder="例如：5"
									/>
								</label>
							</template>
							<template v-else-if="form.alert_type === 'di' || form.alert_type === 'do'">
								<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
									<span>位址<span class="required-mark">*</span></span>
									<input
										v-model.number="ioAddress"
										type="number"
										min="0"
										max="65535"
										required
										class="form-input"
										placeholder="位址"
										@blur="handleIoAddressBlur"
									/>
								</label>
							</template>
							<template v-else>
								<p class="text-sm text-white/60">請先選擇警報類型</p>
							</template>
						</div>

						<label class="flex flex-col gap-2 text-sm text-white/80 2xl:gap-2.5 2xl:text-base">
							<span>訊息模板</span>
							<textarea
								v-model="form.message_suffix"
								rows="3"
								class="form-input min-h-[5.5rem] resize-y"
								placeholder="例如：請值班人員立即到場確認"
							/>
						</label>

						<!-- Integrations: accordion -->
						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<button
								type="button"
								class="flex w-full items-center justify-between text-left text-sm font-medium text-white/90 2xl:text-base"
								@click="expandedSections.linkage = !expandedSections.linkage"
							>
								<span>警報連動</span>
								<span class="text-white/60">{{ expandedSections.linkage ? "收合" : "展開" }}</span>
							</button>

							<div v-if="expandedSections.linkage" class="mt-4 space-y-4">
								<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
									<p class="mb-3 text-sm font-medium text-white/90">DO 輸出設定</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="doLinkage.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用 DO 連動</span>
									</label>

									<div v-if="doLinkage.enabled" class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>設備<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="doDeviceIdModel"
												:options="controllerDeviceOptions"
												placeholder="請選擇控制器設備"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>觸發時輸出<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="doOutputValueModel"
												:options="doOutputValueOptions"
												placeholder="請選擇"
												text-size="text-sm 2xl:text-base"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>位址<span class="required-mark">*</span></span>
											<input
												v-model.number="doLinkage.do_address"
												type="number"
												min="0"
												class="form-input"
												placeholder="例如：0"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>延時復歸（秒）</span>
											<input
												v-model.number="doLinkage.auto_off_seconds"
												type="number"
												min="1"
												class="form-input"
												placeholder="留空 - 不自動復歸"
											/>
										</label>
									</div>
								</div>

								<div
									v-if="canUseCameraLinkage"
									class="rounded-2xl border border-white/10 bg-white/5 p-4"
								>
									<p class="mb-3 text-sm font-medium text-white/90">攝影機連動</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="cameraLinkage.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用攝影機彈窗</span>
									</label>
									<div v-if="cameraLinkage.enabled" class="mt-3">
										<div class="flex items-center justify-between gap-3">
											<p class="text-sm text-white/80">
												攝影機（最多 4 台）<span class="required-mark">*</span>
											</p>
											<button
												type="button"
												class="btn-secondary"
												:disabled="cameraDeviceIdsModel.length >= 4"
												aria-label="新增一台攝影機"
												@click="handleAddCameraDeviceSlot"
											>
												新增
											</button>
										</div>
										<div class="mt-3 space-y-3">
											<div
												v-for="(val, index) in cameraDeviceIdsModel"
												:key="`camera-slot-${index}`"
												class="flex items-end gap-2"
											>
												<label class="flex flex-1 flex-col gap-2 text-sm text-white/80">
													<span>第 {{ index + 1 }} 台</span>
													<FilterDropdown
														:model-value="val ? String(val) : ''"
														:options="cameraDeviceOptions"
														placeholder="請選擇攝影機"
														text-size="text-sm 2xl:text-base"
														@update:model-value="
															(v: string) => handleUpdateCameraDeviceId(index, v)
														"
													/>
												</label>
												<button
													type="button"
													class="btn-secondary"
													:disabled="cameraDeviceIdsModel.length <= 1"
													aria-label="移除此攝影機"
													@click="handleRemoveCameraDeviceSlot(index)"
												>
													移除
												</button>
											</div>
											<p class="text-xs text-white/60">
												提示：重複選擇會自動去除；僅會儲存前 4 台。
											</p>
										</div>
									</div>
								</div>

								<div
									v-if="canUseAccessDoorLinkage"
									class="rounded-2xl border border-white/10 bg-white/5 p-4"
								>
									<p class="mb-3 text-sm font-medium text-white/90">門禁連動</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="accessDoorLinkage.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用門禁連動</span>
									</label>

									<div v-if="accessDoorLinkage.enabled" class="mt-3 space-y-3">
										<p class="text-sm text-white/80">
											門禁設備<span class="required-mark">*</span>
										</p>
										<label class="flex items-center gap-3 text-sm text-white/80">
											<input
												type="checkbox"
												class="h-4 w-4"
												:checked="accessDoorLinkage.allDevices"
												@change="handleAccessDoorToggleAll"
											/>
											<span>全部門禁</span>
										</label>
										<div
											v-if="accessDeviceItems.length > 0"
											class="grid grid-cols-3 gap-x-3 gap-y-3"
										>
											<label
												v-for="item in accessDeviceItems"
												:key="item.id"
												class="flex min-w-0 items-center gap-3 text-sm text-white/80"
											>
												<input
													type="checkbox"
													class="h-4 w-4 shrink-0"
													:checked="
														!accessDoorLinkage.allDevices &&
														accessDoorLinkage.device_ids.includes(item.id)
													"
													@change="
														(e: Event) =>
															handleAccessDoorToggleDevice(
																item.id,
																(e.target as HTMLInputElement).checked,
															)
													"
												/>
												<span class="truncate">{{ item.label }}</span>
											</label>
										</div>
										<p
											v-else
											class="text-sm text-white/60"
										>
											{{ isAccessDevicesLoading ? "設備載入中..." : "尚無門禁設備" }}
										</p>
									</div>
								</div>

								<div
									v-if="canUseSipRingLinkage"
									class="rounded-2xl border border-white/10 bg-white/5 p-4"
								>
									<p class="mb-3 text-sm font-medium text-white/90">門禁保全語音廣播</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input
											v-model="sipRingLinkage.enabled"
											type="checkbox"
											class="h-4 w-4"
											aria-label="啟用 SIP 室內語音廣播連動"
										/>
										<span>啟用室內語音廣播</span>
									</label>
									<p
										v-if="sipRingLinkage.enabled"
										class="mt-2 text-xs text-white/50"
									>
										室內機接聽後播放火場逃生語音（約 30 秒）；未接聽則只振鈴。
									</p>

									<div v-if="sipRingLinkage.enabled" class="mt-3 space-y-3">
										<p class="text-sm text-white/80">
											室內機<span class="required-mark">*</span>
										</p>
										<label class="flex items-center gap-3 text-sm text-white/80">
											<input
												type="checkbox"
												class="h-4 w-4"
												:checked="sipRingLinkage.allDevices"
												aria-label="全部室內機"
												@change="handleSipRingToggleAll"
											/>
											<span>全部室內機</span>
										</label>
										<div
											v-if="indoorDeviceItems.length > 0"
											class="grid grid-cols-3 gap-x-3 gap-y-3"
										>
											<label
												v-for="item in indoorDeviceItems"
												:key="item.id"
												class="flex min-w-0 items-center gap-3 text-sm text-white/80"
											>
												<input
													type="checkbox"
													class="h-4 w-4 shrink-0"
													:checked="
														!sipRingLinkage.allDevices &&
														sipRingLinkage.device_ids.includes(item.id)
													"
													:aria-label="`語音廣播室內機 ${item.label}`"
													@change="
														(e: Event) =>
															handleSipRingToggleDevice(
																item.id,
																(e.target as HTMLInputElement).checked,
															)
													"
												/>
												<span class="truncate">{{ item.label }}</span>
											</label>
										</div>
										<p v-else class="text-sm text-white/60">
											{{ isIndoorDevicesLoading ? "設備載入中..." : "尚無室內機" }}
										</p>
									</div>
								</div>

								<div
									v-if="canUseElevatorCallLinkage"
									class="rounded-2xl border border-white/10 bg-white/5 p-4"
								>
									<p class="mb-3 text-sm font-medium text-white/90">電梯呼梯連動</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input
											v-model="elevatorCallLinkage.enabled"
											type="checkbox"
											class="h-4 w-4"
											aria-label="啟用電梯呼梯至 1 樓連動"
										/>
										<span>啟用呼梯至 1 樓</span>
									</label>
									<div v-if="elevatorCallLinkage.enabled" class="mt-3 space-y-3">
										<p class="text-sm text-white/80">
											電梯地點<span class="required-mark">*</span>
										</p>
										<label class="flex items-center gap-3 text-sm text-white/80">
											<input
												type="checkbox"
												class="h-4 w-4"
												:checked="elevatorCallLinkage.allLocations"
												aria-label="全部電梯地點"
												@change="handleElevatorCallToggleAll"
											/>
											<span>全部電梯</span>
										</label>
										<div
											v-if="elevatorSites.length > 0"
											class="grid grid-cols-3 gap-x-3 gap-y-3"
										>
											<label
												v-for="item in elevatorSites"
												:key="item.id"
												class="flex min-w-0 items-center gap-3 text-sm text-white/80"
											>
												<input
													type="checkbox"
													class="h-4 w-4 shrink-0"
													:checked="
														!elevatorCallLinkage.allLocations &&
														elevatorCallLinkage.location_ids.includes(item.id)
													"
													:aria-label="`呼梯電梯 ${item.label}`"
													@change="
														(e: Event) =>
															handleElevatorCallToggleLocation(
																item.id,
																(e.target as HTMLInputElement).checked,
															)
													"
												/>
												<span class="truncate">{{ item.label }}</span>
											</label>
										</div>
										<p v-else class="text-sm text-white/60">
											{{ isElevatorSitesLoading ? "地點載入中..." : "尚無電梯地點" }}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div class="rounded-2xl border border-white/15 bg-white/5 p-4 2xl:p-5">
							<button
								type="button"
								class="flex w-full items-center justify-between text-left text-sm font-medium text-white/90 2xl:text-base"
								@click="expandedSections.notify = !expandedSections.notify"
							>
								<span>警報通知</span>
								<span class="text-white/60">{{ expandedSections.notify ? "收合" : "展開" }}</span>
							</button>

							<div v-if="expandedSections.notify" class="mt-4 space-y-3">
								<div class="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4">
									<p class="mb-3 text-sm font-medium text-white/90">Email（SMTP）</p>
									<label class="flex items-center gap-3 text-sm text-white/80">
										<input v-model="email.enabled" type="checkbox" class="h-4 w-4" />
										<span>啟用 Email 通知</span>
									</label>

									<div v-if="email.enabled" class="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>SMTP Host (主機)<span class="required-mark">*</span></span>
											<input
												v-model="email.smtp_host"
												type="text"
												class="form-input"
												placeholder="例如：smtp.example.com"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>SMTP Port (連接埠)<span class="required-mark">*</span></span>
											<input
												v-model.number="email.smtp_port"
												type="number"
												min="1"
												class="form-input"
												placeholder="例如：587"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>連線方式<span class="required-mark">*</span></span>
											<FilterDropdown
												v-model="email.smtp_security"
												:options="smtpSecurityOptions"
												placeholder="請選擇"
												text-size="text-sm 2xl:text-base"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>寄件人 Email<span class="required-mark">*</span></span>
											<input
												v-model="email.smtp_user"
												type="text"
												required
												class="form-input"
												placeholder="例如：noreply@example.com"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>密碼</span>
											<input
												v-model="email.smtp_password"
												type="password"
												class="form-input"
												placeholder="可留空"
												autocomplete="new-password"
											/>
										</label>

										<label class="flex flex-col gap-2 text-sm text-white/80 md:col-span-2">
											<span>收件人 To（每行一個）<span class="required-mark">*</span></span>
											<textarea
												v-model="email.to_emails_text"
												rows="3"
												class="form-input min-h-[5.5rem] resize-y"
												placeholder="a@example.com&#10;b@example.com"
											/>
										</label>

										<div class="flex flex-col gap-2 md:col-span-2">
											<button
												type="button"
												class="btn-secondary w-full md:w-auto"
												:disabled="isEmailSmtpTestLoading || isSubmitting || !props.editingRule?.id"
												aria-label="寄送 SMTP 測試信"
												@click="handleEmailSmtpTestClick"
											>
												{{ isEmailSmtpTestLoading ? "寄送中..." : "寄送測試信" }}
											</button>
											<p v-if="!props.editingRule?.id" class="text-xs text-white/55">
												請先建立並儲存規則（取得規則 ID）後，才能寄送測試信。
											</p>
										</div>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>重複發送間隔（秒）<span class="required-mark">*</span></span>
											<input
												v-model.number="email.repeat_min_interval_seconds"
												type="number"
												min="15"
												class="form-input"
											/>
										</label>
										<label class="flex flex-col gap-2 text-sm text-white/80">
											<span>最大發送次數（含第一封）<span class="required-mark">*</span></span>
											<input
												v-model.number="email.repeat_max_send_count"
												type="number"
												min="1"
												max="10"
												class="form-input"
											/>
										</label>
									</div>
								</div>
							</div>
						</div>

						<label class="flex items-center gap-3 text-sm text-white/80 2xl:gap-4 2xl:text-base">
							<span class="sr-only">規則啟用狀態</span>
							<label class="relative inline-flex cursor-pointer items-center">
								<input v-model="form.enabled" type="checkbox" class="peer sr-only" />
								<div
									class="peer h-6 w-11 rounded-full bg-white/20 after:absolute after:left-[4px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 2xl:h-7 2xl:w-14 2xl:after:h-6 2xl:after:w-6"
								></div>
								<span class="ml-3 text-sm 2xl:text-base">{{
									form.enabled ? "警報已啟用" : "警報已停用"
								}}</span>
							</label>
						</label>

						<p v-if="localErrorMessage || errorMessage" class="form-error-text">
							{{ localErrorMessage || errorMessage }}
						</p>
						<p
							v-if="smtpTestFeedback.message"
							class="text-sm 2xl:text-base"
							:class="smtpTestFeedback.ok ? 'text-emerald-300' : 'text-amber-200'"
						>
							{{ smtpTestFeedback.message }}
						</p>
					</form>

					<footer
						class="flex items-center gap-3 border-t border-white/20 pr-7 pt-4 2xl:gap-4 2xl:pr-8"
					>
						<button type="button" class="btn-secondary" @click="emit('update:modelValue', false)">
							取消
						</button>
						<div class="flex-1"></div>
						<button
							type="button"
							class="btn-primary"
							:disabled="isSubmitting"
							@click="handleSubmit"
						>
							{{ isSubmitting ? "處理中..." : editingRule ? "儲存變更" : "建立警報" }}
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import type {
	AlertConditionType,
	AlertRule,
	AlertSeverity,
	AlertSource,
	AlertTargetType,
	AlertType,
} from "~/types/alert"
import type { Device } from "~/types/device"
import FilterDropdown from "~/components/common/FilterDropdown.vue"
import type { UnifiedZone } from "~/types/location"
import { useZonesCache } from "~/composables/location/cache/useZonesCache"
import { useModbusValidation } from "~/composables/location/validation/useModbusValidation"
import { useAlertApi } from "~/composables/systems/alerts/useAlertApi"
import { useDeviceApi } from "~/composables/systems/devices/useDeviceApi"
import { alertSourceToSystemType, isAllowedThresholdOperator } from "~/utils/alertUtils"
import {
	normalizeAlertRuleDeviceIds,
	normalizeAlertRuleCameraDeviceIds,
	parseAlertRuleEmailsFromText,
	validateAlertRuleEmailSubscription,
	validateAlertRuleFormForSave,
} from "~/utils/alertRuleFormValidation"
import { useEnvironmentParameterCatalog } from "~/composables/systems/environment/useEnvironmentParameterCatalog"
import { getParameterUnit } from "~/utils/sensorUtils"
import { useLicense } from "~/composables/core/useLicense"

interface OptionItem {
	value: string
	label: string
}

interface RuleFormValue {
	source: AlertSource
	alert_type: AlertType
	severity: AlertSeverity
	target_type: AlertTargetType | null
	target_id: number | null
	message_suffix: string
	enabled: boolean
}

interface Props {
	modelValue: boolean
	editingRule: AlertRule | null
	isSubmitting?: boolean
	errorMessage?: string | null
	sourceOptions: OptionItem[]
}

interface SubmitPayload {
	source?: AlertSource
	alert_type?: AlertType
	severity: AlertSeverity
	target_type?: AlertTargetType | null
	target_id?: number | null
	condition_type?: AlertConditionType
	condition_config?: Record<string, unknown>
	message_suffix?: string | null
	enabled: boolean
}

interface IntegrationsDraft {
	doLinkage: null | {
		enabled: boolean
		do_device_id: number | null
		do_address: number | null
		do_output_value: "on" | "off"
		auto_off_seconds: number | null
	}
	cameraLinkage: null | {
		enabled: boolean
		camera_device_ids?: number[]
	}
	accessDoorLinkage: null | {
		enabled: boolean
		device_ids?: number[]
	}
	sipRingLinkage: null | {
		enabled: boolean
		device_ids?: number[]
	}
	elevatorCallLinkage: null | {
		enabled: boolean
		location_ids?: number[]
	}
	emailSubscription: null | {
		enabled: boolean
		smtp_host: string
		smtp_port: number
		smtp_user: string | null
		smtp_password: string | null
		smtp_security: "none" | "ssl" | "tls"
		to_emails: string[]
		repeat_min_interval_seconds: number
		repeat_max_send_count: number
	}
}

const props = withDefaults(defineProps<Props>(), {
	isSubmitting: false,
	errorMessage: null,
})

/** 與列表篩選共用選項時排除「全部」；新增時排除 energy（門檻改能源參數設定） */
const sourceSelectOptions = computed(() =>
	props.sourceOptions.filter((o) => {
		if (o.value === "") return false
		if (!props.editingRule && o.value === "energy") return false
		return true
	}),
)

const alertTypeOptions: OptionItem[] = [
	{ value: "offline", label: "設備狀態警報" },
	{ value: "di", label: "DI 警報" },
	{ value: "do", label: "DO 警報" },
	{ value: "threshold", label: "環境參數警報" },
]

const severityOptions: OptionItem[] = [
	{ value: "warning", label: "異常" },
	{ value: "error", label: "錯誤" },
	{ value: "critical", label: "警報" },
]

const energyConditionTypeOptions: OptionItem[] = [
	{ value: "energy_contract_stage", label: "契約容量分級" },
	{ value: "energy_meter_stale", label: "表計通訊逾時" },
	{ value: "energy_reading_jump", label: "讀數跳動異常" },
]

const isEnergySource = computed(() => form.source === "energy")

const severityOptionsForForm = computed(() =>
	isEnergySource.value
		? severityOptions
		: severityOptions.filter((o) => o.value !== "error"),
)

const energyConditionType = ref<AlertConditionType>("energy_contract_stage")

const energyConditionLabel = computed(
	() =>
		energyConditionTypeOptions.find((o) => o.value === energyConditionType.value)?.label ||
		energyConditionType.value,
)

const energyConfig = reactive({
	level: 1,
	threshold_pct: 80,
	stale_minutes: 15,
	multiplier: 3,
	min_kwh: 10,
})

const thresholdOperatorOptions: OptionItem[] = [
	{ value: ">", label: "超過（>）" },
	{ value: ">=", label: "超過含等於（>=）" },
	{ value: "<", label: "低於（<）" },
	{ value: "<=", label: "低於含等於（<=）" },
]

const emit = defineEmits<{
	(e: "update:modelValue", value: boolean): void
	(e: "submit", payload: { rule: SubmitPayload; integrations: IntegrationsDraft }): void
}>()

const form = reactive<RuleFormValue>({
	source: "environment",
	alert_type: "threshold",
	severity: "warning",
	target_type: null,
	target_id: null,
	message_suffix: "",
	enabled: true,
})

const thresholdConfig = reactive({
	parameter: "",
	operator: ">",
	value: 0,
	unit: "",
})

const errorCountConfig = reactive({
	min_errors: 5,
})

const ioAddress = ref<number>(0)

const { normalizeModbusAddressInput } = useModbusValidation()

const alertApi = useAlertApi()
const deviceApi = useDeviceApi()
const { hasFeature } = useLicense()

const canUseCameraLinkage = computed(() => hasFeature("surveillance"))
const canUseAccessDoorLinkage = computed(() => hasFeature("people_counting"))
const canUseSipRingLinkage = computed(() => hasFeature("access_security"))
const canUseElevatorCallLinkage = computed(() => hasFeature("elevator"))

const expandedSections = reactive({ linkage: false, notify: false })

const doLinkage = reactive({
	enabled: false,
	do_device_id: null as number | null,
	do_address: null as number | null,
	do_output_value: "on" as "on" | "off",
	auto_off_seconds: null as number | null,
})

const cameraLinkage = reactive({
	enabled: false,
	/** 內部用 slots 表示（可為 null），送出時再轉成 number[] */
	camera_device_ids: [null] as Array<number | null>,
})

const accessDoorLinkage = reactive({
	enabled: false,
	/** true＝全部；false＝device_ids 指定（可多選） */
	allDevices: true,
	device_ids: [] as number[],
})

const sipRingLinkage = reactive({
	enabled: false,
	/** true＝全部室內機並行廣播；false＝device_ids 指定 */
	allDevices: true,
	device_ids: [] as number[],
})

const elevatorCallLinkage = reactive({
	enabled: false,
	/** true＝全部電梯地點；false＝location_ids 指定 */
	allLocations: true,
	location_ids: [] as number[],
})

const smtpSecurityOptions: OptionItem[] = [
	{ value: "none", label: "無" },
	{ value: "ssl", label: "SSL" },
	{ value: "tls", label: "TLS" },
]

const email = reactive({
	enabled: false,
	smtp_host: "",
	smtp_port: 587 as number,
	smtp_user: "",
	smtp_password: "",
	smtp_security: "tls" as "none" | "ssl" | "tls",
	to_emails_text: "",
	repeat_min_interval_seconds: 15 as number,
	repeat_max_send_count: 10 as number,
})

const localErrorMessage = ref<string>("")
const isEmailSmtpTestLoading = ref(false)
const smtpTestFeedback = reactive<{ ok: boolean; message: string }>({
	ok: false,
	message: "",
})

const devices = ref<Device[]>([])
const isDevicesLoading = ref(false)
let devicesLoadPromise: Promise<void> | null = null

const accessDevices = ref<Device[]>([])
const isAccessDevicesLoading = ref(false)

const indoorDevices = ref<Device[]>([])
const isIndoorDevicesLoading = ref(false)

const elevatorSites = ref<Array<{ id: number; label: string }>>([])
const isElevatorSitesLoading = ref(false)

const isIndoorIntercomDevice = (d: Device) =>
	String((d.config as { unitType?: string } | undefined)?.unitType || "").trim() === "indoor"

const toLinkageDeviceItems = (list: Device[]) =>
	list
		.map((d) => ({
			id: Number(d.id),
			label: String(d.name || "").trim() || "(未命名)",
		}))
		.filter((d) => Number.isFinite(d.id) && d.id > 0)

const typedDeviceLoadPromises = new Map<string, Promise<void>>()

const loadTypedDevices = async (
	cache: typeof accessDevices,
	isLoading: typeof isAccessDevicesLoading,
	typeCode: string,
	filter?: (d: Device) => boolean,
) => {
	if (cache.value.length > 0) return
	const pending = typedDeviceLoadPromises.get(typeCode)
	if (pending) {
		await pending
		return
	}
	isLoading.value = true
	const promise = (async () => {
		try {
			const res = await deviceApi.getDevices({
				type_code: typeCode,
				limit: 500,
				offset: 0,
				orderBy: "name",
				order: "asc",
			})
			let list = Array.isArray(res.devices) ? res.devices : []
			if (filter) list = list.filter(filter)
			cache.value = list
		} catch {
			cache.value = []
		} finally {
			isLoading.value = false
			typedDeviceLoadPromises.delete(typeCode)
		}
	})()
	typedDeviceLoadPromises.set(typeCode, promise)
	await promise
}

const doOutputValueOptions = [
	{ value: "on", label: "ON" },
	{ value: "off", label: "OFF" },
]

const doOutputValueModel = computed<string>({
	get() {
		return doLinkage.do_output_value
	},
	set(v) {
		doLinkage.do_output_value = v === "off" ? "off" : "on"
	},
})

const doDeviceIdModel = computed<string>({
	get() {
		return doLinkage.do_device_id != null ? String(doLinkage.do_device_id) : ""
	},
	set(v) {
		const n = Number(v)
		doLinkage.do_device_id = v && Number.isFinite(n) ? n : null
	},
})

const cameraDeviceIdsModel = computed<Array<number | null>>({
	get() {
		const raw = Array.isArray(cameraLinkage.camera_device_ids)
			? cameraLinkage.camera_device_ids
			: []
		const normalized = raw
			.map((v) => (v == null ? null : Number(v)))
			.map((n) => (Number.isFinite(n as number) ? (n as number) : null))

		// 保留空 slot；但已選擇的 deviceId 需去重（保留第一個）
		const seen = new Set<number>()
		const deduped = normalized.map((v) => {
			if (v == null || v <= 0) return null
			if (seen.has(v)) return null
			seen.add(v)
			return v
		})

		const trimmed = deduped.slice(0, 4)
		return trimmed.length > 0 ? trimmed : [null]
	},
	set(next) {
		const raw = Array.isArray(next) ? next : []
		const normalized = raw
			.map((v) => (v == null ? null : Number(v)))
			.map((n) => (Number.isFinite(n as number) ? (n as number) : null))
			.map((v) => (v != null && v > 0 ? v : null))

		const seen = new Set<number>()
		const deduped = normalized.map((v) => {
			if (v == null) return null
			if (seen.has(v)) return null
			seen.add(v)
			return v
		})

		const trimmed = deduped.slice(0, 4)
		cameraLinkage.camera_device_ids = trimmed.length > 0 ? trimmed : [null]
	},
})

const controllerDeviceOptions = computed(() => {
	const base = [{ value: "", label: isDevicesLoading.value ? "設備載入中..." : "請選擇設備" }]
	const items = devices.value
		.filter(
			(d) =>
				String((d as Device & { type_code?: string }).type_code || "").toLowerCase() ===
				"controller"
		)
		.map((d) => ({ value: String(d.id), label: String(d.name || "").trim() || "(未命名)" }))
	return [...base, ...items]
})

const cameraDeviceOptions = computed(() => {
	const base = [{ value: "", label: isDevicesLoading.value ? "設備載入中..." : "請選擇攝影機" }]
	const items = devices.value
		.filter(
			(d) =>
				String((d as Device & { type_code?: string }).type_code || "").toLowerCase() === "camera"
		)
		.map((d) => ({ value: String(d.id), label: String(d.name || "").trim() || "(未命名)" }))
	return [...base, ...items]
})

const accessDeviceItems = computed(() => toLinkageDeviceItems(accessDevices.value))

const handleAccessDoorToggleAll = (e: Event) => {
	const checked = (e.target as HTMLInputElement).checked
	accessDoorLinkage.allDevices = checked
	if (checked) accessDoorLinkage.device_ids = []
}

const handleAccessDoorToggleDevice = (id: number, checked: boolean) => {
	accessDoorLinkage.allDevices = false
	const set = new Set(accessDoorLinkage.device_ids)
	if (checked) set.add(id)
	else set.delete(id)
	accessDoorLinkage.device_ids = [...set]
}

const indoorDeviceItems = computed(() => toLinkageDeviceItems(indoorDevices.value))

const handleSipRingToggleAll = (e: Event) => {
	const checked = (e.target as HTMLInputElement).checked
	sipRingLinkage.allDevices = checked
	if (checked) sipRingLinkage.device_ids = []
}

const handleSipRingToggleDevice = (id: number, checked: boolean) => {
	sipRingLinkage.allDevices = false
	const set = new Set(sipRingLinkage.device_ids)
	if (checked) set.add(id)
	else set.delete(id)
	sipRingLinkage.device_ids = [...set]
}

const handleElevatorCallToggleAll = (e: Event) => {
	const checked = (e.target as HTMLInputElement).checked
	elevatorCallLinkage.allLocations = checked
	if (checked) elevatorCallLinkage.location_ids = []
}

const handleElevatorCallToggleLocation = (id: number, checked: boolean) => {
	elevatorCallLinkage.allLocations = false
	const set = new Set(elevatorCallLinkage.location_ids)
	if (checked) set.add(id)
	else set.delete(id)
	elevatorCallLinkage.location_ids = [...set]
}

const { thresholdOptions, ensureLoaded: ensureEnvironmentCatalogLoaded } =
	useEnvironmentParameterCatalog()

const parameterOptions = computed<OptionItem[]>(() => thresholdOptions.value)

const zonesCache = useZonesCache()
const zones = ref<UnifiedZone[]>([])
const selectedZoneId = ref<string>("")
const selectedLocationId = ref<string>("")

const zoneOptions = computed<OptionItem[]>(() => {
	const base: OptionItem[] = [{ value: "", label: "全域" }]
	return base.concat(zones.value.map((z) => ({ value: String(z.id), label: z.name })))
})

const locationOptions = computed<OptionItem[]>(() => {
	if (!selectedZoneId.value) return []
	const zone = zones.value.find((z) => String(z.id) === String(selectedZoneId.value))
	const locations = zone?.locations || []
	return locations.map((l) => ({ value: String(l.id), label: l.name }))
})

const resetForm = () => {
	form.source = "environment"
	form.alert_type = "threshold"
	form.severity = "warning"
	form.target_type = null
	form.target_id = null
	form.message_suffix = ""
	form.enabled = true

	thresholdConfig.parameter = ""
	thresholdConfig.operator = ">"
	thresholdConfig.value = 0
	thresholdConfig.unit = ""
	errorCountConfig.min_errors = 5
	ioAddress.value = 0
	selectedZoneId.value = ""
	selectedLocationId.value = ""

	energyConditionType.value = "energy_contract_stage"
	energyConfig.level = 1
	energyConfig.threshold_pct = 80
	energyConfig.stale_minutes = 15
	energyConfig.multiplier = 3
	energyConfig.min_kwh = 10

	doLinkage.enabled = false
	doLinkage.do_device_id = null
	doLinkage.do_address = null
	doLinkage.do_output_value = "on"
	doLinkage.auto_off_seconds = null

	cameraLinkage.enabled = false
	cameraLinkage.camera_device_ids = [null]

	accessDoorLinkage.enabled = false
	accessDoorLinkage.allDevices = true
	accessDoorLinkage.device_ids = []

	sipRingLinkage.enabled = false
	sipRingLinkage.allDevices = true
	sipRingLinkage.device_ids = []

	elevatorCallLinkage.enabled = false
	elevatorCallLinkage.allLocations = true
	elevatorCallLinkage.location_ids = []

	email.enabled = false
	email.smtp_host = ""
	email.smtp_port = 587
	email.smtp_user = ""
	email.smtp_password = ""
	email.smtp_security = "tls"
	email.to_emails_text = ""
	email.repeat_min_interval_seconds = 15
	email.repeat_max_send_count = 10

	localErrorMessage.value = ""

	expandedSections.linkage = false
	expandedSections.notify = false
}

const handleAddCameraDeviceSlot = () => {
	if (cameraDeviceIdsModel.value.length >= 4) return
	cameraDeviceIdsModel.value = [...cameraDeviceIdsModel.value, null]
}

const handleRemoveCameraDeviceSlot = (index: number) => {
	const next = [...cameraDeviceIdsModel.value]
	next.splice(index, 1)
	cameraDeviceIdsModel.value = next.length > 0 ? next : [null]
}

const handleUpdateCameraDeviceId = (index: number, value: string) => {
	const n = Number(value)
	const next = [...cameraDeviceIdsModel.value]
	next[index] = Number.isFinite(n) && n > 0 ? n : null
	cameraDeviceIdsModel.value = next
}

const handleSelectZone = (zoneId: string) => {
	selectedZoneId.value = zoneId || ""
	selectedLocationId.value = ""
	// 目標映射：若選 location → target_type=location；若只選 zone → target_type=zone；都不選 → global
	if (!selectedZoneId.value) {
		form.target_type = null
		form.target_id = null
		return
	}
	form.target_type = "zone"
	form.target_id = Number(selectedZoneId.value)
}

const handleSelectLocation = (locationId: string) => {
	selectedLocationId.value = locationId || ""
	if (!selectedZoneId.value) {
		form.target_type = null
		form.target_id = null
		return
	}
	if (!selectedLocationId.value) {
		form.target_type = "zone"
		form.target_id = Number(selectedZoneId.value)
		return
	}
	form.target_type = "location"
	form.target_id = Number(selectedLocationId.value)
}

const loadZones = async () => {
	const systemType = alertSourceToSystemType(form.source)
	if (!systemType) {
		zones.value = []
		return
	}
	const z = await zonesCache.getZones(systemType)
	zones.value = z || []
}

const conditionTypeForPayload = (): AlertConditionType => {
	if (form.alert_type === "offline") return "error_count"
	if (form.alert_type === "di" || form.alert_type === "do") return "bit_state"
	return "threshold"
}

const buildConditionConfig = (): Record<string, unknown> => {
	if (form.alert_type === "threshold") {
		return {
			parameter: thresholdConfig.parameter.trim(),
			operator: thresholdConfig.operator,
			value: Number(thresholdConfig.value),
			unit: thresholdConfig.unit.trim(),
		}
	}
	if (form.alert_type === "offline") {
		return {
			min_errors: Math.max(1, Number(errorCountConfig.min_errors) || 1),
		}
	}
	const addr = normalizeModbusAddressInput(ioAddress.value)
	return {
		bit_key: `${form.alert_type}:${addr}`,
	}
}

const handleIoAddressBlur = () => {
	ioAddress.value = normalizeModbusAddressInput(ioAddress.value)
}

const loadDevices = async () => {
	if (devices.value.length > 0) return
	if (devicesLoadPromise) {
		await devicesLoadPromise
		return
	}
	isDevicesLoading.value = true
	devicesLoadPromise = (async () => {
		try {
			const res = await deviceApi.getDevices({
				limit: 500,
				offset: 0,
				orderBy: "id",
				order: "desc",
			})
			devices.value = Array.isArray(res.devices) ? res.devices : []
		} catch {
			devices.value = []
		} finally {
			isDevicesLoading.value = false
			devicesLoadPromise = null
		}
	})()
	await devicesLoadPromise
}

/** 門禁／室內機清單（不依連線狀態過濾） */
const loadAccessDevices = () => loadTypedDevices(accessDevices, isAccessDevicesLoading, "access_control")

const loadIndoorDevices = () =>
	loadTypedDevices(indoorDevices, isIndoorDevicesLoading, "video_intercom", isIndoorIntercomDevice)

const loadElevatorSites = async () => {
	if (elevatorSites.value.length > 0 || isElevatorSitesLoading.value) return
	isElevatorSitesLoading.value = true
	try {
		const z = await zonesCache.getZones("elevator")
		const items: Array<{ id: number; label: string }> = []
		for (const zone of z || []) {
			const zoneName = String(zone.name || "").trim()
			for (const loc of zone.locations || []) {
				const id = Number(loc.id)
				if (!Number.isFinite(id) || id <= 0) continue
				const locName = String(loc.name || "").trim() || "(未命名)"
				items.push({
					id,
					label: zoneName ? `${zoneName} - ${locName}` : locName,
				})
			}
		}
		elevatorSites.value = items
	} catch {
		elevatorSites.value = []
	} finally {
		isElevatorSitesLoading.value = false
	}
}

const loadIntegrationsForRule = async (ruleId: number) => {
	try {
		const res = await alertApi.getAlertRuleIntegrations(ruleId)
		const d = res?.doLinkage
		doLinkage.enabled = Boolean(d?.enabled)
		doLinkage.do_device_id = d?.do_device_id ?? null
		doLinkage.do_address = d?.do_address ?? null
		doLinkage.do_output_value = (d?.do_output_value as "on" | "off") || "on"
		doLinkage.auto_off_seconds = d?.auto_off_seconds ?? null

		const c = res?.cameraLinkage
		cameraLinkage.enabled =
			canUseCameraLinkage.value && Boolean(c?.enabled)
		const idsRaw = (c as any)?.camera_device_ids as unknown
		const ids = Array.isArray(idsRaw)
			? (idsRaw as unknown[])
					.map((v) => Number(v))
					.filter((n): n is number => Number.isFinite(n) && n > 0)
					.slice(0, 4)
			: []
		const merged = [...new Set(ids)].slice(0, 4)
		cameraLinkage.camera_device_ids = merged.length > 0 ? merged : [null]

		accessDoorLinkage.enabled =
			canUseAccessDoorLinkage.value && Boolean(res?.accessDoorLinkage?.enabled)
		const accessMerged = normalizeAlertRuleDeviceIds(
			Array.isArray(res?.accessDoorLinkage?.device_ids) ? res.accessDoorLinkage.device_ids : []
		)
		accessDoorLinkage.allDevices = accessMerged.length === 0
		accessDoorLinkage.device_ids = accessMerged

		sipRingLinkage.enabled =
			canUseSipRingLinkage.value && Boolean(res?.sipRingLinkage?.enabled)
		const sipMerged = normalizeAlertRuleDeviceIds(
			Array.isArray(res?.sipRingLinkage?.device_ids) ? res.sipRingLinkage.device_ids : []
		)
		sipRingLinkage.allDevices = sipMerged.length === 0
		sipRingLinkage.device_ids = sipMerged

		elevatorCallLinkage.enabled =
			canUseElevatorCallLinkage.value && Boolean(res?.elevatorCallLinkage?.enabled)
		const elevatorMerged = normalizeAlertRuleDeviceIds(
			Array.isArray(res?.elevatorCallLinkage?.location_ids)
				? res.elevatorCallLinkage.location_ids
				: []
		)
		elevatorCallLinkage.allLocations = elevatorMerged.length === 0
		elevatorCallLinkage.location_ids = elevatorMerged

		const es = (res as any)?.emailSubscription
		email.enabled = Boolean(es?.enabled)
		email.smtp_host = String(es?.smtp_host || "")
		email.smtp_port = Number(es?.smtp_port ?? 587)
		email.smtp_user = String(es?.smtp_user || "")
		email.smtp_password = String(es?.smtp_password || "")
		email.smtp_security = String(es?.smtp_security || "tls") as any as "none" | "ssl" | "tls"
		email.to_emails_text = Array.isArray(es?.to_emails) ? es.to_emails.join("\n") : ""
		email.repeat_min_interval_seconds = Number(es?.repeat_min_interval_seconds ?? 15)
		email.repeat_max_send_count = Number(es?.repeat_max_send_count ?? 10)
	} catch {
		// ignore
	}
}

watch(
	() => form.source,
	(next) => {
		if (next !== "energy") return
		form.target_type = null
		form.target_id = null
		selectedZoneId.value = ""
		selectedLocationId.value = ""
	},
)

watch(
	() => [form.source, form.alert_type] as const,
	async ([nextSource]) => {
		await loadZones()
		// 切換來源後，若原本選的 zone/location 不存在就重置
		const zoneExists = selectedZoneId.value
			? zones.value.some((z) => String(z.id) === String(selectedZoneId.value))
			: true
		if (!zoneExists) {
			handleSelectZone("")
		}

		// 編輯模式：若只帶 locationId，從 zones 反推 zoneId，確保 location 下拉可用
		if (selectedLocationId.value && !selectedZoneId.value) {
			for (const z of zones.value) {
				const exists = (z.locations || []).some(
					(l) => String(l.id) === String(selectedLocationId.value)
				)
				if (exists) {
					selectedZoneId.value = String(z.id)
					break
				}
			}
			if (selectedZoneId.value) {
				form.target_type = "location"
				form.target_id = Number(selectedLocationId.value)
			}
		}
	},
	{ immediate: true }
)

watch(
	() => props.editingRule,
	async (rule) => {
		if (!rule) {
			resetForm()
			return
		}
		form.source = rule.source
		form.alert_type = rule.alert_type
		form.severity =
			rule.source === "energy" && rule.severity === "error"
				? "error"
				: rule.severity === "error"
					? "critical"
					: rule.severity
		form.target_type = ((rule as any).target_type as AlertTargetType) || null
		form.target_id = (rule as any).target_id != null ? Number((rule as any).target_id) : null
		form.message_suffix = String((rule as AlertRule).message_suffix || "")
		form.enabled = rule.enabled

		// 目標反推：location > zone；其餘視為全域
		selectedZoneId.value = ""
		selectedLocationId.value = ""
		if (form.target_type === "location" && form.target_id != null) {
			selectedLocationId.value = String(form.target_id)
			form.target_type = "location"
		} else if (form.target_type === "zone" && form.target_id != null) {
			selectedZoneId.value = String(form.target_id)
			form.target_type = "zone"
		} else {
			form.target_type = null
			form.target_id = null
		}

		if (rule.condition_type === "threshold") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			thresholdConfig.parameter = String(config.parameter || "")
			const rawOp = String(config.operator || ">")
			thresholdConfig.operator = isAllowedThresholdOperator(rawOp) ? rawOp : ">"
			thresholdConfig.value = Number(config.value ?? 0)
			thresholdConfig.unit = String(config.unit || "")
		} else if (rule.condition_type === "energy_contract_stage") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			energyConditionType.value = "energy_contract_stage"
			energyConfig.level = Number(config.level ?? 1)
			energyConfig.threshold_pct = Number(config.threshold_pct ?? 80)
		} else if (rule.condition_type === "energy_meter_stale") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			energyConditionType.value = "energy_meter_stale"
			energyConfig.stale_minutes = Number(config.stale_minutes ?? 15)
		} else if (rule.condition_type === "energy_reading_jump") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			energyConditionType.value = "energy_reading_jump"
			energyConfig.multiplier = Number(config.multiplier ?? 3)
			energyConfig.min_kwh = Number(config.min_kwh ?? 10)
		} else if (rule.condition_type === "error_count") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			errorCountConfig.min_errors = Number(config.min_errors ?? 5)
		} else if (rule.condition_type === "bit_state") {
			const config = (rule.condition_config || {}) as Record<string, unknown>
			const bitKey = String(config.bit_key || "")
			const match = bitKey.match(/^(di|do):(\d+)$/i)
			ioAddress.value = normalizeModbusAddressInput(match ? Number(match[2]) : 0)
		}

		if (import.meta.client) {
			if (devices.value.length === 0 && !isDevicesLoading.value) {
				void loadDevices()
			}
			if (accessDevices.value.length === 0 && !isAccessDevicesLoading.value) {
				void loadAccessDevices()
			}
			if (indoorDevices.value.length === 0 && !isIndoorDevicesLoading.value) {
				void loadIndoorDevices()
			}
			if (canUseElevatorCallLinkage.value) {
				void loadElevatorSites()
			}
			if (rule.id) {
				void loadIntegrationsForRule(rule.id)
			}
		}
	},
	{ immediate: true }
)

watch(
	() => thresholdConfig.parameter,
	(next) => {
		const unit = getParameterUnit(next)
		if (unit) thresholdConfig.unit = unit
	}
)

watch(
	() => props.modelValue,
	(open) => {
		if (!open) return
		smtpTestFeedback.ok = false
		smtpTestFeedback.message = ""
		if (!import.meta.client) return
		void ensureEnvironmentCatalogLoaded()
		if (devices.value.length === 0 && !isDevicesLoading.value) {
			void loadDevices()
		}
		if (accessDevices.value.length === 0 && !isAccessDevicesLoading.value) {
			void loadAccessDevices()
		}
		if (indoorDevices.value.length === 0 && !isIndoorDevicesLoading.value) {
			void loadIndoorDevices()
		}
		if (canUseElevatorCallLinkage.value) {
			void loadElevatorSites()
		}
	},
	{ immediate: true }
)

const buildAlertRuleValidationInput = () => ({
	target_type: form.target_type || null,
	target_id: form.target_id != null ? Number(form.target_id) : null,
	doLinkage: {
		enabled: doLinkage.enabled,
		do_device_id: doLinkage.do_device_id,
		do_address: doLinkage.do_address,
		auto_off_seconds: doLinkage.auto_off_seconds,
	},
	cameraLinkage: {
		enabled: cameraLinkage.enabled,
		camera_device_ids: normalizeAlertRuleCameraDeviceIds(cameraDeviceIdsModel.value),
	},
	accessDoorLinkage: {
		enabled: accessDoorLinkage.enabled,
		allDevices: accessDoorLinkage.allDevices,
		device_ids: normalizeAlertRuleDeviceIds(accessDoorLinkage.device_ids),
	},
	sipRingLinkage: {
		enabled: sipRingLinkage.enabled,
		allDevices: sipRingLinkage.allDevices,
		device_ids: normalizeAlertRuleDeviceIds(sipRingLinkage.device_ids),
	},
	elevatorCallLinkage: {
		enabled: elevatorCallLinkage.enabled,
		allLocations: elevatorCallLinkage.allLocations,
		location_ids: normalizeAlertRuleDeviceIds(elevatorCallLinkage.location_ids),
	},
	email,
})

const handleEmailSmtpTestClick = async () => {
	localErrorMessage.value = ""
	smtpTestFeedback.ok = false
	smtpTestFeedback.message = ""

	const ruleId = props.editingRule?.id
	if (!ruleId) {
		localErrorMessage.value = "SMTP 測試：請先建立並儲存規則"
		return
	}

	const err = validateAlertRuleEmailSubscription(email, "SMTP 測試")
	if (err) {
		localErrorMessage.value = err
		return
	}

	isEmailSmtpTestLoading.value = true
	try {
		const res = await alertApi.testAlertRuleSmtpEmail(ruleId, {
			emailSubscription: {
				enabled: Boolean(email.enabled),
				smtp_host: email.smtp_host.trim(),
				smtp_port: Number(email.smtp_port),
				smtp_user: email.smtp_user.trim(),
				smtp_password: email.smtp_password || null,
				smtp_security: email.smtp_security,
				to_emails: parseAlertRuleEmailsFromText(email.to_emails_text),
			},
		})

		smtpTestFeedback.ok = true
		smtpTestFeedback.message = `SMTP 測試寄送成功（messageId: ${String(res?.messageId || "") || "—"}）`
	} catch (e: any) {
		smtpTestFeedback.ok = false
		smtpTestFeedback.message = `SMTP 測試寄送失敗：${String(e?.data?.message || e?.message || e || "未知錯誤")}`
	} finally {
		isEmailSmtpTestLoading.value = false
	}
}

const handleSubmit = () => {
	localErrorMessage.value = ""
	smtpTestFeedback.ok = false
	smtpTestFeedback.message = ""

	const submitError = validateAlertRuleFormForSave(buildAlertRuleValidationInput())
	if (submitError) {
		localErrorMessage.value = submitError
		return
	}

	const targetType = isEnergySource.value ? null : form.target_type || null
	const targetId =
		isEnergySource.value || form.target_id == null ? null : Number(form.target_id)

	// 能源門檻由能源參數設定維護；此處只送啟用／嚴重度／後綴（後端也會剝除 condition）
	const rulePayload: SubmitPayload = isEnergySource.value
		? {
				severity: form.severity,
				message_suffix: form.message_suffix ?? null,
				enabled: form.enabled,
			}
		: {
				source: form.source,
				alert_type: form.alert_type,
				severity: form.severity,
				target_type: targetType,
				target_id: targetId,
				condition_type: conditionTypeForPayload(),
				condition_config: buildConditionConfig(),
				message_suffix: form.message_suffix ?? null,
				enabled: form.enabled,
			}

	const integrations: IntegrationsDraft = {
		doLinkage: doLinkage.enabled
			? {
					enabled: true,
					do_device_id: doLinkage.do_device_id,
					do_address: doLinkage.do_address,
					do_output_value: doLinkage.do_output_value,
					auto_off_seconds: doLinkage.auto_off_seconds,
				}
			: null,
		cameraLinkage: cameraLinkage.enabled && canUseCameraLinkage.value
			? {
					enabled: true,
					camera_device_ids: normalizeAlertRuleCameraDeviceIds(cameraDeviceIdsModel.value).slice(
						0,
						4
					),
				}
			: null,
		accessDoorLinkage: accessDoorLinkage.enabled && canUseAccessDoorLinkage.value
			? {
					enabled: true,
					device_ids: accessDoorLinkage.allDevices
						? []
						: normalizeAlertRuleDeviceIds(accessDoorLinkage.device_ids),
				}
			: null,
		sipRingLinkage: sipRingLinkage.enabled && canUseSipRingLinkage.value
			? {
					enabled: true,
					device_ids: sipRingLinkage.allDevices
						? []
						: normalizeAlertRuleDeviceIds(sipRingLinkage.device_ids),
				}
			: null,
		elevatorCallLinkage: elevatorCallLinkage.enabled && canUseElevatorCallLinkage.value
			? {
					enabled: true,
					location_ids: elevatorCallLinkage.allLocations
						? []
						: normalizeAlertRuleDeviceIds(elevatorCallLinkage.location_ids),
				}
			: null,
		emailSubscription: email.enabled
			? {
					enabled: true,
					smtp_host: email.smtp_host.trim(),
					smtp_port: Number(email.smtp_port),
					smtp_user: email.smtp_user.trim(),
					smtp_password: email.smtp_password || null,
					smtp_security: email.smtp_security,
					to_emails: parseAlertRuleEmailsFromText(email.to_emails_text),
					repeat_min_interval_seconds: Number(email.repeat_min_interval_seconds),
					repeat_max_send_count: Number(email.repeat_max_send_count),
				}
			: null,
	}

	emit("submit", { rule: rulePayload, integrations })
}
</script>
