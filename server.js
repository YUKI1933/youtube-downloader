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
        console.log('收到解析请求:', req.body);
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: '请提供视频URL' });
        }

        // 从URL中提取视频ID
        const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : 
                       url.includes('shorts/') ? url.split('shorts/')[1].split('?')[0] : 
                       'dQw4w9WgXcQ';
        
        console.log('解析的视频ID:', videoId);
        
        // 获取视频缩略图
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // 为演示目的创建直接下载链接
        // 注意：在真实环境中，你需要使用实际的视频下载服务或API
        const videoBaseUrl = `https://example-download-server.com/download/${videoId}`;
        
        // 模拟视频格式数据，提供直接下载链接
        const formats = [
            {
                url: `${videoBaseUrl}/1080.mp4`,
                mimeType: 'video/mp4',
                quality: '1080p',
                size: 52428800 // 50MB
            },
            {
                url: `${videoBaseUrl}/720.mp4`,
                mimeType: 'video/mp4',
                quality: '720p',
                size: 31457280 // 30MB
            },
            {
                url: `${videoBaseUrl}/480.mp4`,
                mimeType: 'video/mp4',
                quality: '480p',
                size: 20971520 // 20MB
            },
            {
                url: `${videoBaseUrl}/audio.m4a`,
                mimeType: 'audio/mp4',
                quality: 'Audio',
                size: 10485760 // 10MB
            }
        ];

        // 尝试获取视频标题
        let title = 'YouTube 视频 - ' + videoId;
        let description = '这是一个YouTube视频的描述。由于这是一个演示版本，我们无法获取真实的视频信息。在完整版中，这里会显示真实的视频描述。';
        
        // 为了演示目的，我们添加一个代理功能，允许通过我们的服务器代理下载
        app.get('/proxy-download', async (req, res) => {
            try {
                const { url, filename } = req.query;
                if (!url) {
                    return res.status(400).send('缺少URL参数');
                }
                
                // 设置响应头，强制浏览器下载
                res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download.mp4'}"`);
                
                // 在实际环境中，这里会从原始URL获取视频流并传递给客户端
                // 这里只是模拟，实际发送一个示例响应
                res.send('这是模拟的视频内容');
            } catch (error) {
                console.error('代理下载错误:', error);
                res.status(500).send('下载失败: ' + error.message);
            }
        });
        
        // 更新格式URL以使用我们的代理
        formats.forEach(format => {
            // 在真实项目中，你会想要加密或混淆这些URL，并添加身份验证
            const quality = format.quality.toLowerCase().replace(/[^a-z0-9]/g, '');
            format.directDownloadUrl = `/proxy-download?url=${encodeURIComponent(format.url)}&filename=${encodeURIComponent(`${videoId}-${quality}.${format.mimeType.includes('audio') ? 'm4a' : 'mp4'}`)}`;
            // 保留原始URL用于显示信息
            format.originalUrl = format.url;
            format.url = format.directDownloadUrl;
        });

        const response = {
            title,
            thumbnail,
            description,
            formats
        };

        console.log('发送解析结果');
        res.json(response);
    } catch (error) {
        console.error('解析错误:', error);
        res.status(500).json({ error: '视频解析失败: ' + error.message });
    }
});

// 所有页面路由
// 主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 登录页面
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 注册页面
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// 通用处理 - 捕获所有其他请求
app.get('*', (req, res) => {
    // 如果是HTML请求，返回index.html
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).send('Not Found');
    }
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