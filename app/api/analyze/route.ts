/**
 * @description YouTube视频解析API
 */
import { NextResponse } from 'next/server'
import ytdl from 'ytdl-core'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: '无效的YouTube URL' }, { status: 400 })
    }

    const info = await ytdl.getInfo(url)
    const formats = info.formats.map(format => ({
      quality: format.qualityLabel,
      mimeType: format.mimeType,
      url: format.url,
      size: format.contentLength
    }))

    return NextResponse.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      formats
    })
  } catch (error) {
    console.error('视频解析错误:', error)
    return NextResponse.json(
      { error: '视频解析失败，请检查URL是否正确' },
      { status: 500 }
    )
  }
} 