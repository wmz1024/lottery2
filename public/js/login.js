document.addEventListener('DOMContentLoaded', () => {
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
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    // 验证token是否有效
    fetch('/api/admin/verify-token', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    .then(res => {
      if (res.ok) {
        // Token有效，跳转到管理页面
        window.location.href = '/admin.html';
      }
    })
    .catch(() => {
      // Token无效，清除
      localStorage.removeItem('authToken');
    });
  }
  
  // 自动聚焦用户名输入框
  document.getElementById('username').focus();
});

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    mdui.snackbar({ message: '请输入用户名和密码' });
    return;
  }
  
  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      mdui.snackbar({ message: '登录成功' });
      setTimeout(() => {
        window.location.href = '/admin.html';
      }, 500);
    } else {
      mdui.snackbar({ message: data.message || '登录失败' });
    }
  })
  .catch(error => {
    console.error('登录失败:', error);
    mdui.snackbar({ message: '登录失败，请重试' });
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
