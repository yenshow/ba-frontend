/**
 *   node --experimental-strip-types --test tests/unit/personnelSyncJobResult.test.mjs
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { assertPersonnelSyncJobOk } from "../../app/utils/personnelSyncJobResult.ts"

test("completed 無 error → 通過", () => {
	assert.doesNotThrow(() => assertPersonnelSyncJobOk({}))
	assert.doesNotThrow(() => assertPersonnelSyncJobOk({ error: null }))
})

test("completed + error.message → 拋錯（不得 toast 成功）", () => {
	assert.throws(
		() => assertPersonnelSyncJobOk({ error: { message: "未設定門禁設備" } }),
		/未設定門禁設備/,
	)
})

test("completed + error 字串 → 拋錯", () => {
	assert.throws(() => assertPersonnelSyncJobOk({ error: "同步失敗" }), /同步失敗/)
})
