/**
 * @description 处理视频解析的主要函数
 */
// 存储解析后的数据
window.parsedData = null;

// 解析视频
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
        
        // 格式化数据以适应我们的显示需求
        window.parsedData = {
            title: data.title,
            thumbnail: data.thumbnail,
            description: data.description || '',
            formats: {
                video: data.formats.filter(f => f.mimeType.includes('video')),
                audio: data.formats.filter(f => f.mimeType.includes('audio'))
            }
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
            // 视频下载选项
            let videoContent = '';
            if (data.formats.video.length > 0) {
                videoContent += `<h3 class="text-lg font-semibold mb-4">视频下载选项</h3>`;
                data.formats.video.forEach(format => {
                    const size = format.size ? `${Math.round(format.size / 1024 / 1024)}MB` : '未知大小';
                    videoContent += `
                        <div class="mb-2">
                            <a href="${format.url}" class="text-blue-600 hover:underline" download>
                                ${format.quality} - ${size}
                            </a>
                        </div>
                    `;
                });
            }

            // 音频下载选项
            if (data.formats.audio.length > 0) {
                videoContent += '<h3 class="text-lg font-semibold mt-6 mb-4">音频下载选项</h3>';
                data.formats.audio.forEach(format => {
                    const size = format.size ? `${Math.round(format.size / 1024 / 1024)}MB` : '未知大小';
                    videoContent += `
                        <div class="mb-2">
                            <a href="${format.url}" class="text-blue-600 hover:underline" download>
                                音频 - ${size}
                            </a>
                        </div>
                    `;
                });
            }

            videoInfoDiv.innerHTML = videoContent;
            break;

        case 'image':
            // 显示缩略图
            if (data.thumbnail) {
                videoInfoDiv.innerHTML = `
                    <div class="text-center">
                        <img src="${data.thumbnail}" alt="视频缩略图" class="max-w-full h-auto rounded-lg">
                    </div>
                `;
            } else {
                videoInfoDiv.innerHTML = '<p class="text-center text-gray-500">暂无图片</p>';
            }
            break;

        case 'text':
            // 显示标题和描述
            videoInfoDiv.innerHTML = `
                <div class="space-y-4">
                    <h3 class="text-xl font-semibold">${data.title || '无标题'}</h3>
                    <p class="whitespace-pre-wrap text-gray-600">${data.description || '暂无描述'}</p>
                </div>
            `;
            break;
    }
} 