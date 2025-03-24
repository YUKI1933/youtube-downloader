/**
 * @description 处理视频解析的主要函数
 */
// 存储解析后的数据
window.parsedData = null;

async function analyzeVideo() {
    // 检查用户是否已登录
    if (!checkAuth()) {
        return;
    }

    const urlInput = document.getElementById('urlInput');
    const resultDiv = document.getElementById('result');
    const videoInfoDiv = document.getElementById('videoInfo');
    const url = urlInput.value.trim();

    if (!url) {
        alert('请输入YouTube视频链接');
        return;
    }

    try {
        // 显示加载状态
        videoInfoDiv.innerHTML = '<div class="text-center py-8"><div class="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div><div class="mt-4 text-gray-600">正在解析视频信息...</div></div>';
        resultDiv.classList.remove('hidden');

        // 发送请求到后端API
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('解析失败');
        }

        const data = await response.json();
        window.parsedData = data;

        if (data.error) {
            throw new Error(data.error);
        }

        // 按质量对格式进行分组并过滤
        const formatGroups = {
            video: data.formats
                .filter(f => f.mimeType && f.mimeType.includes('mp4') && f.quality)
                .sort((a, b) => {
                    const heightA = parseInt(a.quality) || 0;
                    const heightB = parseInt(b.quality) || 0;
                    return heightB - heightA;
                }),
            audio: data.formats
                .filter(f => f.mimeType && f.mimeType.includes('m4a'))
        };

        // 存储解析数据
        window.parsedData = {
            title: data.title,
            thumbnail: data.thumbnail,
            formats: formatGroups,
            description: data.description || ''
        };

        // 默认显示视频标签内容
        showContent('video');
    } catch (error) {
        videoInfoDiv.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-600 text-lg">
                    ${error.message || '视频解析失败，请检查链接是否正确'}
                </div>
            </div>
        `;
    }
}

/**
 * @description 切换显示内容
 * @param {string} tab - 标签类型：video/image/text
 */
function showContent(tab) {
    // 检查用户是否已登录
    if (!checkAuth()) {
        return;
    }

    const data = window.parsedData;
    if (!data) return;

    // 更新标签样式
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.dataset.tab === tab) {
            button.classList.add('tab-active');
        } else {
            button.classList.remove('tab-active');
        }
    });

    const videoInfoDiv = document.getElementById('videoInfo');
    videoInfoDiv.innerHTML = '';

    switch (tab) {
        case 'video':
            videoInfoDiv.innerHTML = `
                <div class="space-y-6">
                    <div class="flex items-start gap-6">
                        <img src="${data.thumbnail}" alt="视频缩略图" class="w-64 rounded-lg shadow-lg">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold mb-4">${data.title}</h3>
                            <div class="space-y-4">
                                <div>
                                    <h4 class="font-medium mb-2">视频下载 (MP4)：</h4>
                                    <div class="grid gap-2">
                                        ${data.formats.video.map(format => `
                                            <a 
                                                href="${format.url}" 
                                                target="_blank"
                                                class="flex items-center justify-between px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                                            >
                                                <span>${format.quality}</span>
                                                ${format.size ? `<span class="text-sm">(${Math.round(format.size / 1024 / 1024)}MB)</span>` : ''}
                                            </a>
                                        `).join('')}
                                    </div>
                                </div>
                                ${data.formats.audio.length > 0 ? `
                                    <div>
                                        <h4 class="font-medium mb-2">音频下载 (M4A)：</h4>
                                        <div class="grid gap-2">
                                            ${data.formats.audio.map(format => `
                                                <a 
                                                    href="${format.url}" 
                                                    target="_blank"
                                                    class="flex items-center justify-between px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
                                                >
                                                    <span>音频</span>
                                                    ${format.size ? `<span class="text-sm">(${Math.round(format.size / 1024 / 1024)}MB)</span>` : ''}
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'image':
            videoInfoDiv.innerHTML = data.thumbnail ? `
                <div class="p-4">
                    <img src="${data.thumbnail}" alt="视频缩略图" class="max-w-2xl mx-auto rounded-lg shadow-lg">
                </div>
            ` : `
                <div class="text-center py-8 text-gray-500">
                    暂无图片
                </div>
            `;
            break;

        case 'text':
            videoInfoDiv.innerHTML = `
                <div class="p-4">
                    <h3 class="text-xl font-bold mb-4">${data.title}</h3>
                    <div class="whitespace-pre-wrap text-gray-600">
                        ${data.description || '暂无文案'}
                    </div>
                </div>
            `;
            break;
    }
} 