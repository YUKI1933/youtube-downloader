// api/download.js
const express = require('express');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

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
  let browser = null;
  
  try {
    // 启动浏览器
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true,
      ignoreHTTPSErrors: true
    });

    // 创建新页面
    const page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 设置请求拦截
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // 只允许文档和XHR请求
      if (['document', 'xhr'].includes(request.resourceType())) {
        request.continue();
      } else {
        request.abort();
      }
    });

    // 导航到视频页面
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    await page.goto(videoUrl, { waitUntil: 'networkidle0' });

    // 等待视频信息加载
    await page.waitForSelector('ytd-watch-metadata');

    // 提取视频信息
    const videoInfo = await page.evaluate(() => {
      const ytInitialPlayerResponse = window.ytInitialPlayerResponse;
      if (!ytInitialPlayerResponse) {
        throw new Error('无法获取视频信息');
      }

      const { videoDetails, streamingData } = ytInitialPlayerResponse;
      
      // 处理格式
      const formats = [];
      if (streamingData.formats) {
        formats.push(...streamingData.formats);
      }
      if (streamingData.adaptiveFormats) {
        formats.push(...streamingData.adaptiveFormats);
      }

      return {
        title: videoDetails.title,
        description: videoDetails.shortDescription,
        duration: parseInt(videoDetails.lengthSeconds),
        thumbnail: videoDetails.thumbnail.thumbnails.pop().url,
        formats: formats.map(format => ({
          url: format.url,
          mimeType: format.mimeType,
          quality: format.qualityLabel || format.quality,
          container: format.container,
          size: format.contentLength
        }))
      };
    });

    return videoInfo;
  } catch (error) {
    console.error('获取视频信息失败:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

const router = express.Router();

// 导出路由处理函数
module.exports = async (req, res) => {
  try {
    const { videoId } = req.query;
    
    if (!videoId) {
      return res.status(400).json({ error: '缺少视频ID参数' });
    }

    const info = await retry(() => getVideoInfo(videoId));
    res.json(info);
  } catch (error) {
    console.error('处理请求失败:', error);
    res.status(500).json({ error: error.message });
  }
};