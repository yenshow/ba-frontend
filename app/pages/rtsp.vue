<template>
	<div class="container mx-auto p-6">
		<h1 class="text-3xl font-bold mb-6">RTSP 串流播放</h1>

		<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
			<div class="mb-4">
				<label for="rtsp-url" class="block text-sm font-medium text-gray-700 mb-2"> RTSP URL </label>
				<div class="flex gap-2">
					<input
						id="rtsp-url"
						v-model="rtspUrl"
						type="text"
						placeholder="rtsp://admin:password@192.168.1.100:554/stream"
						class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						@click="handleStart"
						:disabled="loading || !rtspUrl"
						class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						啟動串流
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

			<div v-if="currentStreamId" class="text-sm text-gray-600">
				<p>串流 ID: {{ currentStreamId }}</p>
				<p v-if="hlsUrl">HLS URL: {{ hlsUrl }}</p>
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
const loading = ref(false);
const streams = ref<any[]>([]);
const videoPlayerRef = ref<any>(null);

// 載入所有串流狀態
const loadStreams = async () => {
	try {
		streams.value = await rtspApi.getAllStreamStatus();
	} catch (error) {
		console.error("載入串流狀態失敗:", error);
	}
};

// 啟動串流
const handleStart = async () => {
	if (!rtspUrl.value) {
		return;
	}

	loading.value = true;
	try {
		const streamInfo = await rtspApi.startStream(rtspUrl.value);
		currentStreamId.value = streamInfo.streamId;
		hlsUrl.value = streamInfo.hlsUrl;

		// 等待 HLS 文件生成和 props 更新（低延遲模式，減少等待時間）
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// 使用 nextTick 確保 props 已更新到子組件
		await nextTick();

		// 啟動視頻播放器（傳入已啟動的串流信息）
		// 注意：由於我們已經設置了 hlsUrl prop，watch 會自動觸發初始化
		// 但為了確保，我們還是手動調用一次
		if (videoPlayerRef.value) {
			// 再次等待確保 DOM 更新完成
			await new Promise((resolve) => setTimeout(resolve, 500));
			await videoPlayerRef.value.startStream();
		}

		// 重新載入串流列表
		await loadStreams();
	} catch (error) {
		console.error("啟動串流失敗:", error);
		alert(error instanceof Error ? error.message : "啟動串流失敗");
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
	try {
		await rtspApi.stopStream(currentStreamId.value);
		currentStreamId.value = "";
		hlsUrl.value = "";

		// 停止視頻播放器
		if (videoPlayerRef.value) {
			await videoPlayerRef.value.stopStream();
		}

		// 重新載入串流列表
		await loadStreams();
	} catch (error) {
		console.error("停止串流失敗:", error);
		alert(error instanceof Error ? error.message : "停止串流失敗");
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
