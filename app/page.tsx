/**
 * @description YouTube下载器主页面组件
 */
'use client'

import { useState } from 'react'
import { LinkIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [url, setUrl] = useState('')

  /**
   * @description 处理视频解析
   */
  const handleAnalyze = async () => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      const data = await response.json()
      console.log(data)
    } catch (error) {
      console.error('解析失败:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          YouTube视频在线解析下载
        </h1>
        <p className="text-center mb-8">
          💡 💡 YouTube视频怎么下载 | 手写文章生成器
        </p>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入YouTube分享地址"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <LinkIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              onClick={handleAnalyze}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              解析
            </button>
          </div>
        </div>

        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">如何解析下载视频？</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>在Youtube里面复制分享链接，例如 https://www.youtube.com/watch?v=UTKS3UKUCUs/</li>
            <li>在本网站输入Youtube分享链接</li>
            <li>点击"解析"按钮获取视频下载链接</li>
            <li>问题微信反馈:【mjimi8】</li>
          </ol>
        </div>
      </div>
    </main>
  )
} 