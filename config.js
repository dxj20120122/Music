// CDN配置文件
const config = {
    // GitHub仓库信息
    github: {
        username: 'dxj20120122', // 你的GitHub用户名
        repo: 'Music',     // 你的仓库名
        branch: 'main' // 分支名，默认main
    },
    
    // CDN基础URL
    getCdnUrl() {
        return `https://cdn.jsdelivr.net/gh/${this.github.username}/${this.github.repo}@${this.github.branch}`;
    },
    
    // 获取音乐文件CDN URL
    getMusicUrl(songPath) {
        return `${this.getCdnUrl()}/${songPath}`;
    },
    
    // 获取歌词文件CDN URL
    getLyricsUrl(lyricsPath) {
        return `${this.getCdnUrl()}/${lyricsPath}`;
    },
    
    // 获取图片文件CDN URL
    getImageUrl(imagePath) {
        return `${this.getCdnUrl()}/${imagePath}`;
    }
};