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

// 静态文件服务
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

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
        console.log('收到解析请求:', req.body);
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: '请提供视频URL' });
        }

        // 从URL中提取视频ID
        let videoId;
        if (url.includes('youtube.com/watch?v=')) {
            videoId = new URL(url).searchParams.get('v');
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        } else {
            return res.status(400).json({ error: '不支持的URL格式' });
        }
        
        console.log('解析的视频ID:', videoId);
        
        // 获取视频缩略图
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // 模拟视频格式数据
        const formats = {
            video: [
                {
                    itag: "137",
                    quality: "1080p",
                    mimeType: "video/mp4",
                    size: 52428800,
                    url: `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&itag=137&action=download`
                },
                {
                    itag: "136",
                    quality: "720p",
                    mimeType: "video/mp4",
                    size: 31457280,
                    url: `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&itag=136&action=download`
                }
            ],
            audio: [
                {
                    itag: "140",
                    quality: "128kbps",
                    mimeType: "audio/mp4",
                    size: 10485760,
                    url: `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&itag=140&action=download`
                }
            ]
        };

        const response = {
            title: `YouTube Video - ${videoId}`,
            thumbnail,
            description: '这是视频的描述信息',
            formats
        };

        console.log('发送解析结果');
        res.json(response);
    } catch (error) {
        console.error('解析错误:', error);
        res.status(500).json({ error: '视频解析失败: ' + error.message });
    }
});

// 页面路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// 通用处理 - 捕获所有其他请求
app.get('*', (req, res) => {
    if (req.headers.accept?.includes('text/html')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        // 尝试发送静态文件
        const filePath = path.join(__dirname, req.path);
        if (require('fs').existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('Not Found');
        }
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('当前目录:', __dirname);
}); 