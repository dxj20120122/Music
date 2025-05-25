document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let songs = [];
    let currentSongIndex = -1;
    let isPlaying = false;
    let audio = new Audio();
    let currentView = 'grid';
    let currentType = 'all';
    
    // DOM元素
    const songGrid = document.getElementById('songGrid');
    const songList = document.getElementById('songList');
    const audioPlayer = document.getElementById('audioPlayer');
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playButton = document.getElementById('playButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeLevel = document.getElementById('volumeLevel');
    const toast = document.getElementById('toast');
    const themeToggle = document.getElementById('themeToggle');
    const searchInput = document.getElementById('searchInput');
    const viewButtons = document.querySelectorAll('.view-button');
    const chartTabs = document.querySelectorAll('.chart-tab');
    
    // 初始化
    loadSongs();
    setupEventListeners();
    
    // 加载歌曲数据
    function loadSongs() {
        fetch('songs.json')
            .then(response => response.json())
            .then(data => {
                songs = data.songs;
                renderSongs();
            })
            .catch(error => {
                console.error('Error loading songs:', error);
                songGrid.innerHTML = '<div class="no-results">无法加载歌曲数据</div>';
            });
    }
    
    // 渲染歌曲
    function renderSongs() {
        if (songs.length === 0) {
            songGrid.innerHTML = '<div class="no-results">没有找到歌曲</div>';
            songList.innerHTML = '';
            return;
        }
        
        // 过滤歌曲
        let filteredSongs = songs;
        if (currentType !== 'all') {
            filteredSongs = songs.filter(song => song.type === currentType);
        }
        
        // 渲染网格视图
        songGrid.innerHTML = '';
        filteredSongs.forEach((song, index) => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <div class="song-image" style="background: ${getRandomGradient()}">
                    <div class="song-rank">${song.rank}</div>
                    <div class="song-plays">${formatPlays(song.plays)}</div>
                    <button class="play-button" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-button" data-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <div class="song-duration">${song.duration}</div>
                </div>
            `;
            songGrid.appendChild(songCard);
        });
        
        // 渲染列表视图
        songList.innerHTML = '';
        filteredSongs.forEach((song, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'song-list-item';
            listItem.innerHTML = `
                <img src="${song.cover}" alt="${song.title}" class="song-list-image">
                <div class="song-list-info">
                    <div class="song-list-title">${song.title}</div>
                    <div class="song-list-artist">${song.artist}</div>
                </div>
                <div class="song-list-duration">${song.duration}</div>
                <div class="song-list-actions">
                    <button class="favorite-button" data-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="play-button" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
            songList.appendChild(listItem);
        });
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 播放按钮
        document.addEventListener('click', function(e) {
            if (e.target.closest('.play-button')) {
                const songId = parseInt(e.target.closest('.play-button').getAttribute('data-id'));
                const songIndex = songs.findIndex(song => song.id === songId);
                if (songIndex !== -1) {
                    playSong(songIndex);
                }
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
        
        // 播放控制
        playButton.addEventListener('click', togglePlay);
        prevButton.addEventListener('click', playPrevious);
        nextButton.addEventListener('click', playNext);
        
        // 进度条
        progressBar.addEventListener('click', function(e) {
            const percent = e.offsetX / this.offsetWidth;
            audio.currentTime = percent * audio.duration;
            updateProgressBar();
        });
        
        // 音量控制
        volumeSlider.addEventListener('click', function(e) {
            const percent = e.offsetX / this.offsetWidth;
            audio.volume = percent;
            updateVolumeSlider();
        });
        
        // 主题切换
        themeToggle.addEventListener('click', toggleTheme);
        
        // 视图切换
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                viewButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentView = this.getAttribute('data-view');
                
                if (currentView === 'grid') {
                    songGrid.style.display = 'grid';
                    songList.style.display = 'none';
                } else {
                    songGrid.style.display = 'none';
                    songList.style.display = 'flex';
                }
            });
        });
        
        // 排行榜标签
        chartTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                chartTabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentType = this.getAttribute('data-type');
                renderSongs();
            });
        });
        
        // 搜索功能
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            if (searchTerm.length > 0) {
                const filtered = songs.filter(song => 
                    song.title.toLowerCase().includes(searchTerm) || 
                    song.artist.toLowerCase().includes(searchTerm)
                );
                displaySearchResults(filtered);
            } else {
                renderSongs();
            }
        });
        
        // 音频事件
        audio.addEventListener('timeupdate', updateProgressBar);
        audio.addEventListener('ended', playNext);
        audio.addEventListener('loadedmetadata', function() {
            durationDisplay.textContent = formatTime(audio.duration);
        });
    }
    
    // 播放歌曲
    function playSong(index) {
        if (index < 0 || index >= songs.length) return;
        
        currentSongIndex = index;
        const song = songs[currentSongIndex];
        
        // 更新播放器显示
        playerTitle.textContent = song.title;
        playerArtist.textContent = song.artist;
        
        // 设置音频源
        audio.src = song.audioUrl || `https://example.com/songs/${song.id}.mp3`;
        audio.play()
            .then(() => {
                isPlaying = true;
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
                audioPlayer.classList.add('active');
            })
            .catch(error => {
                console.error('播放失败:', error);
                showToast('播放失败，请稍后再试');
            });
    }
    
    // 切换播放状态
    function togglePlay() {
        if (currentSongIndex === -1 && songs.length > 0) {
            playSong(0);
            return;
        }
        
        if (isPlaying) {
            audio.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audio.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    }
    
    // 播放上一首
    function playPrevious() {
        if (songs.length === 0) return;
        
        let newIndex = currentSongIndex - 1;
        if (newIndex < 0) newIndex = songs.length - 1;
        playSong(newIndex);
    }
    
    // 播放下一首
    function playNext() {
        if (songs.length === 0) return;
        
        let newIndex = currentSongIndex + 1;
        if (newIndex >= songs.length) newIndex = 0;
        playSong(newIndex);
    }
    
    // 更新进度条
    function updateProgressBar() {
        if (audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            currentTimeDisplay.textContent = formatTime(audio.currentTime);
        }
    }
    
    // 更新音量滑块
    function updateVolumeSlider() {
        const percent = audio.volume * 100;
        volumeLevel.style.width = `${percent}%`;
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
    
    // 显示搜索结果
    function displaySearchResults(results) {
        if (results.length === 0) {
            songGrid.innerHTML = '<div class="no-results">没有找到匹配的歌曲</div>';
            songList.innerHTML = '';
            return;
        }
        
        // 更新网格视图
        songGrid.innerHTML = '';
        results.forEach(song => {
            const songCard = document.createElement('div');
            songCard.className = 'song-card';
            songCard.innerHTML = `
                <div class="song-image" style="background: ${getRandomGradient()}">
                    <div class="song-rank">${song.rank}</div>
                    <div class="song-plays">${formatPlays(song.plays)}</div>
                    <button class="play-button" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-button" data-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                    <div class="song-duration">${song.duration}</div>
                </div>
            `;
            songGrid.appendChild(songCard);
        });
        
        // 更新列表视图
        songList.innerHTML = '';
        results.forEach(song => {
            const listItem = document.createElement('div');
            listItem.className = 'song-list-item';
            listItem.innerHTML = `
                <img src="${song.cover}" alt="${song.title}" class="song-list-image">
                <div class="song-list-info">
                    <div class="song-list-title">${song.title}</div>
                    <div class="song-list-artist">${song.artist}</div>
                </div>
                <div class="song-list-duration">${song.duration}</div>
                <div class="song-list-actions">
                    <button class="favorite-button" data-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="play-button" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
            songList.appendChild(listItem);
        });
    }
    
    // 辅助函数
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    function formatPlays(plays) {
        if (plays >= 1000000000) {
            return (plays / 1000000000).toFixed(1) + 'B';
        } else if (plays >= 1000000) {
            return (plays / 1000000).toFixed(1) + 'M';
        } else if (plays >= 1000) {
            return (plays / 1000).toFixed(1) + 'K';
        }
        return plays;
    }
    
    function getRandomGradient() {
        const colors = [
            'linear-gradient(135deg, #5d5dff 0%, #6b46c1 100%)',
            'linear-gradient(135deg, #FF9A8B 0%, #FF6B95 50%, #FF8E53 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
            'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 检查本地存储的主题设置
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
});