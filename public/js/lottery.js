let currentCode = null;
let currentLottery = null;
let theWheel = null;
let isSpinning = false;
let marqueeInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  // 检查主题
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('mdui-theme-layout-dark');
    document.getElementById('themeIcon').textContent = 'brightness_7';
  }
  
  // 检查 Winwheel 是否加载
  if (typeof Winwheel === 'undefined') {
    console.error('Winwheel 库未加载，请检查网络连接');
  } else {
    console.log('Winwheel 库加载成功');
  }
  
  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const lotteryId = urlParams.get('id');
  if (lotteryId) {
    // 预加载抽奖信息
    loadLotteryInfo(lotteryId);
  }
});

function loadLotteryInfo(lotteryId) {
  fetch(`/api/lottery/info/${lotteryId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // 显示标题和描述
        document.getElementById('headerTitle').textContent = data.lottery.name;
        document.getElementById('headerDesc').textContent = data.lottery.description || '';
        document.getElementById('lotteryHeader').style.display = 'block';
        
        // 启动跑马灯
        startMarquee(lotteryId);
      }
    })
    .catch(error => {
      console.error('加载抽奖信息失败:', error);
    });
}

function startMarquee(lotteryId) {
  const marqueeContainer = document.getElementById('marqueeContainer');
  const marqueeText = document.getElementById('marqueeText');
  
  // 显示跑马灯
  marqueeContainer.style.display = 'block';
  
  // 加载最新中奖记录
  function updateMarquee() {
    fetch(`/api/lottery/recent-results/${lotteryId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.results.length > 0) {
          const items = data.results.map(result => {
            const userId = result.code.slice(-4);
            const prize = result.prize || '未中奖';
            return `<span class="marquee-item">用户 <span class="user-id">***${userId}</span> 抽中了 <span class="prize">${prize}</span></span>`;
          }).join('');
          marqueeText.innerHTML = items;
        } else {
          marqueeText.innerHTML = '<span class="marquee-item">暂无中奖记录，快来参与抽奖吧！</span>';
        }
      })
      .catch(error => {
        console.error('加载中奖记录失败:', error);
      });
  }
  
  // 立即更新一次
  updateMarquee();
  
  // 每30秒更新一次
  if (marqueeInterval) {
    clearInterval(marqueeInterval);
  }
  marqueeInterval = setInterval(updateMarquee, 30000);
}

function verifyCode() {
  const code = document.getElementById('lotteryCode').value.trim();
  if (!code) {
    mdui.snackbar({ message: '请输入抽奖码' });
    return;
  }
  
  fetch('/api/lottery/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentCode = code;
      currentLottery = data.lottery;
      
      // 显示标题和描述
      document.getElementById('headerTitle').textContent = currentLottery.name;
      document.getElementById('headerDesc').textContent = currentLottery.description || '';
      document.getElementById('lotteryHeader').style.display = 'block';
      
      // 启动跑马灯
      startMarquee(currentLottery.id);
      
      if (data.result) {
        // 已经抽过奖，显示结果
        showResult(data.result);
      } else {
        // 显示抽奖界面
        showLotteryMain();
      }
    } else {
      mdui.snackbar({ message: data.message });
    }
  });
}

function showLotteryMain() {
  document.getElementById('codeInput').style.display = 'none';
  document.getElementById('lotteryMain').style.display = 'block';
  
  document.getElementById('lotteryTitle').textContent = currentLottery.name;
  document.getElementById('lotteryDesc').textContent = currentLottery.description || '';
  
  if (currentLottery.cowardOption) {
    document.getElementById('cowardSection').style.display = 'block';
  }
  
  // 延迟初始化转盘，确保 DOM 已渲染
  setTimeout(() => {
    initWheel();
  }, 100);
}

function showResult(result) {
  document.getElementById('codeInput').style.display = 'none';
  document.getElementById('lotteryMain').style.display = 'none';
  document.getElementById('resultDisplay').style.display = 'block';
  
  if (result.prize) {
    document.getElementById('resultTitle').textContent = '恭喜中奖！';
    document.getElementById('resultPrize').textContent = result.prize;
  } else {
    document.getElementById('resultTitle').textContent = '很遗憾';
    document.getElementById('resultPrize').textContent = '未中奖';
  }
  
  document.getElementById('resultTime').textContent = 
    '抽奖时间: ' + new Date(result.timestamp).toLocaleString();
}

function initWheel() {
  // 检查库是否加载
  if (typeof Winwheel === 'undefined') {
    console.error('Winwheel 库未加载');
    mdui.snackbar({ message: '转盘加载失败，请刷新页面重试' });
    return;
  }
  
  // 添加"未中奖"选项
  const options = [...currentLottery.options];
  const totalProb = options.reduce((sum, o) => sum + o.probability, 0);
  if (totalProb < 100) {
    options.push({ name: '未中奖', probability: 100 - totalProb });
  }
  
  const colors = ['#3F51B5', '#E91E63', '#009688', '#FF9800', '#9C27B0', '#4CAF50', '#F44336', '#2196F3'];
  
  // 根据屏幕大小调整转盘尺寸
  const canvas = document.getElementById('wheelCanvas');
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;
  
  let canvasSize, outerRadius, fontSize;
  if (isSmallMobile) {
    canvasSize = 280;
    outerRadius = 130;
    fontSize = 12;
  } else if (isMobile) {
    canvasSize = 320;
    outerRadius = 150;
    fontSize = 14;
  } else {
    canvasSize = 400;
    outerRadius = 190;
    fontSize = 16;
  }
  
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  
  // 配置转盘段 - 显示选项名称（不含具体数值）
  const segments = options.map((option, index) => {
    let displayText = option.name;
    // 如果是区间奖品，显示区间范围
    if (option.range) {
      displayText = `${option.name}\n${option.range.min}-${option.range.max}${option.range.unit}`;
    }
    
    return {
      fillStyle: colors[index % colors.length],
      text: displayText,
      textFillStyle: '#fff',
      textFontSize: fontSize,
      textFontWeight: 'bold',
      textFontFamily: 'Arial'
    };
  });
  
  try {
    theWheel = new Winwheel({
      canvasId: 'wheelCanvas',
      outerRadius: outerRadius,
      innerRadius: 0,
      textOrientation: 'horizontal',
      textAlignment: 'center',
      numSegments: segments.length,
      segments: segments,
      lineWidth: 3,
      strokeStyle: '#fff',
      animation: {
        type: 'spinToStop',
        duration: 5,
        spins: 8,
        callbackFinished: onWheelFinished,
        callbackSound: null,
        soundTrigger: 'pin'
      },
      pins: {
        number: segments.length,
        fillStyle: '#fff',
        outerRadius: isMobile ? 4 : 5,
        margin: 3
      }
    });
    
    // 绘制中心圆
    const ctx = theWheel.ctx;
    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const centerRadius = isMobile ? 40 : 50;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#E91E63';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 绘制中心文字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${isMobile ? 14 : 16}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('抽奖', centerX, centerY);
    ctx.restore();
    
    console.log('转盘初始化成功');
  } catch (error) {
    console.error('转盘初始化失败:', error);
    mdui.snackbar({ message: '转盘初始化失败: ' + error.message });
  }
}

let currentResult = null;

function onWheelFinished(indicatedSegment) {
  // 转盘停止后显示结果
  if (currentResult) {
    setTimeout(() => {
      showResult(currentResult);
      currentResult = null;
    }, 500);
  }
}

function startDraw() {
  if (isSpinning) return;
  
  if (!theWheel) {
    mdui.snackbar({ message: '转盘未初始化，请刷新页面' });
    return;
  }
  
  isSpinning = true;
  document.getElementById('drawBtn').disabled = true;
  
  fetch('/api/lottery/draw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: currentCode })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // 找到中奖选项的索引（基于选项名称，不含数值）
      const options = [...currentLottery.options];
      const totalProb = options.reduce((sum, o) => sum + o.probability, 0);
      if (totalProb < 100) {
        options.push({ name: '未中奖', probability: 100 - totalProb });
      }
      
      // 从完整奖品名称中提取选项名称
      let prizeOptionName = data.result.prize || '未中奖';
      // 如果包含数值，提取选项名称部分
      const prizeIndex = options.findIndex(o => {
        if (o.range) {
          // 区间奖品：检查是否以选项名称开头
          return prizeOptionName.startsWith(o.name);
        } else {
          // 普通奖品：完全匹配
          return o.name === prizeOptionName;
        }
      });
      
      if (prizeIndex === -1) {
        console.error('未找到中奖选项:', data.result.prize);
        mdui.snackbar({ message: '抽奖结果异常' });
        isSpinning = false;
        document.getElementById('drawBtn').disabled = false;
        return;
      }
      
      // 保存结果
      currentResult = data.result;
      
      // 计算停止角度（Winwheel 从顶部开始，顺时针）
      const segmentAngle = 360 / options.length;
      const stopAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);
      
      // 开始转盘动画
      theWheel.animation.stopAngle = stopAngle;
      theWheel.startAnimation();
    } else {
      mdui.snackbar({ message: data.message });
      isSpinning = false;
      document.getElementById('drawBtn').disabled = false;
    }
  })
  .catch(error => {
    console.error('抽奖请求失败:', error);
    mdui.snackbar({ message: '抽奖请求失败，请重试' });
    isSpinning = false;
    document.getElementById('drawBtn').disabled = false;
  });
}

function chooseCoward() {
  if (isSpinning) return;
  
  fetch('/api/lottery/coward', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: currentCode })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showResult(data.result);
    } else {
      mdui.snackbar({ message: data.message });
    }
  });
}

function showResult(result) {
  document.getElementById('lotteryMain').style.display = 'none';
  document.getElementById('resultDisplay').style.display = 'block';
  
  if (result.prize) {
    document.getElementById('resultTitle').textContent = '恭喜中奖！';
    document.getElementById('resultPrize').textContent = result.prize;
  } else {
    document.getElementById('resultTitle').textContent = '很遗憾';
    document.getElementById('resultPrize').textContent = '未中奖';
  }
  
  document.getElementById('resultTime').textContent = 
    '抽奖时间: ' + new Date(result.timestamp).toLocaleString();
}

function toggleTheme() {
  const body = document.body;
  const icon = document.getElementById('themeIcon');
  
  if (body.classList.contains('mdui-theme-layout-dark')) {
    body.classList.remove('mdui-theme-layout-dark');
    icon.textContent = 'brightness_4';
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.add('mdui-theme-layout-dark');
    icon.textContent = 'brightness_7';
    localStorage.setItem('theme', 'dark');
  }
}

// 页面卸载时清理定时器
window.addEventListener('beforeunload', () => {
  if (marqueeInterval) {
    clearInterval(marqueeInterval);
  }
});
