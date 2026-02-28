let currentLotteryId = null;
let editingLotteryId = null;
let lotteryDialog, codesDialog, resultsDialog, fixedPrizeDialog;
let authToken = null;
let currentPage = 'lotteries';
let drawer = null;

document.addEventListener('DOMContentLoaded', () => {
  lotteryDialog = new mdui.Dialog('#lotteryDialog');
  codesDialog = new mdui.Dialog('#codesDialog');
  resultsDialog = new mdui.Dialog('#resultsDialog');
  fixedPrizeDialog = new mdui.Dialog('#fixedPrizeDialog');
  
  // 初始化侧边栏
  drawer = new mdui.Drawer('#main-drawer', {
    swipe: true
  });
  
  // 检查主题
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('mdui-theme-layout-dark');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = 'brightness_7';
    }
  }
  
  // 检查是否已登录
  authToken = localStorage.getItem('authToken');
  if (authToken) {
    // 验证token是否有效
    verifyAuthToken().then(valid => {
      if (valid) {
        loadLotteries();
        loadInventoryLotterySelect();
        // 启动定期检查
        startAuthCheck();
      } else {
        // Token无效，跳转到登录页
        redirectToLogin();
      }
    });
  } else {
    // 未登录，跳转到登录页
    redirectToLogin();
  }
});

// 跳转到登录页
function redirectToLogin() {
  window.location.href = '/login.html';
}

// 验证token是否有效
function verifyAuthToken() {
  if (!authToken) {
    return Promise.resolve(false);
  }
  
  return fetch('/api/admin/verify-token', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  })
  .then(res => {
    if (res.status === 401) {
      return false;
    }
    return res.json().then(data => data.success);
  })
  .catch(() => false);
}

// 强制重新登录
function forceRelogin(message) {
  localStorage.removeItem('authToken');
  authToken = null;
  
  // 停止定期检查
  if (window.authCheckInterval) {
    clearInterval(window.authCheckInterval);
  }
  
  // 显示消息并跳转
  if (message) {
    mdui.snackbar({ message });
    setTimeout(() => {
      redirectToLogin();
    }, 1000);
  } else {
    redirectToLogin();
  }
}

// 启动定期检查登录状态（每5分钟检查一次）
function startAuthCheck() {
  if (window.authCheckInterval) {
    clearInterval(window.authCheckInterval);
  }
  
  window.authCheckInterval = setInterval(() => {
    verifyAuthToken().then(valid => {
      if (!valid) {
        forceRelogin('登录已过期，请重新登录');
      }
    });
  }, 5 * 60 * 1000); // 5分钟
}

// 添加鉴权请求头
function authFetch(url, options = {}) {
  if (!authToken) {
    forceRelogin('请先登录');
    return Promise.reject(new Error('未授权'));
  }
  
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`
  };
  
  return fetch(url, options).then(res => {
    if (res.status === 401) {
      forceRelogin('登录已过期，请重新登录');
      return Promise.reject(new Error('登录已过期'));
    }
    return res;
  }).catch(error => {
    // 如果是网络错误或其他错误，也要处理
    if (error.message !== '登录已过期' && error.message !== '未授权') {
      console.error('请求失败:', error);
    }
    throw error;
  });
}

function loadLotteries() {
  authFetch('/api/admin/lotteries')
    .then(res => res.json())
    .then(lotteries => {
      const list = document.getElementById('lotteriesList');
      if (lotteries.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="text-center text-muted">暂无抽奖活动</td></tr>';
        return;
      }
      list.innerHTML = lotteries.map(lottery => `
        <tr>
          <td><strong>${lottery.name}</strong></td>
          <td>${lottery.description || '-'}</td>
          <td><span class="badge bg-info">${lottery.options.length}</span></td>
          <td>${lottery.cowardOption ? `<span class="badge bg-warning">${lottery.cowardOption}</span>` : '-'}</td>
          <td>${formatLocalTime(lottery.createdAt)}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-primary" onclick="editLottery('${lottery.id}')" title="编辑">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-info" onclick="manageCodes('${lottery.id}')" title="抽奖码">
                <i class="bi bi-ticket-perforated"></i>
              </button>
              <button class="btn btn-outline-success" onclick="viewResults('${lottery.id}')" title="结果">
                <i class="bi bi-trophy"></i>
              </button>
              <button class="btn btn-outline-secondary" onclick="shareLottery('${lottery.id}')" title="分享">
                <i class="bi bi-share"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="deleteLottery('${lottery.id}')" title="删除">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    })
    .catch(error => {
      console.error('加载抽奖活动失败:', error);
    });
}

function showCreateDialog() {
  editingLotteryId = null;
  document.getElementById('dialogTitle').textContent = '创建抽奖活动';
  document.getElementById('lotteryName').value = '';
  document.getElementById('lotteryDesc').value = '';
  document.getElementById('cowardOption').value = '';
  document.getElementById('limitByFingerprint').checked = false;
  document.getElementById('limitByIp').checked = false;
  document.getElementById('requireEmail').checked = false;
  document.getElementById('optionsList').innerHTML = '';
  addOption();
  lotteryDialog.open();
}

function addOption() {
  const optionsList = document.getElementById('optionsList');
  const optionId = Date.now();
  const optionHtml = `
    <div class="option-card" id="option-${optionId}">
      <div class="row">
        <div class="col-md-6">
          <div class="mdui-textfield">
            <label class="mdui-textfield-label">选项名称</label>
            <input class="mdui-textfield-input option-name" type="text" placeholder="例如：硬盘空间"/>
          </div>
        </div>
        <div class="col-md-3">
          <div class="mdui-textfield">
            <label class="mdui-textfield-label">中奖率 (%)</label>
            <input class="mdui-textfield-input option-prob" type="number" min="0" max="100" step="0.01" oninput="updateTotalProb()"/>
          </div>
        </div>
        <div class="col-md-3">
          <label class="mdui-checkbox">
            <input type="checkbox" class="option-range-enabled" onchange="toggleRange(${optionId})"/>
            <i class="mdui-checkbox-icon"></i>
            区间奖品
          </label>
        </div>
      </div>
      
      <div class="row mdui-m-t-1">
        <div class="col-md-4">
          <div class="mdui-textfield">
            <label class="mdui-textfield-label">库存数量</label>
            <input class="mdui-textfield-input option-stock" type="number" min="0" placeholder="0表示无限制"/>
          </div>
        </div>
        <div class="col-md-4">
          <label class="mdui-checkbox">
            <input type="checkbox" class="option-has-code" onchange="toggleCodeSection(${optionId})"/>
            <i class="mdui-checkbox-icon"></i>
            需要兑换码/卡密
          </label>
        </div>
      </div>
      
      <div class="code-section" id="code-section-${optionId}" style="display: none;">
        <div class="mdui-typo-caption mdui-m-t-1 mdui-m-b-1">兑换码/卡密列表（每行一个）</div>
        <textarea class="form-control option-codes" rows="3" placeholder="每行一个兑换码或卡密"></textarea>
      </div>
      
      <div class="range-section" id="range-${optionId}" style="display: none;">
        <div class="mdui-typo-caption mdui-m-t-1 mdui-m-b-1">设置区间范围（系统将在此区间内随机抽取）</div>
        <div class="row">
          <div class="col-md-4">
            <div class="mdui-textfield">
              <label class="mdui-textfield-label">最小值</label>
              <input class="mdui-textfield-input option-min" type="number" step="any"/>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mdui-textfield">
              <label class="mdui-textfield-label">最大值</label>
              <input class="mdui-textfield-input option-max" type="number" step="any"/>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mdui-textfield">
              <label class="mdui-textfield-label">单位</label>
              <input class="mdui-textfield-input option-unit" type="text" placeholder="例如：GB、元、积分"/>
            </div>
          </div>
        </div>
      </div>
      
      <button class="btn btn-sm btn-outline-danger mdui-m-t-1" onclick="removeOption(${optionId})">
        <i class="bi bi-trash"></i> 删除选项
      </button>
    </div>
  `;
  optionsList.insertAdjacentHTML('beforeend', optionHtml);
  mdui.mutation();
}

function toggleRange(id) {
  const checkbox = document.querySelector(`#option-${id} .option-range-enabled`);
  const rangeSection = document.getElementById(`range-${id}`);
  rangeSection.style.display = checkbox.checked ? 'block' : 'none';
}

function toggleCodeSection(id) {
  const checkbox = document.querySelector(`#option-${id} .option-has-code`);
  const codeSection = document.getElementById(`code-section-${id}`);
  codeSection.style.display = checkbox.checked ? 'block' : 'none';
}

function removeOption(id) {
  document.getElementById(`option-${id}`).remove();
  updateTotalProb();
}

function updateTotalProb() {
  const probs = Array.from(document.querySelectorAll('.option-prob'))
    .map(input => parseFloat(input.value) || 0);
  const total = probs.reduce((sum, p) => sum + p, 0);
  document.getElementById('totalProb').textContent = total.toFixed(2);
  document.getElementById('noWinProb').textContent = (100 - total).toFixed(2);
  
  if (total > 100) {
    mdui.snackbar({ message: '总中奖率不能超过100%' });
  }
}

function saveLottery() {
  const name = document.getElementById('lotteryName').value;
  const description = document.getElementById('lotteryDesc').value;
  const cowardOption = document.getElementById('cowardOption').value;
  const limitByFingerprint = document.getElementById('limitByFingerprint').checked;
  const limitByIp = document.getElementById('limitByIp').checked;
  const requireEmail = document.getElementById('requireEmail').checked;
  
  const options = [];
  document.querySelectorAll('.option-card').forEach(card => {
    const optionName = card.querySelector('.option-name').value;
    const probability = parseFloat(card.querySelector('.option-prob').value) || 0;
    const rangeEnabled = card.querySelector('.option-range-enabled').checked;
    const stock = parseInt(card.querySelector('.option-stock').value) || 0;
    const hasCode = card.querySelector('.option-has-code').checked;
    
    if (optionName && probability > 0) {
      const option = { name: optionName, probability, stock };
      
      if (rangeEnabled) {
        const min = parseFloat(card.querySelector('.option-min').value);
        const max = parseFloat(card.querySelector('.option-max').value);
        const unit = card.querySelector('.option-unit').value;
        
        if (!isNaN(min) && !isNaN(max) && min < max) {
          option.range = { min, max, unit: unit || '' };
        } else {
          mdui.snackbar({ message: `选项"${optionName}"的区间设置无效` });
          return;
        }
      }
      
      if (hasCode) {
        const codesText = card.querySelector('.option-codes').value;
        const codes = codesText.split('\n').filter(c => c.trim()).map(c => ({ code: c.trim(), used: false }));
        if (codes.length > 0) {
          option.codes = codes;
        }
      }
      
      options.push(option);
    }
  });
  
  if (options.length === 0) {
    mdui.snackbar({ message: '请至少添加一个有效选项' });
    return;
  }
  
  const totalProb = options.reduce((sum, o) => sum + o.probability, 0);
  if (totalProb > 100) {
    mdui.snackbar({ message: '总中奖率不能超过100%' });
    return;
  }
  
  const lottery = { 
    name, 
    description, 
    cowardOption, 
    options,
    limitByFingerprint,
    limitByIp,
    requireEmail
  };
  const url = editingLotteryId ? `/api/admin/lotteries/${editingLotteryId}` : '/api/admin/lotteries';
  const method = editingLotteryId ? 'PUT' : 'POST';
  
  authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lottery)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      lotteryDialog.close();
      loadLotteries();
      mdui.snackbar({ message: '保存成功' });
    }
  })
  .catch(error => {
    console.error('保存失败:', error);
    // 错误已经在authFetch中处理，这里不需要再显示
  });
}

function editLottery(id) {
  authFetch('/api/admin/lotteries')
    .then(res => res.json())
    .then(lotteries => {
      const lottery = lotteries.find(l => l.id === id);
      if (!lottery) return;
      
      editingLotteryId = id;
      document.getElementById('dialogTitle').textContent = '编辑抽奖活动';
      document.getElementById('lotteryName').value = lottery.name;
      document.getElementById('lotteryDesc').value = lottery.description || '';
      document.getElementById('cowardOption').value = lottery.cowardOption || '';
      document.getElementById('limitByFingerprint').checked = lottery.limitByFingerprint || false;
      document.getElementById('limitByIp').checked = lottery.limitByIp || false;
      document.getElementById('requireEmail').checked = lottery.requireEmail || false;
      
      document.getElementById('optionsList').innerHTML = '';
      lottery.options.forEach(option => {
        addOption();
        const cards = document.querySelectorAll('.option-card');
        const lastCard = cards[cards.length - 1];
        lastCard.querySelector('.option-name').value = option.name;
        lastCard.querySelector('.option-prob').value = option.probability;
        lastCard.querySelector('.option-stock').value = option.stock || 0;
        
        if (option.range) {
          const checkbox = lastCard.querySelector('.option-range-enabled');
          checkbox.checked = true;
          const optionId = lastCard.id.replace('option-', '');
          toggleRange(optionId);
          lastCard.querySelector('.option-min').value = option.range.min;
          lastCard.querySelector('.option-max').value = option.range.max;
          lastCard.querySelector('.option-unit').value = option.range.unit || '';
        }
        
        if (option.codes && option.codes.length > 0) {
          const checkbox = lastCard.querySelector('.option-has-code');
          checkbox.checked = true;
          const optionId = lastCard.id.replace('option-', '');
          toggleCodeSection(optionId);
          lastCard.querySelector('.option-codes').value = option.codes.map(c => c.code).join('\n');
        }
      });
      
      updateTotalProb();
      lotteryDialog.open();
    });
}

function deleteLottery(id) {
  if (!confirm('确定要删除此抽奖活动吗？')) return;
  
  authFetch(`/api/admin/lotteries/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadLotteries();
        mdui.snackbar({ message: '删除成功' });
      }
    })
    .catch(error => {
      console.error('删除失败:', error);
    });
}

function manageCodes(id) {
  currentLotteryId = id;
  loadCodes();
  codesDialog.open();
}

function loadCodes() {
  authFetch(`/api/admin/codes/${currentLotteryId}`)
    .then(res => res.json())
    .then(codes => {
      const list = document.getElementById('codesList');
      if (codes.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="text-center text-muted">暂无抽奖码</td></tr>';
        return;
      }
      list.innerHTML = codes.map(code => `
        <tr class="${code.used ? 'table-secondary' : ''}">
          <td>
            <input type="checkbox" class="form-check-input code-checkbox" value="${code.id}" ${code.used ? 'disabled' : ''}>
          </td>
          <td><code>${code.code}</code></td>
          <td>
            ${code.used ? '<span class="badge bg-secondary">已使用</span>' : '<span class="badge bg-success">未使用</span>'}
            ${code.fixedPrize ? '<span class="badge bg-warning ms-1" title="已设置黑幕">🎭</span>' : ''}
          </td>
          <td>
            ${code.fixedPrize ? `<span class="text-primary">${formatFixedPrize(code.fixedPrize)}</span>` : '-'}
          </td>
          <td>
            <div class="btn-group btn-group-sm">
              ${!code.used ? `<button class="btn btn-outline-warning" onclick="setFixedPrize('${code.id}')" title="设置黑幕">
                <i class="bi bi-magic"></i>
              </button>` : ''}
              ${code.fixedPrize && !code.used ? `<button class="btn btn-outline-secondary" onclick="clearFixedPrize('${code.id}')" title="清除黑幕">
                <i class="bi bi-x-circle"></i>
              </button>` : ''}
              <button class="btn btn-outline-danger" onclick="deleteCode('${code.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    })
    .catch(error => {
      console.error('加载抽奖码失败:', error);
    });
}

function formatFixedPrize(fixedPrize) {
  if (fixedPrize.specificValue !== undefined) {
    return `${fixedPrize.prize} ${fixedPrize.specificValue}${fixedPrize.unit || ''}`;
  } else if (fixedPrize.rangeMin !== undefined) {
    return `${fixedPrize.prize} ${fixedPrize.rangeMin}-${fixedPrize.rangeMax}${fixedPrize.unit || ''}`;
  } else {
    return fixedPrize.prize;
  }
}

function generateCodes() {
  const count = parseInt(document.getElementById('codeCount').value);
  authFetch('/api/admin/codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lotteryId: currentLotteryId, count })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadCodes();
      mdui.snackbar({ message: `成功生成 ${count} 个抽奖码` });
    }
  });
}

function deleteCode(id) {
  authFetch(`/api/admin/codes/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        loadCodes();
        mdui.snackbar({ message: '删除成功' });
      }
    });
}

function viewResults(id) {
  currentLotteryId = id;
  authFetch(`/api/admin/results/${id}`)
    .then(res => res.json())
    .then(results => {
      const list = document.getElementById('resultsList');
      if (results.length === 0) {
        list.innerHTML = '<tr><td colspan="7" class="text-center text-muted">暂无抽奖结果</td></tr>';
      } else {
        list.innerHTML = results.map(result => `
          <tr>
            <td><code>${result.code}</code></td>
            <td>${result.prize ? `<span class="badge bg-success">${result.prize}</span>` : '<span class="badge bg-secondary">未中奖</span>'}</td>
            <td>${formatLocalTime(result.timestamp)}</td>
            <td>${result.isCoward ? '<span class="badge bg-warning">懦夫选项</span>' : '<span class="badge bg-primary">正常抽奖</span>'}</td>
            <td><code class="text-muted" style="font-size: 11px;">${result.fingerprint || '-'}</code></td>
            <td><code class="text-muted" style="font-size: 11px;">${result.ip || '-'}</code></td>
            <td>${result.email || '-'}</td>
          </tr>
        `).join('');
      }
      resultsDialog.open();
    });
}

function exportResults() {
  window.open(`/api/admin/export/${currentLotteryId}?token=${authToken}`, '_blank');
}

function shareLottery(id) {
  const url = `${window.location.origin}/lottery.html?id=${id}`;
  navigator.clipboard.writeText(url).then(() => {
    mdui.snackbar({ message: '分享链接已复制到剪贴板' });
  });
}

function exportCodes() {
  window.open(`/api/admin/export-codes/${currentLotteryId}?token=${authToken}`, '_blank');
}

function selectAllCodes() {
  const checkboxes = document.querySelectorAll('.code-checkbox:not(:disabled)');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => cb.checked = !allChecked);
  selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
}

function batchSetFixedPrize() {
  const selectedIds = Array.from(document.querySelectorAll('.code-checkbox:checked')).map(cb => cb.value);
  
  if (selectedIds.length === 0) {
    mdui.snackbar({ message: '请先选择抽奖码' });
    return;
  }
  
  currentBatchCodeIds = selectedIds;
  
  // 先关闭当前对话框，再打开新对话框
  codesDialog.close();
  setTimeout(() => {
    showFixedPrizeDialog(null, true);
  }, 300);
}

let currentBatchCodeIds = [];
let currentEditCodeId = null;

function setFixedPrize(codeId) {
  currentEditCodeId = codeId;
  currentBatchCodeIds = [];
  
  // 先关闭当前对话框，再打开新对话框
  codesDialog.close();
  setTimeout(() => {
    showFixedPrizeDialog(codeId, false);
  }, 300);
}

function showFixedPrizeDialog(codeId, isBatch) {
  // 获取当前抽奖活动的选项
  authFetch('/api/admin/lotteries')
    .then(res => res.json())
    .then(lotteries => {
      const lottery = lotteries.find(l => l.id === currentLotteryId);
      if (!lottery) return;
      
      const optionsHtml = lottery.options.map(option => {
        if (option.range) {
          return `<option value="${option.name}" data-range="true" data-min="${option.range.min}" data-max="${option.range.max}" data-unit="${option.range.unit}">${option.name} (${option.range.min}-${option.range.max}${option.range.unit})</option>`;
        } else {
          return `<option value="${option.name}">${option.name}</option>`;
        }
      }).join('');
      
      document.getElementById('fixedPrizeSelect').innerHTML = `
        <option value="">选择奖品</option>
        ${optionsHtml}
        <option value="__no_prize__">未中奖</option>
      `;
      
      document.getElementById('fixedPrizeTitle').textContent = isBatch ? `批量设置黑幕 (${currentBatchCodeIds.length}个)` : '设置黑幕';
      document.getElementById('rangeOptions').style.display = 'none';
      document.getElementById('fixedPrizeSelect').value = '';
      document.getElementById('rangeType').value = 'random';
      document.getElementById('specificValue').value = '';
      document.getElementById('rangeMin').value = '';
      document.getElementById('rangeMax').value = '';
      
      fixedPrizeDialog.open();
    });
}

function onPrizeSelectChange() {
  const select = document.getElementById('fixedPrizeSelect');
  const selectedOption = select.options[select.selectedIndex];
  const rangeOptions = document.getElementById('rangeOptions');
  
  if (selectedOption.dataset.range === 'true') {
    rangeOptions.style.display = 'block';
    document.getElementById('rangeMin').max = selectedOption.dataset.max;
    document.getElementById('rangeMax').max = selectedOption.dataset.max;
    document.getElementById('rangeMin').min = selectedOption.dataset.min;
    document.getElementById('rangeMax').min = selectedOption.dataset.min;
    document.getElementById('specificValue').max = selectedOption.dataset.max;
    document.getElementById('specificValue').min = selectedOption.dataset.min;
    document.getElementById('unitDisplay').textContent = selectedOption.dataset.unit || '';
  } else {
    rangeOptions.style.display = 'none';
  }
}

function onRangeTypeChange() {
  const rangeType = document.getElementById('rangeType').value;
  document.getElementById('specificValueSection').style.display = rangeType === 'specific' ? 'block' : 'none';
  document.getElementById('customRangeSection').style.display = rangeType === 'custom' ? 'block' : 'none';
}

function cancelFixedPrize() {
  fixedPrizeDialog.close();
  // 延迟重新打开抽奖码对话框
  setTimeout(() => {
    codesDialog.open();
  }, 300);
}

function saveFixedPrize() {
  const prizeSelect = document.getElementById('fixedPrizeSelect');
  const prize = prizeSelect.value;
  
  if (!prize) {
    mdui.snackbar({ message: '请选择奖品' });
    return;
  }
  
  const fixedPrize = { prize: prize === '__no_prize__' ? null : prize };
  const selectedOption = prizeSelect.options[prizeSelect.selectedIndex];
  
  if (selectedOption.dataset.range === 'true' && prize !== '__no_prize__') {
    const rangeType = document.getElementById('rangeType').value;
    fixedPrize.unit = selectedOption.dataset.unit || '';
    
    if (rangeType === 'specific') {
      const specificValue = parseFloat(document.getElementById('specificValue').value);
      if (isNaN(specificValue)) {
        mdui.snackbar({ message: '请输入具体数值' });
        return;
      }
      fixedPrize.specificValue = specificValue;
    } else if (rangeType === 'custom') {
      const rangeMin = parseFloat(document.getElementById('rangeMin').value);
      const rangeMax = parseFloat(document.getElementById('rangeMax').value);
      if (isNaN(rangeMin) || isNaN(rangeMax) || rangeMin >= rangeMax) {
        mdui.snackbar({ message: '请输入有效的区间范围' });
        return;
      }
      fixedPrize.rangeMin = rangeMin;
      fixedPrize.rangeMax = rangeMax;
    }
  }
  
  const isBatch = currentBatchCodeIds.length > 0;
  const codeIds = isBatch ? currentBatchCodeIds : [currentEditCodeId];
  
  authFetch('/api/admin/codes/fixed-prize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeIds, fixedPrize })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      fixedPrizeDialog.close();
      mdui.snackbar({ message: '设置成功' });
      // 延迟重新打开抽奖码对话框
      setTimeout(() => {
        loadCodes();
        codesDialog.open();
      }, 300);
    } else {
      mdui.snackbar({ message: data.message || '设置失败' });
    }
  });
}

function clearFixedPrize(codeId) {
  if (!confirm('确定要清除此抽奖码的黑幕设置吗？')) return;
  
  authFetch('/api/admin/codes/fixed-prize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeIds: [codeId], fixedPrize: null })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      loadCodes();
      mdui.snackbar({ message: '已清除黑幕设置' });
    }
  });
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


// 页面切换
function showPage(pageName) {
  currentPage = pageName;
  
  // 更新菜单项激活状态
  document.querySelectorAll('.mdui-list-item').forEach(item => {
    item.classList.remove('active-menu-item');
  });
  
  // 隐藏所有页面
  document.querySelectorAll('.page-content').forEach(page => page.style.display = 'none');
  
  const pageMap = {
    'lotteries': { id: 'lotteriesPage', title: '抽奖活动' },
    'inventory': { id: 'inventoryPage', title: '库存管理' },
    'settings': { id: 'settingsPage', title: '系统设置' }
  };
  
  const page = pageMap[pageName];
  if (page) {
    document.getElementById(page.id).style.display = 'block';
    document.getElementById('pageTitle').textContent = page.title;
    
    // 高亮当前菜单项
    const menuItems = document.querySelectorAll('.mdui-list-item');
    const pageIndex = Object.keys(pageMap).indexOf(pageName);
    if (menuItems[pageIndex]) {
      menuItems[pageIndex].classList.add('active-menu-item');
    }
    
    if (pageName === 'settings') {
      loadAdminSettings();
    }
    
    // 在移动端自动关闭侧边栏
    if (drawer && window.innerWidth < 1024) {
      drawer.close();
    }
  }
}

// 库存管理
function loadInventoryLotterySelect() {
  authFetch('/api/admin/lotteries')
    .then(res => res.json())
    .then(lotteries => {
      const select = document.getElementById('inventoryLotterySelect');
      select.innerHTML = '<option value="">请选择抽奖活动</option>' +
        lotteries.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
    });
}

function loadInventory() {
  const lotteryId = document.getElementById('inventoryLotterySelect').value;
  if (!lotteryId) {
    document.getElementById('inventoryContent').innerHTML = '';
    return;
  }
  
  authFetch(`/api/admin/inventory/${lotteryId}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayInventory(data.inventory);
      }
    });
}

function displayInventory(inventory) {
  const content = document.getElementById('inventoryContent');
  content.innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>奖品名称</th>
            <th>总库存</th>
            <th>已使用</th>
            <th>剩余</th>
            <th>兑换码/卡密</th>
          </tr>
        </thead>
        <tbody>
          ${inventory.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.totalStock === 0 ? '无限制' : item.totalStock}</td>
              <td>${item.usedStock}</td>
              <td>${item.totalStock === 0 ? '无限制' : item.remainingStock}</td>
              <td>
                ${item.hasCodes ? `
                  <span class="badge bg-info">${item.totalCodes}个</span>
                  <span class="badge bg-success">${item.availableCodes}可用</span>
                ` : '-'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 设置页面
function loadAdminSettings() {
  authFetch('/api/admin/account')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        document.getElementById('newUsername').value = data.username;
      }
    });
}

function updateAdminAccount() {
  const username = document.getElementById('newUsername').value;
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!username) {
    mdui.snackbar({ message: '用户名不能为空' });
    return;
  }
  
  if (password && password !== confirmPassword) {
    mdui.snackbar({ message: '两次输入的密码不一致' });
    return;
  }
  
  const data = { username };
  if (password) {
    data.password = password;
  }
  
  authFetch('/api/admin/account', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      mdui.snackbar({ message: '修改成功，请重新登录' });
      setTimeout(() => {
        logout();
      }, 1500);
    } else {
      mdui.snackbar({ message: data.message || '修改失败' });
    }
  });
}

function logout() {
  localStorage.removeItem('authToken');
  authToken = null;
  
  // 停止定期检查
  if (window.authCheckInterval) {
    clearInterval(window.authCheckInterval);
  }
  
  window.location.reload();
}


// 格式化时间为本地时区
function formatLocalTime(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// 格式化日期为本地时区（仅日期）
function formatLocalDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
