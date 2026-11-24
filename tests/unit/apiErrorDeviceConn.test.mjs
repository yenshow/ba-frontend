/**
 * 雙端 useApiBase 裝置連線錯誤字串對照（勿再出現亂碼 ??????????）
 *
 *   node --test tests/unit/apiErrorDeviceConn.test.mjs
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const central = readFileSync(
	join(here, "../../app/composables/core/useApiBase.ts"),
	"utf8",
)
const construction = readFileSync(
	join(here, "../../../ba-frontend-construction/app/composables/core/useApiBase.ts"),
	"utf8",
)

test("Central／Construction 裝置連線錯誤皆比對「無法連接到後端伺服器」", () => {
	assert.match(central, /無法連接到後端伺服器/)
	assert.match(construction, /無法連接到後端伺服器/)
	assert.doesNotMatch(central, /\?\?\?\?\?\?\?\?\?\?/)
})
