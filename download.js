const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// yt-dlp 路径
const YT_DLP_PATH = path.join(process.cwd(), 'bin', 'yt-dlp.exe');

/**
 * 检查yt-dlp是否已安装
 */
function checkYtDlp() {
  try {
    if (!fs.existsSync(YT_DLP_PATH)) {
      console.log('正在下载 yt-dlp...');
      require('./scripts/download-yt-dlp');
      return false;
    }
    execSync(`"${YT_DLP_PATH}" --version`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 下载视频
 * @param {string} url - 视频URL
 * @param {string} format - 视频格式
 */
function downloadVideo(url, format = 'best') {
  try {
    console.log('开始下载视频...');
    // 创建下载目录
    const downloadDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    // 构建下载命令
    const command = `"${YT_DLP_PATH}" -f "${format}" -o "downloads/%(title)s.%(ext)s" "${url}"`;
    
    // 执行下载
    execSync(command, { stdio: 'inherit' });
    
    console.log('下载完成！');
  } catch (error) {
    console.error('下载失败:', error.message);
  }
}

/**
 * 获取视频信息
 * @param {string} url - 视频URL
 */
function getVideoInfo(url) {
  try {
    console.log('获取视频信息...');
    const command = `"${YT_DLP_PATH}" -F "${url}"`;
    const output = execSync(command, { encoding: 'utf8' });
    console.log('\n可用的视频格式:');
    console.log(output);
  } catch (error) {
    console.error('获取视频信息失败:', error.message);
  }
}

/**
 * 主程序
 */
async function main() {
  console.log('YouTube视频下载工具');
  console.log('==================');

  // 检查yt-dlp
  if (!checkYtDlp()) {
    console.log('等待 yt-dlp 下载完成...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // 询问视频URL
  const url = await new Promise(resolve => {
    rl.question('请输入YouTube视频URL: ', resolve);
  });

  // 获取视频信息
  getVideoInfo(url);

  // 询问下载格式
  const format = await new Promise(resolve => {
    rl.question('\n请选择下载格式 (直接回车使用最佳质量): ', answer => {
      resolve(answer || 'best');
    });
  });

  // 下载视频
  downloadVideo(url, format);

  // 关闭readline
  rl.close();
}

// 运行主程序
main().catch(error => {
  console.error('程序出错:', error);
  process.exit(1);
}); 