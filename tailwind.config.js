/** @type {import('tailwindcss').Config} */
export default {
	content: ["./app/components/**/*.{js,vue,ts}", "./app/layouts/**/*.vue", "./app/pages/**/*.vue", "./app/plugins/**/*.{js,ts}", "./app/app.vue"],
	theme: {
		extend: {
			colors: {
				// BA 系統主色調
				ba: {
					primary: "#13A6A9", // 青綠色
					secondary: "#002247", // 深藍色
					dark: "#001529", // 更深的藍色
					light: "#E8F4F5" // 淺青色
				},
				// 狀態顏色
				status: {
					good: "#10B981", // 綠色 - 良好
					warning: "#F59E0B", // 橙色 - 警告
					danger: "#EF4444", // 紅色 - 危險
					info: "#3B82F6" // 藍色 - 資訊
				}
			}
		}
	},
	plugins: []
};
