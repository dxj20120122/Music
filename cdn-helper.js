// CDN助手：用于处理音乐文件的CDN访问
class CDNHelper {
    constructor() {
        // CDN基础配置
        this.cdnConfig = {
            // 主要CDN (jsDelivr)
            primary: {
                baseUrl: 'https://cdn.jsdelivr.net/gh',
                enabled: true
            },
            // 备用CDN (fastly.jsdelivr.net)
            fallback: {
                baseUrl: 'https://fastly.jsdelivr.net/gh',
                enabled: true
            }
        };

        // 资源类型配置
        this.resourceTypes = {
            audio: {
                extensions: ['.mp3', '.wav', '.ogg'],
                maxSize: 20 * 1024 * 1024 // 20MB limit for jsDelivr
            },
            lyrics: {
                extensions: ['.lrc']
            },
            image: {
                extensions: ['.jpg', '.jpeg', '.png', '.gif']
            }
        };
    }

    // 获取资源的CDN URL
    getResourceUrl(path, type = 'primary') {
        const cdn = this.cdnConfig[type];
        if (!cdn || !cdn.enabled) {
            console.warn(`CDN ${type} is not available`);
            return null;
        }

        // 检查资源类型
        const resourceType = this.getResourceType(path);
        if (!resourceType) {
            console.warn(`Unsupported resource type for path: ${path}`);
            return null;
        }

        // 构建完整的CDN URL
        return `${cdn.baseUrl}/[USERNAME]/[REPO]/${path}`;
    }

    // 获取资源类型
    getResourceType(path) {
        const extension = path.substring(path.lastIndexOf('.')).toLowerCase();
        
        for (const [type, config] of Object.entries(this.resourceTypes)) {
            if (config.extensions.includes(extension)) {
                return type;
            }
        }
        return null;
    }

    // 获取音频文件URL
    getAudioUrl(path) {
        // 尝试主CDN
        let url = this.getResourceUrl(path, 'primary');
        if (!url) {
            // 如果主CDN失败，尝试备用CDN
            url = this.getResourceUrl(path, 'fallback');
        }
        return url;
    }

    // 获取歌词文件URL
    getLyricsUrl(path) {
        return this.getResourceUrl(path, 'primary');
    }

    // 获取图片文件URL
    getImageUrl(path) {
        return this.getResourceUrl(path, 'primary');
    }

    // 测试CDN可用性
    async testCDNAvailability() {
        const results = {};
        
        for (const [name, cdn] of Object.entries(this.cdnConfig)) {
            try {
                const response = await fetch(`${cdn.baseUrl}/[USERNAME]/[REPO]/test.txt`);
                results[name] = response.ok;
            } catch (error) {
                console.error(`Error testing ${name} CDN:`, error);
                results[name] = false;
            }
        }

        return results;
    }
}

// 导出CDN助手实例
const cdnHelper = new CDNHelper();