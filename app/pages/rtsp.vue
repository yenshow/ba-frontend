<template>
	<div class="container mx-auto p-6">
		<h1 class="text-3xl font-bold mb-6">RTSP 串流測試</h1>

		<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
			<div class="mb-4">
				<label for="rtsp-url" class="block text-sm font-medium text-gray-700 mb-2">
					RTSP URL
					<span class="text-xs text-gray-500 ml-2">(格式: rtsp://username:password@ip:port/path)</span>
				</label>
				<div class="flex gap-2">
					<input
						id="rtsp-url"
						v-model="rtspUrl"
						type="text"
						placeholder="rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101"
						class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
					/>
					<button
						@click="handleStart"
						:disabled="loading || !rtspUrl"
						class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						{{ loading ? "啟動中..." : "啟動串流" }}
					</button>
					<button
						v-if="currentStreamId"
						@click="handleStop"
						:disabled="loading"
						class="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						停止串流
					</button>
				</div>
			</div>

			<!-- 串流資訊顯示 -->
			<div v-if="currentStreamId" class="mt-4 p-4 bg-gray-50 rounded-md">
				<h3 class="text-sm font-semibold text-gray-700 mb-2">串流資訊</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
					<div>
						<span class="font-medium text-gray-600">串流 ID:</span>
						<span class="ml-2 font-mono text-gray-800">{{ currentStreamId.substring(0, 16) }}...</span>
					</div>
					<div v-if="hlsUrl">
						<span class="font-medium text-gray-600">HLS URL:</span>
						<span class="ml-2 font-mono text-blue-600 break-all">{{ hlsUrl }}</span>
					</div>
					<div v-if="webrtcUrl">
						<span class="font-medium text-gray-600">WebRTC URL:</span>
						<span class="ml-2 font-mono text-green-600 break-all">{{ webrtcUrl }}</span>
						<span class="ml-2 text-xs text-gray-500">(低延遲選項)</span>
					</div>
					<div v-if="streamStatus">
						<span class="font-medium text-gray-600">狀態:</span>
						<span
							:class="[
								'ml-2 px-2 py-1 rounded text-xs',
								streamStatus === 'running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
							]"
						>
							{{ streamStatus === "running" ? "運行中" : "已停止" }}
						</span>
					</div>
					<div v-if="streamStartedAt">
						<span class="font-medium text-gray-600">啟動時間:</span>
						<span class="ml-2 text-gray-800">{{ formatTime(streamStartedAt) }}</span>
					</div>
				</div>
			</div>

			<!-- 錯誤訊息顯示 -->
			<div v-if="errorMessage" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
				<h3 class="text-sm font-semibold text-red-700 mb-2">錯誤訊息</h3>
				<p class="text-sm text-red-600 whitespace-pre-line">{{ errorMessage }}</p>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-xl font-semibold mb-4">視頻播放器</h2>
			<div class="w-full" style="height: 600px">
				<RtspVideoPlayer :rtsp-url="rtspUrl" :hls-url="hlsUrl" :stream-id="currentStreamId" :auto-start="false" ref="videoPlayerRef" />
			</div>
		</div>

		<div v-if="streams.length > 0" class="mt-6 bg-white rounded-lg shadow-lg p-6">
			<h2 class="text-xl font-semibold mb-4">所有串流狀態</h2>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">串流 ID</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RTSP URL</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">開始時間</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						<tr v-for="stream in streams" :key="stream.streamId">
							<td class="px-6 py-4 whitespace-nowrap text-sm font-mono">{{ stream.streamId.substring(0, 8) }}...</td>
							<td class="px-6 py-4 text-sm text-gray-500">
								{{ stream.rtspUrl }}
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span
									:class="{
										'bg-green-100 text-green-800': stream.status === 'running',
										'bg-red-100 text-red-800': stream.status === 'stopped'
									}"
									class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
								>
									{{ stream.status === "running" ? "運行中" : "已停止" }}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								{{ new Date(stream.startedAt).toLocaleString() }}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								<button @click="stopStream(stream.streamId)" class="text-red-600 hover:text-red-900">停止</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const rtspApi = useRtspApi();

const rtspUrl = ref("rtsp://admin:Aa83124007@192.168.2.103:554/Streaming/Channels/101");
const currentStreamId = ref("");
const hlsUrl = ref("");
const webrtcUrl = ref("");
const loading = ref(false);
const streams = ref<any[]>([]);
const videoPlayerRef = ref<any>(null);
const errorMessage = ref<string>("");
const streamStatus = ref<string>("");
const streamStartedAt = ref<string>("");

// 載入所有串流狀態
const loadStreams = async () => {
	try {
		streams.value = await rtspApi.getAllStreamStatus();
	} catch (error) {
		console.error("載入串流狀態失敗:", error);
	}
};

// 格式化時間
const formatTime = (dateString: string) => {
	if (!dateString) return "";
	return new Date(dateString).toLocaleString("zh-TW");
};

// 啟動串流
const handleStart = async () => {
	if (!rtspUrl.value) {
		errorMessage.value = "請輸入 RTSP URL";
		return;
	}

	// 驗證 RTSP URL 格式
	if (!rtspUrl.value.startsWith("rtsp://")) {
		errorMessage.value = "RTSP URL 格式不正確，必須以 rtsp:// 開頭";
		return;
	}

	loading.value = true;
	errorMessage.value = "";
	currentStreamId.value = "";
	hlsUrl.value = "";
	streamStatus.value = "";
	streamStartedAt.value = "";

	try {
		console.log("[RTSP Test] 開始啟動串流:", rtspUrl.value.replace(/:[^:@]+@/, ":****@"));
		
		const streamInfo = await rtspApi.startStream(rtspUrl.value);
		currentStreamId.value = streamInfo.streamId;
		hlsUrl.value = streamInfo.hlsUrl;
		webrtcUrl.value = streamInfo.webrtcUrl || "";
		streamStatus.value = streamInfo.status;
		streamStartedAt.value = streamInfo.startedAt || new Date().toISOString();

		console.log("[RTSP Test] 串流啟動成功:", {
			streamId: streamInfo.streamId,
			hlsUrl: streamInfo.hlsUrl,
			webrtcUrl: streamInfo.webrtcUrl,
			status: streamInfo.status
		});

		// 使用 nextTick 確保 props 已更新到子組件
		await nextTick();
		// VideoPlayer 組件會自動偵測 hlsUrl 變化並立即初始化（無需額外等待）

		// 重新載入串流列表
		await loadStreams();
		
		console.log("[RTSP Test] 串流初始化完成");
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "啟動串流失敗";
		console.error("[RTSP Test] 啟動串流失敗:", error);
		errorMessage.value = `啟動串流失敗: ${errorMsg}\n\n請檢查：\n1. RTSP URL 是否正確\n2. 攝影機是否可以訪問\n3. 帳號密碼是否正確\n4. MediaMTX 服務是否正常運行（預設端口 9997）\n5. 後端服務是否正常運行`;
	} finally {
		loading.value = false;
	}
};

// 停止串流
const handleStop = async () => {
	if (!currentStreamId.value) {
		return;
	}

	loading.value = true;
	errorMessage.value = "";

	try {
		console.log("[RTSP Test] 停止串流:", currentStreamId.value);
		await rtspApi.stopStream(currentStreamId.value);
		
		// 停止視頻播放器
		if (videoPlayerRef.value) {
			await videoPlayerRef.value.stopStream();
		}

		// 清除狀態
		currentStreamId.value = "";
		hlsUrl.value = "";
		webrtcUrl.value = "";
		streamStatus.value = "";
		streamStartedAt.value = "";

		// 重新載入串流列表
		await loadStreams();
		
		console.log("[RTSP Test] 串流已停止");
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : "停止串流失敗";
		console.error("[RTSP Test] 停止串流失敗:", error);
		errorMessage.value = `停止串流失敗: ${errorMsg}`;
	} finally {
		loading.value = false;
	}
};

// 停止指定串流
const stopStream = async (streamId: string) => {
	try {
		await rtspApi.stopStream(streamId);
		await loadStreams();
	} catch (error) {
		console.error("停止串流失敗:", error);
		alert(error instanceof Error ? error.message : "停止串流失敗");
	}
};

// 定期更新串流狀態
onMounted(() => {
	loadStreams();
	// 每 5 秒更新一次串流狀態
	const interval = setInterval(loadStreams, 5000);
	onUnmounted(() => {
		clearInterval(interval);
	});
});
</script>
