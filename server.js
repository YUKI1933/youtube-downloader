/**
 * @description YouTube下载器后端服务器
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 身份验证中间件
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }
    next();
};

/**
 * @description 处理视频解析请求
 */
app.post('/analyze', authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: '请提供视频URL' });
        }

        // 使用内置数据模拟视频信息
        // 在真实环境中，这里应该调用实际的YouTube API或其他服务
        const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : 'dQw4w9WgXcQ';
        
        // 获取视频缩略图
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // 模拟视频格式数据
        const formats = [
            {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                mimeType: 'video/mp4',
                quality: '1080p',
                size: 52428800 // 50MB
            },
            {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                mimeType: 'video/mp4',
                quality: '720p',
                size: 31457280 // 30MB
            },
            {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                mimeType: 'video/mp4',
                quality: '480p',
                size: 20971520 // 20MB
            },
            {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                mimeType: 'audio/mp4',
                quality: 'Audio',
                size: 10485760 // 10MB
            }
        ];

        // 尝试获取视频标题
        let title = 'YouTube 视频';
        let description = '';
        
        try {
            // 尝试获取OG标签信息
            const { data } = await axios.get(url);
            const titleMatch = data.match(/<title>(.*?)<\/title>/i);
            const descMatch = data.match(/<meta name="description" content="(.*?)"/i);
            
            if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].replace(' - YouTube', '');
            }
            
            if (descMatch && descMatch[1]) {
                description = descMatch[1];
            }
        } catch (error) {
            console.log('无法获取视频元数据', error.message);
        }

        const response = {
            title,
            thumbnail,
            description,
            formats
        };

        res.json(response);
    } catch (error) {
        console.error('解析错误:', error);
        res.status(500).json({ error: '视频解析失败' });
    }
});

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 登录页面
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 注册页面
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// 创建服务器并添加错误处理
const server = app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('当前目录:', __dirname);
}).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${port} 已被占用，请尝试使用其他端口`);
        process.exit(1);
    } else {
        console.error('服务器启动错误:', error);
        process.exit(1);
    }
}); 