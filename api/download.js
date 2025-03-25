// api/download.js
const ytdl = require('ytdl-core');
const { pipeline } = require('stream');
const { promisify } = require('util');

// 获取视频信息
async function getVideoInfo(videoId) {
  try {
    const info = await ytdl.getInfo(videoId);
    return {
      title: info.videoDetails.title,
      formats: info.formats.map(format => ({
        itag: format.itag,
        mimeType: format.mimeType,
        quality: format.qualityLabel || format.quality,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo,
        contentLength: format.contentLength,
        url: format.url
      })),
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
      description: info.videoDetails.description
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    throw error;
  }
}

// 过滤并分类格式
function processFormats(formats) {
  // 仅保留MP4视频和M4A音频
  const filteredFormats = formats.filter(format => {
    const mimeType = format.mimeType || '';
    return (mimeType.includes('mp4') || mimeType.includes('m4a')) && format.url;
  });

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
  console.log('收到API请求:', req.url);
  console.log('请求方法:', req.method);
  console.log('请求参数:', req.query);

  // 允许所有跨域请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url, action } = req.query;
    console.log('处理URL:', url);
    console.log('操作类型:', action);
    
    if (!url) {
      console.log('错误: 未提供URL');
      return res.status(400).json({ error: '请提供视频URL参数' });
    }

    // 提取视频ID
    let videoId;
    if (url.includes('youtube.com/watch?v=')) {
      videoId = new URL(url).searchParams.get('v');
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/shorts/')) {
      videoId = url.split('shorts/')[1].split('?')[0];
    } else {
      console.log('错误: 不支持的URL格式');
      return res.status(400).json({ error: '不支持的URL格式' });
    }

    console.log('提取的视频ID:', videoId);

    // 如果是分析请求
    if (action === 'analyze') {
      console.log('开始获取视频信息...');
      const info = await getVideoInfo(videoId);
      console.log('成功获取视频信息');
      const { videoFormats, audioFormats } = processFormats(info.formats);
      console.log('视频格式数量:', videoFormats.length);
      console.log('音频格式数量:', audioFormats.length);
      
      return res.status(200).json({
        title: info.title,
        thumbnail: info.thumbnail,
        description: info.description,
        formats: {
          video: videoFormats.map(format => ({
            itag: format.itag,
            quality: format.quality,
            mimeType: format.mimeType,
            size: parseInt(format.contentLength || 0),
            url: `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&itag=${format.itag}&action=download`
          })),
          audio: audioFormats.map(format => ({
            itag: format.itag,
            quality: 'Audio',
            mimeType: format.mimeType,
            size: parseInt(format.contentLength || 0),
            url: `/api/download?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&itag=${format.itag}&action=download`
          }))
        }
      });
    } 
    // 如果是下载请求
    else if (action === 'download') {
      const { itag } = req.query;
      if (!itag) {
        return res.status(400).json({ error: '请提供itag参数' });
      }

      const info = await ytdl.getInfo(videoId);
      const format = info.formats.find(f => f.itag.toString() === itag.toString());
      
      if (!format) {
        return res.status(404).json({ error: '找不到指定的格式' });
      }

      const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
      const isAudio = format.mimeType.includes('audio') && !format.hasVideo;
      const contentType = format.mimeType.split(';')[0];
      const extension = isAudio ? 'm4a' : 'mp4';
      const filename = `${videoTitle}-${format.qualityLabel || 'audio'}.${extension}`;

      // 设置响应头
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', contentType);

      // 创建下载流
      const stream = ytdl(videoId, { quality: itag });
      
      // 流式传输到客户端
      stream.pipe(res);

      // 处理错误
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: '下载过程中出错' });
        }
      });
    } else {
      return res.status(400).json({ error: '未指定有效的操作' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: '服务器错误: ' + error.message });
  }
};