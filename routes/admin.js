const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const dataPath = (file) => path.join(__dirname, '../data', file);
const readData = (file) => JSON.parse(fs.readFileSync(dataPath(file), 'utf8'));
const writeData = (file, data) => fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));

// 鉴权中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }
  
  try {
    const decoded = jwt.verify(token, req.app.get('jwtSecret'));
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
};

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = readData('admin.json');
  if (username === admin.username && password === admin.password) {
    const token = jwt.sign({ username }, req.app.get('jwtSecret'), { expiresIn: '24h' });
    res.json({ success: true, token });
  } else {
    res.json({ success: false, message: '用户名或密码错误' });
  }
});

// 获取所有抽奖活动
router.get('/lotteries', authMiddleware, (req, res) => {
  const lotteries = readData('lotteries.json');
  res.json(lotteries);
});

// 创建抽奖活动
router.post('/lotteries', authMiddleware, (req, res) => {
  const lotteries = readData('lotteries.json');
  const newLottery = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  lotteries.push(newLottery);
  writeData('lotteries.json', lotteries);
  res.json({ success: true, lottery: newLottery });
});

// 更新抽奖活动
router.put('/lotteries/:id', authMiddleware, (req, res) => {
  const lotteries = readData('lotteries.json');
  const index = lotteries.findIndex(l => l.id === req.params.id);
  if (index !== -1) {
    lotteries[index] = { ...lotteries[index], ...req.body };
    writeData('lotteries.json', lotteries);
    res.json({ success: true, lottery: lotteries[index] });
  } else {
    res.status(404).json({ success: false, message: '抽奖活动不存在' });
  }
});

// 删除抽奖活动
router.delete('/lotteries/:id', authMiddleware, (req, res) => {
  const lotteries = readData('lotteries.json');
  const filtered = lotteries.filter(l => l.id !== req.params.id);
  writeData('lotteries.json', filtered);
  res.json({ success: true });
});

// 生成抽奖码
router.post('/codes', authMiddleware, (req, res) => {
  const { lotteryId, count } = req.body;
  const codes = readData('codes.json');
  const newCodes = [];
  for (let i = 0; i < count; i++) {
    newCodes.push({
      id: uuidv4(),
      code: uuidv4(),
      lotteryId,
      used: false,
      createdAt: new Date().toISOString()
    });
  }
  codes.push(...newCodes);
  writeData('codes.json', codes);
  res.json({ success: true, codes: newCodes });
});

// 获取抽奖码列表
router.get('/codes/:lotteryId', authMiddleware, (req, res) => {
  const codes = readData('codes.json');
  const lotteryCodes = codes.filter(c => c.lotteryId === req.params.lotteryId);
  res.json(lotteryCodes);
});

// 删除抽奖码
router.delete('/codes/:id', authMiddleware, (req, res) => {
  const codes = readData('codes.json');
  const filtered = codes.filter(c => c.id !== req.params.id);
  writeData('codes.json', filtered);
  res.json({ success: true });
});

// 获取抽奖结果
router.get('/results/:lotteryId', authMiddleware, (req, res) => {
  const results = readData('results.json');
  const lotteryResults = results.filter(r => r.lotteryId === req.params.lotteryId);
  res.json(lotteryResults);
});

// 设置黑幕
router.post('/codes/fixed-prize', authMiddleware, (req, res) => {
  const { codeIds, fixedPrize } = req.body;
  
  if (!Array.isArray(codeIds) || codeIds.length === 0) {
    return res.json({ success: false, message: '请选择抽奖码' });
  }
  
  const codes = readData('codes.json');
  let updated = 0;
  
  codeIds.forEach(codeId => {
    const code = codes.find(c => c.id === codeId);
    if (code && !code.used) {
      if (fixedPrize === null) {
        delete code.fixedPrize;
      } else {
        code.fixedPrize = fixedPrize;
      }
      updated++;
    }
  });
  
  writeData('codes.json', codes);
  res.json({ success: true, message: `成功更新 ${updated} 个抽奖码` });
});

// 导出抽奖结果CSV (支持URL参数token)
router.get('/export/:lotteryId', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }
  
  try {
    jwt.verify(token, req.app.get('jwtSecret'));
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
  
  const results = readData('results.json');
  const lotteryResults = results.filter(r => r.lotteryId === req.params.lotteryId);
  
  let csv = '抽奖码,中奖选项,抽奖时间,类型\n';
  lotteryResults.forEach(r => {
    csv += `${r.code},${r.prize || '未中奖'},${r.timestamp},${r.isCoward ? '懦夫选项' : '正常抽奖'}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=lottery-results-${req.params.lotteryId}.csv`);
  res.send('\uFEFF' + csv);
});

// 导出抽奖码CSV (支持URL参数token)
router.get('/export-codes/:lotteryId', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权访问' });
  }
  
  try {
    jwt.verify(token, req.app.get('jwtSecret'));
  } catch (error) {
    return res.status(401).json({ success: false, message: '无效的令牌' });
  }
  
  const codes = readData('codes.json');
  const lotteryCodes = codes.filter(c => c.lotteryId === req.params.lotteryId);
  
  let csv = '抽奖码,状态,创建时间\n';
  lotteryCodes.forEach(c => {
    csv += `${c.code},${c.used ? '已使用' : '未使用'},${c.createdAt}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=lottery-codes-${req.params.lotteryId}.csv`);
  res.send('\uFEFF' + csv);
});

module.exports = router;
