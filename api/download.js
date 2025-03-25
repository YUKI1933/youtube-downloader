// api/download.js
const youtubedl = require('yt-dlp-exec');

/**
 * 代理服务器列表
 * @type {Array<string>}
 */
const PROXY_SERVERS = [
  'http://51.159.115.233:3128',
  'http://165.225.208.243:10605',
  'http://165.225.208.77:10605',
  'http://165.225.208.84:10605'
];

let currentProxyIndex = 0;

/**
 * 获取下一个代理服务器
 * @returns {string} 代理服务器URL
 */
function getNextProxy() {
  const proxy = PROXY_SERVERS[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_SERVERS.length;
  return proxy;
}

/**
 * 获取代理配置
 * @returns {string|null} 代理服务器URL
 */
function getProxyConfig() {
  // 优先使用环境变量中的代理配置
  const proxyUrl = process.env.PROXY_URL;
  if (proxyUrl) {
    return proxyUrl;
  }

  // 如果没有环境变量配置,使用代理服务器列表
  return getNextProxy();
}

/**
 * 获取视频信息的重试函数
 * @param {Function} fn - 要重试的异步函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试延迟(ms)
 * @returns {Promise} 
 */
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`重试 ${i + 1}/${retries}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * 获取视频信息
 * @param {string} videoId - YouTube视频ID
 * @returns {Promise<Object>} 视频信息
 */
async function getVideoInfo(videoId) {
  return retry(async () => {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // 获取代理配置
      const proxyConfig = getProxyConfig();
      if (proxyConfig) {
        console.log('使用代理:', proxyConfig);
      }

      // 获取视频信息
      const info = await youtubedl(videoUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        noCallHome: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        proxy: proxyConfig || undefined,
        format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
      });
      
      if (!info) {
        throw new Error('无法获取视频信息');
      }

      // 构建格式数组
      const formats = info.formats.map(format => ({
        itag: format.format_id,
        mimeType: format.ext === 'm4a' ? 'audio/mp4' : 'video/mp4',
        quality: format.height ? `${format.height}p` : 'Audio',
        hasAudio: format.acodec !== 'none',
        hasVideo: format.vcodec !== 'none',
        contentLength: format.filesize,
        url: format.url
      }));

      return {
        title: info.title,
        formats: formats,
        thumbnail: info.thumbnail,
        description: info.description || ''
      };
    } catch (error) {
      console.error('获取视频信息失败:', error);
      throw error;
    }
  });
}

// 过滤并分类格式
function processFormats(formats) {
  // 仅保留有效URL的格式
  const filteredFormats = formats.filter(format => format.url);

  // 分类格式
  const videoFormats = filteredFormats
    .filter(format => format.hasVideo)
    .sort((a, b) => {
      const qualityA = parseInt(a.quality?.match(/\d+/)?.[0] || 0);
      const qualityB = parseInt(b.quality?.match(/\d+/)?.[0] || 0);
      return qualityB - qualityA;
    });

  const audioFormats = filteredFormats
    .filter(format => format.hasAudio && !format.hasVideo)
    .sort((a, b) => {
      const sizeA = parseInt(a.contentLength || 0);
      const sizeB = parseInt(b.contentLength || 0);
      return sizeB - sizeA;
    });

  return { videoFormats, audioFormats };
}

module.exports = async (req, res) => {
  // 允许所有跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('收到请求:', {
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body
    });

    let videoUrl = req.query.url || (req.body && req.body.url);
    const action = req.query.action || (req.body && req.body.action);

    if (!videoUrl) {
      return res.status(400).json({ error: '请提供视频URL参数' });
    }

    // 提取视频ID
    let videoId;
    try {
      if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = new URL(videoUrl).searchParams.get('v');
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      } else if (videoUrl.includes('youtube.com/shorts/')) {
        videoId = videoUrl.split('shorts/')[1].split('?')[0];
      } else {
        return res.status(400).json({ error: '不支持的URL格式' });
      }
    } catch (error) {
      console.error('URL解析错误:', error);
      return res.status(400).json({ error: 'URL格式错误' });
    }

    console.log('视频ID:', videoId);

    // 如果是分析请求
    if (action === 'analyze') {
      try {
        console.log('开始获取视频信息...');
        const info = await getVideoInfo(videoId);
        console.log('成功获取视频信息');
        const { videoFormats, audioFormats } = processFormats(info.formats);
        
        const response = {
          title: info.title,
          thumbnail: info.thumbnail,
          description: info.description,
          formats: {
            video: videoFormats.map(format => ({
              itag: format.itag,
              quality: format.quality,
              mimeType: format.mimeType,
              size: parseInt(format.contentLength || 0),
              url: format.url
            })),
            audio: audioFormats.map(format => ({
              itag: format.itag,
              quality: 'Audio',
              mimeType: format.mimeType,
              size: parseInt(format.contentLength || 0),
              url: format.url
            }))
          }
        };

        console.log('发送解析结果');
        return res.status(200).json(response);
      } catch (error) {
        console.error('视频信息获取失败:', error);
        return res.status(500).json({ error: '视频信息获取失败: ' + error.message });
      }
    } 
    // 如果是下载请求
    else if (action === 'download') {
      try {
        const { itag } = req.query;
        if (!itag) {
          return res.status(400).json({ error: '请提供itag参数' });
        }

        const info = await getVideoInfo(videoId);
        const format = info.formats.find(f => f.itag.toString() === itag.toString());
        
        if (!format) {
          return res.status(404).json({ error: '找不到指定的格式' });
        }

        // 直接返回视频URL
        return res.status(200).json({ url: format.url });
      } catch (error) {
        console.error('下载请求处理失败:', error);
        return res.status(500).json({ error: '下载请求处理失败: ' + error.message });
      }
    } else {
      return res.status(400).json({ error: '未指定有效的操作' });
    }
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: '服务器错误: ' + error.message });
  }
};