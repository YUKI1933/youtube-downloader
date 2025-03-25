const https = require('https');
const fs = require('fs');
const path = require('path');

// 创建 bin 目录
const binDir = path.join(process.cwd(), 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir);
}

// 下载 yt-dlp 二进制文件
const file = fs.createWriteStream(path.join(binDir, 'yt-dlp.exe'));
https.get('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', response => {
  console.log('正在下载 yt-dlp...');
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('yt-dlp 下载完成！');
  });
}).on('error', err => {
  fs.unlink(path.join(binDir, 'yt-dlp.exe'));
  console.error('下载失败:', err.message);
}); 