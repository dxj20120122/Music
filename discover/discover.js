document.addEventListener('DOMContentLoaded', function() {
    // 音乐类型数据
    const genres = [
        { id: 1, name: '流行', songs: '12,345,678', image: 'https://source.unsplash.com/random/300x300/?pop,music' },
        { id: 2, name: '摇滚', songs: '8,765,432', image: 'https://source.unsplash.com/random/300x300/?rock,music' },
        { id: 3, name: '嘻哈', songs: '15,678,901', image: 'https://source.unsplash.com/random/300x300/?hiphop,music' },
        { id: 4, name: '电子', songs: '10,987,654', image: 'https://source.unsplash.com/random/300x300/?electronic,music' },
        { id: 5, name: '爵士', songs: '5,432,109', image: 'https://source.unsplash.com/random/300x300/?jazz,music' },
        { id: 6, name: '古典', songs: '7,654,321', image: 'https://source.unsplash.com/random/300x300/?classical,music' },
        { id: 7, name: '乡村', songs: '6,543,210', image: 'https://source.unsplash.com/random/300x300/?country,music' },
        { id: 8, name: 'R&B', songs: '9,876,543', image: 'https://source.unsplash.com/random/300x300/?rnb,music' }
    ];

    // 新发行数据
    const newReleases = [
        { id: 1, title: 'Midnight Dreams', artist: 'Aria', cover: 'https://source.unsplash.com/random/300x300/?album,cover1', date: '2023-11-01' },
        { id: 2, title: 'Electric Waves', artist: 'Neon Pulse', cover: 'https://source.unsplash.com/random/300x300/?album,cover2', date: '2023-11-05' },
        { id: 3, title: 'Sunset Memories', artist: 'Chillax', cover: 'https://source.unsplash.com/random/300x300/?album,cover3', date: '2023-11-08' },
        { id: 4, title: 'Urban Legends', artist: 'Metro Sound', cover: 'https://source.unsplash.com/random/300x300/?album,cover4', date: '2023-11-12' },
        { id: 5, title: 'Cosmic Journey', artist: 'Stellar', cover: 'https://source.unsplash.com/random/300x300/?album,cover5', date: '2023-11-15' }
    ];

    // 热门艺术家数据
    const popularArtists = [
        { id: 1, name: 'The Weeknd', genre: '流行/R&B', avatar: 'https://source.unsplash.com/random/300x300/?theweeknd' },
        { id: 2, name: 'Taylor Swift', genre: '流行', avatar: 'https://source.unsplash.com/random/300x300/?taylorswift' },
        { id: 3, name: 'Drake', genre: '嘻哈', avatar: 'https://source.unsplash.com/random/300x300/?drake' },
        { id: 4, name: 'Billie Eilish', genre: '另类', avatar: 'https://source.unsplash.com/random/300x300/?billieeilish' },
        { id: 5, name: 'BTS', genre: 'K-Pop', avatar: 'https://source.unsplash.com/random/300x300/?bts' },
        { id: 6, name: 'Ed Sheeran', genre: '流行', avatar: 'https://source.unsplash.com/random/300x300/?edsheeran' }
    ];

    // DOM元素
    const genreGrid = document.getElementById('genreGrid');
    const newReleasesGrid = document.getElementById('newReleases');
    const artistGrid = document.getElementById('artistGrid');
    const moodTags = document.querySelectorAll('.mood-tag');
    const themeToggle = document.getElementById('themeToggle');
    const toast = document.getElementById('toast');

    // 初始化
    renderGenres();
    renderNewReleases();
    renderPopularArtists();
    setupEventListeners();

    // 渲染音乐类型
    function renderGenres() {
        genreGrid.innerHTML = '';
        genres.forEach(genre => {
            const genreCard = document.createElement('div');
            genreCard.className = 'genre-card';
            genreCard.innerHTML = `
                <div class="genre-image" style="background-image: url('${genre.image}')">
                    <div class="genre-info">
                        <div class="genre-name">${genre.name}</div>
                        <div class="genre-songs">${genre.songs} 首歌曲</div>
                    </div>
                </div>
            `;
            genreGrid.appendChild(genreCard);
        });
    }

    // 渲染新发行
    function renderNewReleases() {
        newReleasesGrid.innerHTML = '';
        newReleases.forEach(release => {
            const releaseCard = document.createElement('div');
            releaseCard.className = 'song-card';
            releaseCard.innerHTML = `
                <div class="song-image" style="background-image: url('${release.cover}')">
                    <button class="play-button" data-id="${release.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-button" data-id="${release.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="song-info">
                    <div class="song-title">${release.title}</div>
                    <div class="song-artist">${release.artist}</div>
                    <div class="song-duration">${formatDate(release.date)}</div>
                </div>
            `;
            newReleasesGrid.appendChild(releaseCard);
        });
    }

    // 渲染热门艺术家
    function renderPopularArtists() {
        artistGrid.innerHTML = '';
        popularArtists.forEach(artist => {
            const artistCard = document.createElement('div');
            artistCard.className = 'artist-card';
            artistCard.innerHTML = `
                <img src="${artist.avatar}" alt="${artist.name}" class="artist-avatar">
                <div class="artist-name">${artist.name}</div>
                <div class="artist-genre">${artist.genre}</div>
            `;
            artistGrid.appendChild(artistCard);
        });
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 心情标签点击
        moodTags.forEach(tag => {
            tag.addEventListener('click', function() {
                moodTags.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                showToast(`显示 ${this.textContent} 音乐`);
                // 这里可以添加筛选逻辑
            });
        });

        // 主题切换
        themeToggle.addEventListener('click', toggleTheme);

        // 播放按钮
        document.addEventListener('click', function(e) {
            if (e.target.closest('.play-button')) {
                const songId = e.target.closest('.play-button').getAttribute('data-id');
                showToast(`正在播放歌曲 ID: ${songId}`);
                // 实际应用中这里会调用播放函数
            }
        });

        // 收藏按钮
        document.addEventListener('click', function(e) {
            if (e.target.closest('.favorite-button')) {
                const button = e.target.closest('.favorite-button');
                button.classList.toggle('favorited');
                showToast(button.classList.contains('favorited') ? '已添加到收藏' : '已从收藏移除');
            }
        });
    }

    // 切换主题
    function toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    }

    // 显示提示
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // 格式化日期
    function formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}月${date.getDate()}日`;
    }

    // 检查本地存储的主题设置
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});