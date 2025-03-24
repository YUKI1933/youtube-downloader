// 检查用户是否已登录
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('username');
    if (!token || !username) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// 处理登录表单提交
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // 这里应该调用后端API进行验证
            // 目前使用模拟数据
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                localStorage.setItem('auth_token', 'dummy_token');
                localStorage.setItem('username', user.username);
                window.location.href = '/';
            } else {
                alert('邮箱或密码错误');
            }
        } catch (error) {
            alert('登录失败，请重试');
        }
    });
}

// 处理注册表单提交
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        try {
            // 这里应该调用后端API进行注册
            // 目前使用localStorage模拟数据存储
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            
            // 检查邮箱是否已被注册
            if (users.some(u => u.email === email)) {
                alert('该邮箱已被注册');
                return;
            }

            users.push({ username, email, password });
            localStorage.setItem('users', JSON.stringify(users));
            alert('注册成功！');
            window.location.href = '/login.html';
        } catch (error) {
            alert('注册失败，请重试');
        }
    });
}

// 处理登出
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    window.location.href = '/login.html';
} 