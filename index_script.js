// 定义全局变量
let allSongs = [];
let currentPage = 1;
const songsPerPage = 500; // 每页加载的歌曲数量
let isLoading = false;
let hasMoreSongs = true;
let autoLoadEnabled = true; // 控制是否自动加载歌曲
let isMobileData = false; // 是否移动数据环境
let currentPlayingSong = null; // 当前播放的歌曲
let visibleSongIds = new Set(); // 当前可见区域的歌曲ID

// 检测网络连接类型
async function checkNetworkType() {
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection.type === 'cellular') {
            isMobileData = true;
            // 使用移动数据时询问用户
            const userChoice = await showNetworkPrompt();
            autoLoadEnabled = userChoice;

            // 移动数据下优化显示
            document.body.classList.add('mobile-data');
            document.querySelectorAll('.song-image img').forEach(img => {
                img.style.display = 'none';
            });
        } else {
            // WiFi或其他网络类型时自动加载
            isMobileData = false;
            autoLoadEnabled = true;
            document.body.classList.remove('mobile-data');
        }
    }
}

// 显示网络提示对话框
function showNetworkPrompt() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'network-modal';
        modal.innerHTML = `
            <div class="network-content">
                <h3>网络提示</h3>
                <p>检测到您正在使用移动数据，是否要加载全部歌曲？</p>
                <div class="network-buttons">
                    <button id="loadAll">加载全部</button>
                    <button id="loadOnDemand">按需加载</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 添加按钮事件监听
        modal.querySelector('#loadAll').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(true);
        });

        modal.querySelector('#loadOnDemand').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

async function loadSongs(page = 1, prioritySongId = null) {
    // 首次加载时检查网络类型
    if (page === 1) {
        await checkNetworkType();
    }

    if (isLoading || !hasMoreSongs || (!autoLoadEnabled && page > 1)) return [];

    isLoading = true;
    showLoadingIndicator();

    try {
        // 首先从主songs.json获取歌曲名列表
        const response = await fetch('songs.json');
        if (!response.ok) {
            throw new Error('无法加载歌曲列表');
        }
        const allSongNames = await response.json();

        // 计算当前页的歌曲范围
        const startIndex = (page - 1) * songsPerPage;
        const endIndex = startIndex + songsPerPage;
        const songNames = allSongNames.slice(startIndex, endIndex);

        // 如果没有歌曲了，设置标志位
        if (songNames.length === 0) {
            hasMoreSongs = false;
            hideLoadingIndicator();
            isLoading = false;
            return [];
        }

        // 为每个歌曲名创建一个Promise来获取详细信息
        const songPromises = songNames.map(async (songName, index) => {
            try {
                // 从每个歌曲文件夹中获取详细信息
                const songResponse = await fetch(`${songName}/songs.json`);
                if (!songResponse.ok) {
                    console.warn(`无法加载歌曲 ${songName} 的详细信息`);
                    return null;
                }

                const songDetails = await songResponse.json();
                // 确保songDetails是一个数组并且有内容
                if (Array.isArray(songDetails) && songDetails.length > 0) {
                    // 获取第一个元素作为歌曲详情
                    const songDetail = songDetails[0];
                    const songId = (startIndex + index) + 1;

                    return {
                        id: songId,
                        title: songDetail.title || songName,
                        artist: songDetail.artist || '',
                        folderName: songName,
                        cover: songDetail.cover || '',
                        audio: songDetail.audio || '',
                        lyrics: songDetail.lyrics || ''
                    };
                }
                return null;
            } catch (error) {
                console.error(`加载歌曲 ${songName} 详细信息时出错:`, error);
                return null;
            }
        });

        // 等待所有Promise完成
        const songsWithDetails = await Promise.all(songPromises);

        // 过滤掉null值
        const newSongs = songsWithDetails.filter(song => song !== null);

        // 更新全局变量
        if (page === 1) {
            allSongs = newSongs;
        } else {
            allSongs = [...allSongs, ...newSongs];
        }

        currentPage = page;
        return newSongs;
    } catch (error) {
        console.error('加载歌曲数据时出错:', error);
        return [];
    } finally {
        isLoading = false;
        hideLoadingIndicator();
    }
}


// 显示加载指示器
function showLoadingIndicator() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div><p>正在加载更多歌曲...</p>';
    document.getElementById('songGrid').appendChild(loadingIndicator);
}

// 隐藏加载指示器
function hideLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// 检查是否应该加载更多歌曲
function checkScroll() {
    const songGrid = document.getElementById('songGrid');
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = 500; // 提前500px加载

    // 如果接近底部且有更多歌曲可加载，并且当前没有正在加载
    if (scrollPosition > pageHeight - threshold && !isLoading && hasMoreSongs) {
        loadMoreSongs();
    }

    // 更新可见区域歌曲
    updateVisibleSongs();
}

// 更新当前可见区域的歌曲
function updateVisibleSongs() {
    const songCards = document.querySelectorAll('.song-card');
    const newVisibleSongIds = new Set();

    songCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            const songId = parseInt(card.dataset.id);
            newVisibleSongIds.add(songId);

            // 如果歌曲从不可见变为可见，提高其加载优先级
            if (!visibleSongIds.has(songId)) {
                const song = allSongs.find(s => s.id === songId);
                if (song) {
                    loadSongResources(song, true);
                }
            }
        }
    });

    visibleSongIds = newVisibleSongIds;
}

// 加载歌曲资源（只加载封面）
function loadSongResources(song) {
    // 如果是移动数据环境，不加载封面
    if (!isMobileData && song.cover) {
        const img = new Image();
        img.src = `${song.folderName}/${song.cover}`;
    }
}



// 加载更多歌曲
async function loadMoreSongs() {
    const newSongs = await loadSongs(currentPage + 1);
    if (newSongs.length > 0) {
        displaySongs(allSongs);
    }
}

// 格式化时间为分钟:秒
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 显示歌曲卡片（平铺模式）
function displaySongs(songs) {
    const songGrid = document.getElementById('songGrid');

    // 如果是第一页，清空网格
    if (currentPage === 1) {
        songGrid.innerHTML = '';
    }

    // 移除之前的加载指示器（如果有）
    hideLoadingIndicator();

    if (songs.length === 0 && currentPage === 1) {
        songGrid.innerHTML = '<div class="no-results">没有找到匹配的歌曲</div>';
        return;
    }

    songs.forEach(song => {
        // 检查是否已经显示过这首歌
        if (document.querySelector(`.song-card[data-id="${song.id}"]`)) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'song-card';
        card.dataset.id = song.id;

        card.innerHTML = `
            <div class="song-info">
                <div class="song-title" title="${song.title}">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
        `;

        // 点击卡片播放歌曲
        card.addEventListener('click', () => {
            playSong(song);
        });

        songGrid.appendChild(card);
    });

    // 更新可见区域歌曲
    updateVisibleSongs();
}



// 播放歌曲预览
async function playSong(song) {
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const playerTitle = document.getElementById('playerTitle');
    const playerArtist = document.getElementById('playerArtist');
    const playButton = document.getElementById('playButton');

    // 如果正在播放同一首歌，则暂停/继续播放
    if (currentPlayingSong && currentPlayingSong.id === song.id) {
        if (audioElement.paused) {
            try {
                await audioElement.play();
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } catch (error) {
                console.error('播放失败:', error);
                showToast('播放失败，请重试');
            }
        } else {
            audioElement.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        }
        return;
    }

    // 设置当前播放的歌曲
    currentPlayingSong = song;

    // 设置播放器信息
    playerTitle.textContent = song.title;
    playerArtist.textContent = song.artist;

    // 显示播放器
    audioPlayer.classList.add('active');

    // 显示加载状态
    playButton.classList.add('loading');
    playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // 暂停当前播放并重置
        audioElement.pause();
        audioElement.currentTime = 0;

        // 移除所有事件监听器以避免冲突
        audioElement.oncanplay = null;
        audioElement.onerror = null;
        audioElement.onplay = null;

        // 设置音频源
        audioElement.src = `${song.folderName}/${song.audio}`;

        // 等待音频可以播放
        await new Promise((resolve, reject) => {
            const handleCanPlay = () => {
                audioElement.removeEventListener('canplay', handleCanPlay);
                audioElement.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = (err) => {
                audioElement.removeEventListener('canplay', handleCanPlay);
                audioElement.removeEventListener('error', handleError);
                reject(err);
            };

            audioElement.addEventListener('canplay', handleCanPlay, { once: true });
            audioElement.addEventListener('error', handleError, { once: true });

            // 开始加载音频
            audioElement.load();
        });

        // 尝试播放
        await audioElement.play();
        playButton.classList.remove('loading');
        playButton.innerHTML = '<i class="fas fa-pause"></i>';

        // 更新进度条
        updateProgressBar();
    } catch (error) {
        console.error('播放失败:', error);
        playButton.classList.remove('loading');
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        showToast('播放失败，请重试');
    }
}





// 显示提示
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 更新进度条
function updateProgressBar() {
    const audioElement = document.getElementById('audioElement');
    const progressFill = document.getElementById('progressFill');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');

    // 清除旧的事件监听器
    audioElement.removeEventListener('timeupdate', updateTime);
    audioElement.removeEventListener('loadedmetadata', updateDuration);

    function updateTime() {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
    }

    function updateDuration() {
        durationDisplay.textContent = formatTime(audioElement.duration);
    }

    // 设置新的事件监听器
    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('loadedmetadata', updateDuration);

    // 点击进度条跳转
    const progressBar = document.getElementById('progressBar');
    progressBar.addEventListener('click', (e) => {
        const percent = e.offsetX / progressBar.offsetWidth;
        audioElement.currentTime = percent * audioElement.duration;
    });
}


// 搜索歌曲
function searchSongs(songs, query) {
    if (!query) return songs;

    const lowerQuery = query.toLowerCase();
    return songs.filter(song =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery)
    );
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const icon = document.getElementById('themeToggle').querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// 初始化播放器控制
function initPlayerControls() {
    const audioElement = document.getElementById('audioElement');
    const playButton = document.getElementById('playButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    const audioPlayer = document.getElementById('audioPlayer');

    let currentSongIndex = -1;
    let playingPlaylist = [];

    // 播放歌曲函数
    window.playSong = function (song) {
        if (!song) return;

        // 更新当前播放列表和索引
        const songGrid = document.getElementById('songGrid');
        playingPlaylist = Array.from(songGrid.querySelectorAll('.song-card')).map(card => {
            const id = parseInt(card.dataset.id);
            return allSongs.find(s => s.id === id);
        });
        currentSongIndex = playingPlaylist.findIndex(s => s.id === song.id);

        // 设置音频源
        audioElement.src = `${song.folderName}/${song.audio}`;
        audioElement.play()
            .then(() => {
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            })
            .catch(error => {
                console.error('播放失败:', error);
            });

        // 更新播放器信息
        document.getElementById('playerTitle').textContent = song.title;
        document.getElementById('playerArtist').textContent = song.artist;

        // 显示播放器
        audioPlayer.classList.add('active');
    };

    // 播放下一首
    function playNext() {
        if (playingPlaylist.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % playingPlaylist.length;
        playSong(playingPlaylist[currentSongIndex]);
    }

    // 播放上一首
    function playPrev() {
        if (playingPlaylist.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + playingPlaylist.length) % playingPlaylist.length;
        playSong(playingPlaylist[currentSongIndex]);
    }

    // 播放/暂停按钮点击事件
    playButton.addEventListener('click', () => {
        if (audioElement.paused) {
            audioElement.play()
                .then(() => {
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                })
                .catch(error => {
                    console.error('播放失败:', error);
                });
        } else {
            audioElement.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    });

    // 上一首按钮点击事件
    prevButton.addEventListener('click', playPrev);

    // 下一首按钮点击事件
    nextButton.addEventListener('click', playNext);

    // 歌曲结束时自动播放下一首
    audioElement.addEventListener('ended', playNext);

    // 进度条更新
    audioElement.addEventListener('timeupdate', () => {
        const progress = (audioElement.currentTime / audioElement.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);
    });

    // 音频加载完成后显示总时长
    audioElement.addEventListener('loadedmetadata', () => {
        durationDisplay.textContent = formatTime(audioElement.duration);
    });

    // 点击进度条跳转
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = pos * audioElement.duration;
    });
}

// 初始化收藏弹窗功能
function initFavoritesModal() {
    const favoritesButton = document.getElementById('favoritesButton');
    const favoritesModal = document.getElementById('favoritesModal');
    const closeFavoritesModal = document.getElementById('closeFavoritesModal');
    const exploreSongs = document.getElementById('exploreSongs');

    // 打开收藏弹窗
    favoritesButton.addEventListener('click', () => {
        updateFavoritesList();
        favoritesModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    });

    // 关闭收藏弹窗
    closeFavoritesModal.addEventListener('click', () => {
        favoritesModal.classList.remove('active');
        document.body.style.overflow = '';
    });

    // 点击外部区域关闭弹窗
    favoritesModal.addEventListener('click', (e) => {
        if (e.target === favoritesModal) {
            favoritesModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // 点击"去发现音乐"按钮
    exploreSongs.addEventListener('click', () => {
        favoritesModal.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// 更新收藏列表
async function updateFavoritesList() {
    const favoritesList = document.getElementById('favoritesList');
    const favoritesEmpty = document.getElementById('favoritesEmpty');
    const allSongs = await loadSongs();

    // 从localStorage获取收藏歌曲ID
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    const favoriteSongs = allSongs.filter(song => favorites[song.id]);

    // 清空列表
    favoritesList.innerHTML = '';

    // 显示收藏列表或空状态
    if (favoriteSongs.length > 0) {
        favoritesEmpty.style.display = 'none';
        favoritesList.style.display = 'block';

        // 生成收藏列表项
        favoriteSongs.forEach(song => {
            // 生成随机颜色渐变
            const colors = [
                'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)',
                'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)',
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <div class="favorite-item-image" style="background: ${randomColor}">${song.title.charAt(0)}</div>
                <div class="favorite-item-info">
                    <div class="favorite-item-title">${song.title}</div>
                    <div class="favorite-item-artist">${song.artist}</div>
                </div>
                <div class="favorite-item-actions">
                    <button class="favorite-action-button play-favorite" data-id="${song.id}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="favorite-action-button remove-favorite" data-id="${song.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // 播放收藏歌曲
            const playBtn = item.querySelector('.play-favorite');
            playBtn.addEventListener('click', () => {
                playSong(song);
            });

            // 移除收藏
            const removeBtn = item.querySelector('.remove-favorite');
            removeBtn.addEventListener('click', () => {
                // 更新本地存储
                const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
                delete favorites[song.id];
                localStorage.setItem('favorites', JSON.stringify(favorites));

                // 更新UI
                item.style.opacity = '0';
                item.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    item.remove();
                    // 检查是否为空
                    if (favoritesList.children.length === 0) {
                        favoritesList.style.display = 'none';
                        favoritesEmpty.style.display = 'flex';
                    }
                }, 300);

                // 更新主页面收藏按钮状态
                const mainFavoriteBtn = document.querySelector(`.favorite-button[data-id="${song.id}"]`);
                if (mainFavoriteBtn) {
                    mainFavoriteBtn.classList.remove('favorited');
                    mainFavoriteBtn.querySelector('i').style.color = 'transparent';
                    mainFavoriteBtn.querySelector('i').style.webkitTextStroke = '1.5px var(--primary-color)';
                }

                showToast('已从收藏中移除');
            });

            // 点击项目跳转到歌曲目录
            item.addEventListener('click', (e) => {
                // 防止点击按钮时触发
                if (!e.target.closest('.favorite-action-button')) {
                    window.location.href = `${song.folderName}/`;
                }
            });

            favoritesList.appendChild(item);
        });
    } else {
        favoritesList.style.display = 'none';
        favoritesEmpty.style.display = 'flex';
    }
}

// 初始化歌单功能
function initPlaylist() {
    // 初始化本地存储中的歌单
    if (!localStorage.getItem('playlists')) {
        localStorage.setItem('playlists', JSON.stringify([]));
    }

    // 歌单按钮点击事件
    const playlistButton = document.getElementById('playlistButton');
    playlistButton.addEventListener('click', () => {
        updatePlaylistList();
        document.getElementById('playlistModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    document.getElementById('createNewPlaylist').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.remove('active');
        document.getElementById('createPlaylistModal').classList.add('active');
    });

    // 关闭歌单弹窗
    document.getElementById('closePlaylistModal').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.remove('active');
        document.body.style.overflow = '';
    });

    // 点击外部区域关闭弹窗
    document.getElementById('playlistModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('playlistModal')) {
            document.getElementById('playlistModal').classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // 创建歌单按钮
    document.getElementById('createPlaylistBtn').addEventListener('click', () => {
        document.getElementById('playlistModal').classList.remove('active');
        document.getElementById('createPlaylistModal').classList.add('active');
    });

    // 从添加歌曲弹窗创建歌单按钮
    document.getElementById('createPlaylistFromAddBtn').addEventListener('click', () => {
        document.getElementById('addToPlaylistModal').classList.remove('active');
        document.getElementById('createPlaylistModal').classList.add('active');
    });

    // 关闭创建歌单弹窗
    document.getElementById('closeCreatePlaylistModal').addEventListener('click', () => {
        document.getElementById('createPlaylistModal').classList.remove('active');
        document.getElementById('playlistModal').classList.add('active');
    });

    // 取消创建歌单
    document.getElementById('cancelCreatePlaylist').addEventListener('click', () => {
        document.getElementById('createPlaylistModal').classList.remove('active');
        document.getElementById('playlistModal').classList.add('active');
    });

    // 提交创建歌单
    document.getElementById('submitCreatePlaylist').addEventListener('click', createPlaylist);

    // 关闭歌单歌曲弹窗
    document.getElementById('closePlaylistSongsModal').addEventListener('click', () => {
        document.getElementById('playlistSongsModal').classList.remove('active');
        document.body.style.overflow = '';
    });

    // 点击外部区域关闭歌单歌曲弹窗
    document.getElementById('playlistSongsModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('playlistSongsModal')) {
            document.getElementById('playlistSongsModal').classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // 关闭添加到歌单弹窗
    document.getElementById('closeAddToPlaylistModal').addEventListener('click', () => {
        document.getElementById('addToPlaylistModal').classList.remove('active');
        document.body.style.overflow = '';
    });

    // 点击外部区域关闭添加到歌单弹窗
    document.getElementById('addToPlaylistModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('addToPlaylistModal')) {
            document.getElementById('addToPlaylistModal').classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // 播放顺序选择器
    document.querySelectorAll('.play-order-button').forEach(button => {
        button.addEventListener('click', function () {
            document.querySelectorAll('.play-order-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            const playlistId = document.getElementById('playlistSongsList').dataset.playlistId;
            const order = this.dataset.order;
            updatePlaylistSongsList(playlistId, order);
        });
    });
}

// 更新歌单列表
function updatePlaylistList() {
    const playlistList = document.getElementById('playlistList');
    const playlistEmpty = document.getElementById('playlistEmpty');
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];

    playlistList.innerHTML = '';

    if (playlists.length > 0) {
        playlistEmpty.style.display = 'none';
        playlistList.style.display = 'block';

        playlists.forEach((playlist, index) => {
            // 生成随机颜色渐变
            const colors = [
                'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)',
                'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)',
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.id = playlist.id;
            item.innerHTML = `
                <div class="playlist-item-image" style="background: ${randomColor}">${playlist.name.charAt(0)}</div>
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${playlist.name}</div>
                    <div class="playlist-item-count">${playlist.songs.length} 首歌曲</div>
                </div>
                <div class="playlist-item-actions">
                    <button class="playlist-action-button view-playlist" data-id="${playlist.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="playlist-action-button delete-playlist" data-id="${playlist.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // 查看歌单
            const viewBtn = item.querySelector('.view-playlist');
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPlaylistSongsModal(playlist.id);
            });

            // 删除歌单
            const deleteBtn = item.querySelector('.delete-playlist');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePlaylist(playlist.id);
            });

            // 点击项目查看歌单
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-action-button')) {
                    openPlaylistSongsModal(playlist.id);
                }
            });

            playlistList.appendChild(item);
        });
    } else {
        playlistList.style.display = 'none';
        playlistEmpty.style.display = 'flex';
    }
}

// 创建歌单
function createPlaylist() {
    const name = document.getElementById('playlistName').value.trim();
    const desc = document.getElementById('playlistDesc').value.trim();

    if (!name) {
        showToast('请输入歌单名称');
        return;
    }

    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const newPlaylist = {
        id: Date.now().toString(),
        name: name,
        description: desc,
        songs: [],
        createdAt: new Date().toISOString()
    };

    playlists.push(newPlaylist);
    localStorage.setItem('playlists', JSON.stringify(playlists));

    document.getElementById('playlistName').value = '';
    document.getElementById('playlistDesc').value = '';

    document.getElementById('createPlaylistModal').classList.remove('active');
    updatePlaylistList();
    document.getElementById('playlistModal').classList.add('active');

    showToast('歌单创建成功');
}

// 删除歌单
function deletePlaylist(playlistId) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const updatedPlaylists = playlists.filter(playlist => playlist.id !== playlistId);
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));

    updatePlaylistList();
    showToast('歌单已删除');
}

// 打开歌单歌曲弹窗
async function openPlaylistSongsModal(playlistId) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const playlist = playlists.find(p => p.id === playlistId);

    if (!playlist) {
        showToast('歌单不存在');
        return;
    }

    document.getElementById('playlistSongsTitle').textContent = playlist.name;
    document.getElementById('playlistModal').classList.remove('active');
    document.getElementById('playlistSongsModal').classList.add('active');

    updatePlaylistSongsList(playlistId, 'list');
}

// 更新歌单歌曲列表
async function updatePlaylistSongsList(playlistId, order = 'list') {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const playlist = playlists.find(p => p.id === playlistId);
    const playlistSongsList = document.getElementById('playlistSongsList');
    const playlistSongsEmpty = document.getElementById('playlistSongsEmpty');
    const allSongs = await loadSongs();

    playlistSongsList.innerHTML = '';
    playlistSongsList.dataset.playlistId = playlistId;

    if (playlist.songs.length > 0) {
        playlistSongsEmpty.style.display = 'none';
        playlistSongsList.style.display = 'block';

        // 根据播放顺序排序歌曲
        let songsToShow = playlist.songs.map(songId => {
            return allSongs.find(song => song.id.toString() === songId);
        }).filter(Boolean);

        if (order === 'random') {
            songsToShow = shuffleArray(songsToShow);
        }

        // 生成歌曲列表
        songsToShow.forEach(song => {
            if (!song) return;

            // 生成随机颜色渐变
            const colors = [
                'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)',
                'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)',
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const item = document.createElement('div');
            item.className = 'playlist-song-item';
            item.dataset.id = song.id;
            item.innerHTML = `

${song.title.charAt(0)}
${song.title}
${song.artist}
 
`;
            // 播放歌曲
            const playBtn = item.querySelector('.play-song');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playSong(song);
            });

            // 从歌单中移除
            const removeBtn = item.querySelector('.remove-from-playlist');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSongFromPlaylist(playlistId, song.id);
            });

            // 点击项目播放歌曲
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-song-action-button')) {
                    playSong(song);
                }
            });

            playlistSongsList.appendChild(item);
        });
    } else {
        playlistSongsList.style.display = 'none';
        playlistSongsEmpty.style.display = 'flex';
    }
}

// 从歌单中移除歌曲
function removeSongFromPlaylist(playlistId, songId) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
        showToast('歌单不存在');
        return;
    }

    playlists[playlistIndex].songs = playlists[playlistIndex].songs.filter(id => id !== songId.toString());
    localStorage.setItem('playlists', JSON.stringify(playlists));

    updatePlaylistSongsList(playlistId, document.querySelector('.play-order-button.active').dataset.order);
    showToast('已从歌单中移除');
}

// 打开添加到歌单弹窗
function openAddToPlaylistModal(song) {
    updateAddToPlaylistList(song);
    document.getElementById('addToPlaylistModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 更新可添加到的歌单列表
function updateAddToPlaylistList(song) {
    const addToPlaylistList = document.getElementById('addToPlaylistList');
    const addToPlaylistEmpty = document.getElementById('addToPlaylistEmpty');
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];

    addToPlaylistList.innerHTML = '';

    if (playlists.length > 0) {
        addToPlaylistEmpty.style.display = 'none';
        addToPlaylistList.style.display = 'block';

        playlists.forEach(playlist => {
            // 检查歌曲是否已在歌单中
            const isInPlaylist = playlist.songs.includes(song.id.toString());

            // 生成随机颜色渐变
            const colors = [
                'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)',
                'linear-gradient(135deg, #ffc3a0 0%, #ffafbd 100%)',
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
                'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.id = playlist.id;
            item.innerHTML = `

${playlist.name.charAt(0)}
${playlist.name}
${playlist.songs.length} 首歌曲

`;
            // 添加/移除歌曲
            const actionBtn = item.querySelector('.playlist-action-button');
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                if (isInPlaylist) {
                    removeSongFromPlaylist(playlist.id, song.id);
                    actionBtn.innerHTML = '';
                    actionBtn.classList.remove('remove-from-playlist');
                    actionBtn.classList.add('add-to-playlist');
                } else {
                    addSongToPlaylist(playlist.id, song.id);
                    actionBtn.innerHTML = '';
                    actionBtn.classList.remove('add-to-playlist');
                    actionBtn.classList.add('remove-from-playlist');
                }
            });

            // 点击项目查看歌单
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.playlist-action-button')) {
                    openPlaylistSongsModal(playlist.id);
                }
            });

            addToPlaylistList.appendChild(item);
        });
    } else {
        addToPlaylistList.style.display = 'none';
        addToPlaylistEmpty.style.display = 'flex';
    }
}

// 添加歌曲到歌单
function addSongToPlaylist(playlistId, songId) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || [];
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
        showToast('歌单不存在');
        return;
    }

    // 检查歌曲是否已在歌单中
    if (!playlists[playlistIndex].songs.includes(songId.toString())) {
        playlists[playlistIndex].songs.push(songId.toString());
        localStorage.setItem('playlists', JSON.stringify(playlists));
        showToast('已添加到歌单');
    } else {
        showToast('歌曲已在歌单中');
    }
}

// 随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

document.addEventListener('DOMContentLoaded', async function () {
    // 初始化主题
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeIcon = document.getElementById('themeToggle').querySelector('i');
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // 初始化播放器控制
    initPlayerControls();

    // 初始化收藏弹窗功能
    initFavoritesModal();

    // 初始化歌单功能
    initPlaylist();

    // 加载并显示第一页歌曲
    await loadSongs(1);
    displaySongs(allSongs);

    // 搜索功能
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        if (query) {
            // 如果是搜索，重置分页
            currentPage = 1;
            hasMoreSongs = true;
            const filteredSongs = searchSongs(allSongs, query);
            displaySongs(filteredSongs);
        } else {
            // 如果搜索框为空，重新加载第一页
            currentPage = 1;
            hasMoreSongs = true;
            loadSongs(1).then(() => displaySongs(allSongs));
        }
    });

    // 设置滚动事件监听器
    window.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    // 设置收藏弹窗的空状态初始显示
    const favoritesEmpty = document.getElementById('favoritesEmpty');
    favoritesEmpty.style.display = 'flex';

    // 设置歌单弹窗的空状态初始显示
    const playlistEmpty = document.getElementById('playlistEmpty');
    playlistEmpty.style.display = 'flex';

    // 设置收藏按钮的初始状态
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    document.querySelectorAll('.favorite-button').forEach(button => {
        const songId = button.getAttribute('data-id');
        if (favorites[songId]) {
            button.classList.add('favorited');
            button.querySelector('i').style.color = 'var(--primary-color)';
            button.querySelector('i').style.webkitTextStroke = '0';
        }
    });
});