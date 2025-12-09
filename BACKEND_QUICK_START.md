# 後端設備類型 API 快速實作指南

## 快速開始

根據錯誤訊息，後端需要實作 `/api/modbus/device-types` API。以下是快速實作步驟：

## 1. 建立資料表（如果尚未建立）

```sql
CREATE TABLE IF NOT EXISTS device_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '設備類型名稱',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '設備類型代碼',
    description TEXT COMMENT '設備類型描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入預設資料
INSERT INTO device_types (name, code, description) VALUES
('DDC 控制器', 'ddc_controller', '直接數位控制系統控制器'),
('感測器', 'sensor', '各種環境感測器'),
('執行器', 'actuator', '控制執行器'),
('閘道器', 'gateway', 'Modbus 閘道器設備')
ON DUPLICATE KEY UPDATE name=name;
```

## 2. 建立路由檔案

在後端專案中建立或更新 `routes/modbus/deviceTypes.js`：

```javascript
const express = require('express');
const router = express.Router();
const db = require('../../config/database'); // 根據你的資料庫配置調整路徑
const { authenticate, isAdmin } = require('../../middleware/auth'); // 根據你的認證中間件調整

// 取得所有設備類型（公開，不需要認證）
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM device_types ORDER BY id');
    res.json({ device_types: rows });
  } catch (error) {
    console.error('取得設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '取得設備類型失敗',
      details: error.message
    });
  }
});

// 取得單一設備類型（公開）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    res.json({ device_type: rows[0] });
  } catch (error) {
    console.error('取得設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '取得設備類型失敗',
      details: error.message
    });
  }
});

// 建立設備類型（需要管理員權限）
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        error: true,
        message: '設備類型名稱和代碼為必填欄位'
      });
    }
    
    // 檢查代碼是否已存在
    const [existing] = await db.query('SELECT id FROM device_types WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({
        error: true,
        message: '設備類型代碼已存在'
      });
    }
    
    const [result] = await db.query(
      'INSERT INTO device_types (name, code, description) VALUES (?, ?, ?)',
      [name, code, description || null]
    );
    
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [result.insertId]);
    
    res.status(201).json({
      message: '設備類型建立成功',
      device_type: rows[0]
    });
  } catch (error) {
    console.error('建立設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '建立設備類型失敗',
      details: error.message
    });
  }
});

// 更新設備類型（需要管理員權限）
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    
    const [existing] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    if (code && code !== existing[0].code) {
      const [duplicate] = await db.query('SELECT id FROM device_types WHERE code = ? AND id != ?', [code, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({
          error: true,
          message: '設備類型代碼已存在'
        });
      }
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (code !== undefined) {
      updateFields.push('code = ?');
      updateValues.push(code);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        error: true,
        message: '沒有提供要更新的欄位'
      });
    }
    
    updateValues.push(id);
    await db.query(
      `UPDATE device_types SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    const [rows] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    
    res.json({
      message: '設備類型更新成功',
      device_type: rows[0]
    });
  } catch (error) {
    console.error('更新設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '更新設備類型失敗',
      details: error.message
    });
  }
});

// 刪除設備類型（需要管理員權限）
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.query('SELECT * FROM device_types WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        error: true,
        message: '設備類型不存在'
      });
    }
    
    // 檢查是否有設備使用此類型
    const [devices] = await db.query('SELECT id FROM modbus_devices WHERE type_id = ? LIMIT 1', [id]);
    if (devices.length > 0) {
      return res.status(400).json({
        error: true,
        message: '無法刪除：仍有設備使用此類型'
      });
    }
    
    await db.query('DELETE FROM device_types WHERE id = ?', [id]);
    
    res.json({
      message: '設備類型刪除成功'
    });
  } catch (error) {
    console.error('刪除設備類型失敗:', error);
    res.status(500).json({
      error: true,
      message: '刪除設備類型失敗',
      details: error.message
    });
  }
});

module.exports = router;
```

## 3. 在主路由中註冊

在 `routes/modbus/index.js` 或類似檔案中添加：

```javascript
const express = require('express');
const router = express.Router();
const deviceTypesRouter = require('./deviceTypes');
const devicesRouter = require('./devices'); // 你現有的設備路由

router.use('/device-types', deviceTypesRouter);
router.use('/devices', devicesRouter);

module.exports = router;
```

## 4. 更新設備建立 API

在建立設備時，需要驗證 `type_id` 並自動填入 `device_type`：

```javascript
// 在 createDevice 函數中
const { name, type_id, host, port, unitId, description } = req.body;

// 驗證設備類型是否存在
const [deviceType] = await db.query('SELECT id, code FROM device_types WHERE id = ?', [type_id]);
if (deviceType.length === 0) {
  return res.status(400).json({
    error: true,
    message: '設備類型不存在'
  });
}

// 使用設備類型的 code 作為 device_type
const device_type = deviceType[0].code;

// 建立設備（假設你的表有 device_type 欄位）
await db.query(
  'INSERT INTO modbus_devices (name, type_id, device_type, host, port, unit_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [name, type_id, device_type, host, port, unitId, description || null]
);
```

## 5. 測試 API

使用 curl 或 Postman 測試：

```bash
# 取得所有設備類型
curl http://localhost:4000/api/modbus/device-types

# 建立設備類型（需要管理員 token）
curl -X POST http://localhost:4000/api/modbus/device-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "測試設備類型",
    "code": "test_device",
    "description": "測試描述"
  }'
```

## 注意事項

1. **資料庫配置**：確保 `db` 的引入路徑正確
2. **認證中間件**：確保 `authenticate` 和 `isAdmin` 中間件路徑正確
3. **CORS 設定**：確保前端地址已加入 CORS 允許列表
4. **錯誤處理**：根據你的後端架構調整錯誤處理方式

## 完成後

實作完成後，前端應該能夠：
- 載入設備類型列表
- 建立新的設備類型
- 編輯現有設備類型
- 刪除設備類型（如果沒有設備使用）

詳細的實作指南請參考 `BACKEND_DEVICE_TYPE_IMPLEMENTATION.md`。

