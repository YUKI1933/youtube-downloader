/**
 * @description YouTube下载器后端服务器
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const ytdl = require('yt-dlp-exec');

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

        const output = await ytdl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true
        });

        const response = {
            title: output.title,
            thumbnail: output.thumbnail,
            description: output.description,
            formats: output.formats.map(format => ({
                url: format.url,
                mimeType: format.ext === 'mp4' ? 'video/mp4' : 'audio/m4a',
                quality: format.height ? `${format.height}p` : 'Audio',
                size: format.filesize
            }))
        };

        res.json(response);
    } catch (error) {
        console.error('解析错误:', error);
        res.status(500).json({ error: '视频解析失败' });
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