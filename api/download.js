// api/download.js
const express = require('express');
const playdl = require('play-dl');
const path = require('path');
const os = require('os');

// 修改ytdl-core的内部配置
const utils = require('@distube/ytdl-core/lib/utils');
utils.saveDebugFile = () => {}; // 覆盖保存调试文件的函数

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
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`第 ${i + 1}/${retries} 次尝试失败:`, error.message);
      
      if (i === retries - 1) {
        console.error('所有重试都失败了');
        throw lastError;
      }
      
      // 增加重试延迟
      const nextDelay = delay * (i + 1);
      console.log(`等待 ${nextDelay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, nextDelay));
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
      
      // 验证URL
      const validateResult = await playdl.validate(videoUrl);
      console.log('URL验证结果:', validateResult);
      if (validateResult !== 'youtube' && validateResult !== 'yt_video') {
        throw new Error(`不支持的URL类型: ${validateResult}`);
      }

      // 获取视频信息
      const info = await playdl.video_info(videoUrl);
      if (!info) {
        throw new Error('无法获取视频信息');
      }

      // 处理视频格式
      const formats = info.format;
      const videoFormats = formats.filter(format => format.mimeType.includes('video'));
      
      // 按质量排序
      const sortedFormats = videoFormats.sort((a, b) => {
        const qualityA = parseInt(a.quality?.match(/\d+/)?.[0] || '0');
        const qualityB = parseInt(b.quality?.match(/\d+/)?.[0] || '0');
        return qualityB - qualityA;
      });

      return {
        title: info.video_details.title,
        description: info.video_details.description,
        duration: info.video_details.durationInSec,
        thumbnail: info.video_details.thumbnails[0].url,
        formats: sortedFormats.map(format => ({
          url: format.url,
          mimeType: format.mimeType,
          quality: format.quality,
          container: format.container,
          size: format.contentLength
        }))
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

const router = express.Router();

// 导出路由处理函数
module.exports = async (req, res) => {
  try {
    const { videoId } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: '缺少视频ID参数' });
    }

    const info = await getVideoInfo(videoId);
    res.json(info);
  } catch (error) {
    console.error('处理请求失败:', error);
    res.status(500).json({ error: error.message });
  }
};