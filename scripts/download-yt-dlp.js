const https = require('https');
const fs = require('fs');
const path = require('path');

const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
const BIN_DIR = path.join(__dirname, '..', 'bin');
const YT_DLP_PATH = path.join(BIN_DIR, 'yt-dlp');

// 确保bin目录存在
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

// 下载yt-dlp
console.log('下载yt-dlp...');
const file = fs.createWriteStream(YT_DLP_PATH);

https.get(YT_DLP_URL, response => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    // 设置执行权限
    fs.chmodSync(YT_DLP_PATH, '755');
    console.log('yt-dlp下载完成');
  });
}).on('error', err => {
  fs.unlink(YT_DLP_PATH, () => {}); // 删除文件
  console.error('下载失败:', err.message);
}); 