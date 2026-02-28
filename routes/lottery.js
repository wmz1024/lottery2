const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataPath = (file) => path.join(__dirname, '../data', file);
const readData = (file) => JSON.parse(fs.readFileSync(dataPath(file), 'utf8'));
const writeData = (file, data) => fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));

// 验证抽奖码
router.post('/verify', (req, res) => {
  const { code } = req.body;
  const codes = readData('codes.json');
  const codeData = codes.find(c => c.code === code);
  
  if (!codeData) {
    return res.json({ success: false, message: '抽奖码无效' });
  }
  
  const lotteries = readData('lotteries.json');
  const lottery = lotteries.find(l => l.id === codeData.lotteryId);
  
  if (!lottery) {
    return res.json({ success: false, message: '抽奖活动不存在' });
  }
  
  // 检查是否已抽奖
  const results = readData('results.json');
  const existingResult = results.find(r => r.code === code);
  
  res.json({
    success: true,
    lottery,
    used: codeData.used,
    result: existingResult
  });
});

// 执行抽奖
router.post('/draw', (req, res) => {
  const { code } = req.body;
  const codes = readData('codes.json');
  const codeData = codes.find(c => c.code === code);
  
  if (!codeData) {
    return res.json({ success: false, message: '抽奖码无效' });
  }
  
  if (codeData.used) {
    return res.json({ success: false, message: '抽奖码已使用' });
  }
  
  const lotteries = readData('lotteries.json');
  const lottery = lotteries.find(l => l.id === codeData.lotteryId);
  
  if (!lottery) {
    return res.json({ success: false, message: '抽奖活动不存在' });
  }
  
  let prize = null;
  let prizeValue = null;
  
  // 检查是否有黑幕设置
  if (codeData.fixedPrize) {
    const fixedPrize = codeData.fixedPrize;
    prize = fixedPrize.prize;
    
    if (prize && fixedPrize.specificValue !== undefined) {
      // 指定具体数值
      prizeValue = fixedPrize.specificValue;
      prize = `${prize} ${prizeValue}${fixedPrize.unit || ''}`;
    } else if (prize && fixedPrize.rangeMin !== undefined) {
      // 自定义区间随机
      const randomValue = Math.random() * (fixedPrize.rangeMax - fixedPrize.rangeMin) + fixedPrize.rangeMin;
      prizeValue = Math.round(randomValue * 100) / 100;
      prize = `${prize} ${prizeValue}${fixedPrize.unit || ''}`;
    } else if (prize) {
      // 原区间随机或普通奖品
      const option = lottery.options.find(o => o.name === prize);
      if (option && option.range) {
        const { min, max, unit } = option.range;
        const randomValue = Math.random() * (max - min) + min;
        prizeValue = Math.round(randomValue * 100) / 100;
        prize = `${prize} ${prizeValue}${unit}`;
      }
    }
  } else {
    // 正常抽奖逻辑
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const option of lottery.options) {
      cumulative += option.probability;
      if (random < cumulative) {
        prize = option.name;
        
        // 如果是区间奖品，随机生成数值
        if (option.range) {
          const { min, max, unit } = option.range;
          const randomValue = Math.random() * (max - min) + min;
          prizeValue = Math.round(randomValue * 100) / 100;
          prize = `${option.name} ${prizeValue}${unit}`;
        }
        
        break;
      }
    }
  }
  
  // 保存结果
  const results = readData('results.json');
  const result = {
    code,
    lotteryId: lottery.id,
    prize,
    prizeValue,
    isFixed: !!codeData.fixedPrize,
    timestamp: new Date().toISOString()
  };
  results.push(result);
  writeData('results.json', results);
  
  // 标记抽奖码已使用
  codeData.used = true;
  writeData('codes.json', codes);
  
  res.json({ success: true, result });
});

// 获取懦夫选项
router.post('/coward', (req, res) => {
  const { code } = req.body;
  const codes = readData('codes.json');
  const codeData = codes.find(c => c.code === code);
  
  if (!codeData || codeData.used) {
    return res.json({ success: false, message: '抽奖码无效或已使用' });
  }
  
  const lotteries = readData('lotteries.json');
  const lottery = lotteries.find(l => l.id === codeData.lotteryId);
  
  if (!lottery || !lottery.cowardOption) {
    return res.json({ success: false, message: '无懦夫选项' });
  }
  
  // 保存结果
  const results = readData('results.json');
  const result = {
    code,
    lotteryId: lottery.id,
    prize: lottery.cowardOption,
    timestamp: new Date().toISOString(),
    isCoward: true
  };
  results.push(result);
  writeData('results.json', results);
  
  // 标记抽奖码已使用
  codeData.used = true;
  writeData('codes.json', codes);
  
  res.json({ success: true, result });
});

// 获取抽奖活动信息（公开接口）
router.get('/info/:lotteryId', (req, res) => {
  const lotteries = readData('lotteries.json');
  const lottery = lotteries.find(l => l.id === req.params.lotteryId);
  
  if (!lottery) {
    return res.json({ success: false, message: '抽奖活动不存在' });
  }
  
  res.json({ 
    success: true, 
    lottery: {
      id: lottery.id,
      name: lottery.name,
      description: lottery.description
    }
  });
});

// 获取最近中奖记录（公开接口）
router.get('/recent-results/:lotteryId', (req, res) => {
  const results = readData('results.json');
  const lotteryResults = results
    .filter(r => r.lotteryId === req.params.lotteryId && r.prize)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10); // 最近10条
  
  res.json({ 
    success: true, 
    results: lotteryResults.map(r => ({
      code: r.code,
      prize: r.prize,
      timestamp: r.timestamp
    }))
  });
});

module.exports = router;
