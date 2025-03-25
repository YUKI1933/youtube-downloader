const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

// 确保bin目录存在
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

const ytDlpPath = path.join(BIN_DIR, 'yt-dlp');

console.log('开始下载yt-dlp...');

// 下载二进制文件
https.get(YT_DLP_URL, (response) => {
  if (response.statusCode !== 200) {
    throw new Error(`下载失败: ${response.statusCode}`);
  }

  const fileStream = fs.createWriteStream(ytDlpPath);
  response.pipe(fileStream);

  fileStream.on('finish', () => {
    fileStream.close();
    // 设置执行权限
    fs.chmodSync(ytDlpPath, '755');
    console.log('yt-dlp下载完成');
  });
}).on('error', (err) => {
  console.error('下载出错:', err);
  process.exit(1);
}); 