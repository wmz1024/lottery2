const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// JWT 密钥
app.set('jwtSecret', '8bnohidjisnk8u84l3ncal7b4dhxtun');

// 中间件
app.use(bodyParser.json());
app.use(express.static('public'));

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// 初始化数据文件
const initDataFile = (filename, defaultData) => {
  const filepath = path.join(dataDir, filename);
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(defaultData, null, 2));
  }
};

initDataFile('admin.json', { username: 'admin', password: 'admin123' });
initDataFile('lotteries.json', []);
initDataFile('codes.json', []);
initDataFile('results.json', []);

// 路由
app.use('/api/admin', require('./routes/admin'));
app.use('/api/lottery', require('./routes/lottery'));

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`管理后台: http://localhost:${PORT}/admin.html`);
});
