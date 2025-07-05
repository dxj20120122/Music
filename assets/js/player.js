
document.addEventListener('DOMContentLoaded', function () {
    // 获取DOM元素
    const audio = document.getElementById('audio');
    const btnPlay = document.getElementById('btn-play');
    const playIcon = document.getElementById('play-icon');
    const btnForward = document.getElementById('btn-forward');
    const btnBackward = document.getElementById('btn-backward');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    const volumeBar = document.getElementById('volume-bar');
    const volumeProgress = document.getElementById('volume-progress');
    const volumeIcon = document.getElementById('volume-icon');
    const coverContainer = document.getElementById('cover-container');
    const coverImage = document.getElementById('cover-image');
    const lyricsContent = document.getElementById('lyrics-content');
    const loading = document.getElementById('loading');
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const albumArtView = document.querySelector('.album-art');
    const lyricsView = document.querySelector('.lyrics-container');
    const viewIndicator = document.querySelector('.view-indicator');
    const indicatorDots = document.querySelectorAll('.indicator-dot');

    // 当前歌曲索引
    let currentSongIndex = 0;
    // 歌曲列表
    let songs = [];
    // 歌词数据
    let lyrics = [];
    let lyricTimes = [];
    // 是否正在拖动进度条
    let isDraggingProgress = false;
    // 是否正在拖动音量条
    let isDraggingVolume = false;
    // 保存静音前的音量
    let lastVolume = 0.7;
    // 触摸事件相关变量
    let lastTouchTime = 0;
    let lastTouchY = 0;
    // 自动滚动控制变量
    let isUserScrolling = false;
    let scrollResumeTimer = null;
    let lastScrollPosition = 0;
    // 滑动切换相关变量
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let currentView = 'album'; // 'album' 或 'lyrics'
    let isMobileView = window.innerWidth <= 900;

    // 初始化播放器
    function initPlayer() {
        fetch('songs.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                songs = data;
                if (songs.length > 0) {
                    loadSong(currentSongIndex);
                } else {
                    showError("没有找到歌曲数据");
                }
            })
            .catch(error => {
                console.error('加载歌曲数据失败:', error);
                showError("加载歌曲数据失败");
            });

        // 加载保存的音量设置
        loadVolume();

        // 初始化视图切换指示器
        setupViewSwitching();

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);
    }

    // 设置视图切换功能
    function setupViewSwitching() {
        if (!isMobileView) {
            viewIndicator.style.display = 'none';
            return;
        }

        // 点击指示器切换视图
        indicatorDots.forEach(dot => {
            dot.addEventListener('click', function () {
                const targetView = this.dataset.view;
                if (targetView !== currentView) {
                    switchView(targetView);
                }
            });
        });

        // 触摸事件处理
        const container = document.querySelector('.glass-container');

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // 处理触摸开始
    function handleTouchStart(e) {
        if (!isMobileView) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }

    // 处理触摸移动
    function handleTouchMove(e) {
        if (!isMobileView) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // 确定是否是水平滑动
        if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY)) {
            isSwiping = true;
            e.preventDefault(); // 防止垂直滚动
        }

        if (isSwiping) {
            // 根据当前视图限制滑动方向
            if ((currentView === 'album' && deltaX < 0) ||
                (currentView === 'lyrics' && deltaX > 0)) {

                // 计算滑动比例 (0-1)
                let ratio = Math.abs(deltaX) / window.innerWidth;
                ratio = Math.min(ratio, 1);

                // 应用滑动效果
                if (currentView === 'album') {
                    albumArtView.style.transform = `translateX(${-ratio * 100}%)`;
                    lyricsView.style.transform = `translateX(${(1 - ratio) * 100}%)`;
                } else {
                    albumArtView.style.transform = `translateX(${(ratio - 1) * 100}%)`;
                    lyricsView.style.transform = `translateX(${ratio * 100}%)`;
                }
            }
        }
    }

    // 处理触摸结束
    function handleTouchEnd(e) {
        if (!isMobileView || !isSwiping) return;

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        const ratio = Math.abs(deltaX) / window.innerWidth;

        // 检查是否超过阈值 (20%)
        if (ratio > 0.2) {
            // 滑动足够距离，切换视图
            if (deltaX < 0 && currentView === 'album') {
                switchView('lyrics');
            } else if (deltaX > 0 && currentView === 'lyrics') {
                switchView('album');
            } else {
                // 未达到切换条件，恢复原状
                resetView();
            }
        } else {
            // 滑动距离不足，恢复原状
            resetView();
        }

        isSwiping = false;
    }

    // 切换视图
    function switchView(targetView) {
        if (targetView === currentView) return;

        currentView = targetView;

        if (targetView === 'lyrics') {
            albumArtView.style.transform = 'translateX(-100%)';
            lyricsView.style.transform = 'translateX(-100%)';
            lyricsView.classList.add('active');
        } else {
            albumArtView.style.transform = 'translateX(0)';
            lyricsView.style.transform = 'translateX(0)';
            lyricsView.classList.remove('active');
        }

        // 更新指示器
        updateIndicator();
    }

    // 重置视图位置
    function resetView() {
        if (currentView === 'album') {
            albumArtView.style.transform = 'translateX(0)';
            lyricsView.style.transform = 'translateX(0)';
        } else {
            albumArtView.style.transform = 'translateX(-100%)';
            lyricsView.style.transform = 'translateX(-100%)';
        }
    }

    // 更新指示器状态
    function updateIndicator() {
        indicatorDots.forEach(dot => {
            if (dot.dataset.view === currentView) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // 处理窗口大小变化
    function handleResize() {
        const newIsMobileView = window.innerWidth <= 900;

        if (newIsMobileView !== isMobileView) {
            isMobileView = newIsMobileView;

            if (isMobileView) {
                // 切换到移动视图
                viewIndicator.style.display = 'flex';
                lyricsView.style.left = '100%';
                lyricsView.style.transform = 'translateX(0)';
                lyricsView.classList.remove('active');
                currentView = 'album';
                updateIndicator();
            } else {
                // 切换到桌面视图
                viewIndicator.style.display = 'none';
                lyricsView.style.left = 'auto';
                lyricsView.style.transform = 'none';
                lyricsView.classList.remove('active');
                albumArtView.style.transform = 'none';
            }
        }
    }

    // 加载歌曲
    function loadSong(index) {
        if (index < 0 || index >= songs.length) return;

        loading.style.display = 'flex';
        currentSongIndex = index;
        const song = songs[index];

        // 更新歌曲信息
        songTitle.textContent = song.title || '未知歌曲';
        songArtist.textContent = song.artist || '未知艺术家';
        coverImage.src = song.cover || 'https://via.placeholder.com/300';
        audio.src = song.audio || '';

        // 重置播放器状态
        progress.style.width = '0%';
        currentTimeEl.textContent = '00:00';
        totalTimeEl.textContent = '00:00';
        playIcon.classList.replace('fa-pause', 'fa-play');
        coverContainer.classList.remove('playing');

        // 加载歌词
        lyrics = [];
        lyricTimes = [];
        lyricsContent.innerHTML = '<div class="loading-message">歌词加载中...</div>';

        if (song.lyrics) {
            fetch(song.lyrics)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('歌词加载失败');
                    }
                    return response.text();
                })
                .then(text => {
                    parseLyrics(text);
                    loading.style.display = 'none';
                })
                .catch(error => {
                    console.error('加载歌词失败:', error);
                    lyricsContent.innerHTML = '<div class="lyrics-line">歌词加载失败</div>';
                    loading.style.display = 'none';
                });
        } else {
            lyricsContent.innerHTML = '<div class="lyrics-line">暂无歌词</div>';
            loading.style.display = 'none';
        }

        // 预加载下一首歌的封面
        if (songs.length > 1) {
            const nextIndex = (index + 1) % songs.length;
            const nextSong = songs[nextIndex];
            if (nextSong.cover) {
                const img = new Image();
                img.src = nextSong.cover;
            }
        }
    }

    // 解析LRC歌词
    function parseLyrics(lrcText) {
        const lines = lrcText.split('\n');
        lyricsContent.innerHTML = '';
        lyrics = [];
        lyricTimes = [];

        lines.forEach(line => {
            try {
                // 跳过空行和注释
                if (!line.trim() || line.startsWith('//')) return;

                // 匹配时间标签 [mm:ss.xx] 或 [mm:ss]
                const timeMatches = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]/g);
                if (!timeMatches) return;

                // 获取歌词文本
                const text = line.replace(/\[.*?\]/g, '').trim();
                if (!text) return;

                timeMatches.forEach(timeTag => {
                    const timeMatch = timeTag.match(/\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]/);
                    if (timeMatch) {
                        const minutes = parseInt(timeMatch[1]);
                        const seconds = parseInt(timeMatch[2]);
                        const hundredths = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
                        const time = minutes * 60 + seconds + hundredths / 100;

                        lyrics.push({ time, text });
                    }
                });
            } catch (error) {
                console.error('解析歌词行失败:', line, error);
            }
        });

        // 按时间排序歌词
        lyrics.sort((a, b) => a.time - b.time);

        // 创建歌词DOM元素
        lyrics.forEach((lyric, index) => {
            const lyricLine = document.createElement('div');
            lyricLine.className = 'lyrics-line';
            lyricLine.dataset.time = lyric.time;
            lyricLine.dataset.index = index;
            lyricLine.textContent = lyric.text;
            lyricsContent.appendChild(lyricLine);

            // 存储时间点用于快速查找
            lyricTimes.push(lyric.time);
        });

        // 如果没有解析到歌词，显示提示
        if (lyrics.length === 0) {
            lyricsContent.innerHTML = '<div class="lyrics-line">暂无有效歌词</div>';
        }
    }

    // 更新当前高亮歌词
    function updateLyrics(currentTime) {
        if (!lyricTimes.length || isUserScrolling) return;

        // 找到当前时间对应的歌词
        let activeIndex = -1;
        for (let i = 0; i < lyricTimes.length; i++) {
            if (currentTime >= lyricTimes[i]) {
                activeIndex = i;
            } else {
                break;
            }
        }

        // 更新歌词高亮状态
        const lyricLines = document.querySelectorAll('.lyrics-line');
        lyricLines.forEach((line, index) => {
            if (index === activeIndex) {
                line.classList.add('active');

                // 滚动到当前歌词
                const container = lyricsContent;
                const lineTop = line.offsetTop;
                const lineHeight = line.offsetHeight;
                const containerHeight = container.offsetHeight;

                // 只有当用户没有手动滚动时才自动滚动
                if (!isUserScrolling) {
                    container.scrollTo({
                        top: lineTop - containerHeight / 2 + lineHeight,
                        behavior: 'smooth'
                    });
                }
            } else {
                line.classList.remove('active');
            }
        });
    }

    // 处理用户滚动歌词
    function handleLyricsScroll() {
        // 检测用户是否在手动滚动
        const currentScrollPos = lyricsContent.scrollTop;
        if (Math.abs(currentScrollPos - lastScrollPosition) > 5) {
            isUserScrolling = true;

            // 清除之前的定时器
            if (scrollResumeTimer) {
                clearTimeout(scrollResumeTimer);
            }

            // 设置3秒后恢复自动滚动
            scrollResumeTimer = setTimeout(() => {
                isUserScrolling = false;
                // 滚动到当前播放的歌词
                const activeLine = document.querySelector('.lyrics-line.active');
                if (activeLine) {
                    const container = lyricsContent;
                    const lineTop = activeLine.offsetTop;
                    const lineHeight = activeLine.offsetHeight;
                    const containerHeight = container.offsetHeight;

                    container.scrollTo({
                        top: lineTop - containerHeight / 2 + lineHeight,
                        behavior: 'smooth'
                    });
                }
            }, 3000);
        }
        lastScrollPosition = currentScrollPos;
    }

    // 显示错误信息
    function showError(message) {
        loading.style.display = 'none';
        songTitle.textContent = message;
        lyricsContent.innerHTML = `<div class="lyrics-line">${message}</div>`;
    }

    // 播放/暂停控制
    function togglePlay() {
        if (audio.paused) {
            audio.play()
                .then(() => {
                    playIcon.classList.replace('fa-play', 'fa-pause');
                    coverContainer.classList.add('playing');
                    addToRecentlyPlayed(songs[currentSongIndex]);
                })
                .catch(error => {
                    console.error('播放失败:', error);
                    showToast('播放失败，请检查音频文件');
                });
        } else {
            audio.pause();
            playIcon.classList.replace('fa-pause', 'fa-play');
            coverContainer.classList.remove('playing');
        }
    }

    // 添加到最近播放列表
    function addToRecentlyPlayed(song) {
        try {
            let recentSongs = JSON.parse(localStorage.getItem('recentSongs')) || [];

            // 移除已存在的相同歌曲
            recentSongs = recentSongs.filter(s => s.audio !== song.audio);

            // 添加到开头
            recentSongs.unshift({
                title: song.title,
                artist: song.artist,
                cover: song.cover,
                audio: song.audio,
                timestamp: new Date().getTime()
            });

            // 只保留最近的10首
            recentSongs = recentSongs.slice(0, 10);

            localStorage.setItem('recentSongs', JSON.stringify(recentSongs));
        } catch (error) {
            console.error('保存最近播放失败:', error);
        }
    }

    // 显示提示信息
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '1000';
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        document.body.appendChild(toast);

        // 触发动画
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // 3秒后消失
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 保存音量设置
    function saveVolume() {
        localStorage.setItem('playerVolume', audio.volume);
    }

    // 加载音量设置
    function loadVolume() {
        try {
            const savedVolume = parseFloat(localStorage.getItem('playerVolume'));
            if (!isNaN(savedVolume)) {
                audio.volume = savedVolume;
                volumeProgress.style.width = `${savedVolume * 100}%`;
                updateVolumeIcon(savedVolume);
                lastVolume = savedVolume;
            }
        } catch (error) {
            console.error('加载音量设置失败:', error);
        }
    }

    // 快进15秒
    btnForward.addEventListener('click', () => {
        if (isNaN(audio.duration)) return;
        audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);
        showToast('前进15秒');
    });

    // 后退15秒
    btnBackward.addEventListener('click', () => {
        audio.currentTime = Math.max(audio.currentTime - 15, 0);
        showToast('后退15秒');
    });

    // 进度条控制 - 鼠标/触摸事件
    progressBar.addEventListener('mousedown', startDragProgress);
    progressBar.addEventListener('touchstart', function (e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        startDragProgress(e);
    }, { passive: false });

    function startDragProgress(e) {
        if (isNaN(audio.duration)) return;

        isDraggingProgress = true;
        updateProgress(e);

        document.addEventListener('mousemove', updateProgress);
        document.addEventListener('touchmove', updateProgress, { passive: false });
        document.addEventListener('mouseup', endDragProgress);
        document.addEventListener('touchend', endDragProgress, { passive: true });
    }

    function updateProgress(e) {
        if (!isDraggingProgress || isNaN(audio.duration)) return;

        const rect = progressBar.getBoundingClientRect();
        let clientX;

        // 处理触摸事件和鼠标事件
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            if (e.cancelable) {
                e.preventDefault(); // 防止页面滚动
            }
        } else {
            clientX = e.clientX;
        }

        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        progress.style.width = `${percent * 100}%`;
        audio.currentTime = percent * audio.duration;
        currentTimeEl.textContent = formatTime(audio.currentTime);

        // 更新歌词显示
        updateLyrics(audio.currentTime);
    }

    function endDragProgress() {
        isDraggingProgress = false;
        document.removeEventListener('mousemove', updateProgress);
        document.removeEventListener('touchmove', updateProgress);
        document.removeEventListener('mouseup', endDragProgress);
        document.removeEventListener('touchend', endDragProgress);
    }

    // 点击进度条
    progressBar.addEventListener('click', (e) => {
        if (isNaN(audio.duration)) return;
        const rect = progressBar.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const percent = (clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    });

    // 音量控制 - 鼠标/触摸事件
    volumeBar.addEventListener('mousedown', startDragVolume);
    volumeBar.addEventListener('touchstart', startDragVolume, { passive: false });

    function startDragVolume(e) {
        if (e.cancelable) {
            e.preventDefault();
        }
        isDraggingVolume = true;
        updateVolume(e);

        document.addEventListener('mousemove', updateVolume);
        document.addEventListener('touchmove', updateVolume, { passive: false });
        document.addEventListener('mouseup', endDragVolume);
        document.addEventListener('touchend', endDragVolume, { passive: true });
    }

    function updateVolume(e) {
        if (!isDraggingVolume) return;

        const rect = volumeBar.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        audio.volume = percent;
        volumeProgress.style.width = `${percent * 100}%`;

        // 更新音量图标
        updateVolumeIcon(percent);

        // 如果之前是静音状态，取消静音
        if (audio.muted && percent > 0) {
            audio.muted = false;
            volumeIcon.classList.replace('fa-volume-xmark', 'fa-volume-high');
        }

        // 保存音量
        lastVolume = percent;
        saveVolume();
    }

    function endDragVolume() {
        isDraggingVolume = false;
        document.removeEventListener('mousemove', updateVolume);
        document.removeEventListener('touchmove', updateVolume);
        document.removeEventListener('mouseup', endDragVolume);
        document.removeEventListener('touchend', endDragVolume);
    }

    // 点击音量条
    volumeBar.addEventListener('click', (e) => {
        const rect = volumeBar.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const percent = (clientX - rect.left) / rect.width;
        audio.volume = percent;
        volumeProgress.style.width = `${percent * 100}%`;
        updateVolumeIcon(percent);
        lastVolume = percent;
        saveVolume();

        // 如果之前是静音状态，取消静音
        if (audio.muted && percent > 0) {
            audio.muted = false;
            volumeIcon.classList.replace('fa-volume-xmark', 'fa-volume-high');
        }
    });

    // 更新音量图标
    function updateVolumeIcon(volume) {
        if (volume <= 0 || audio.muted) {
            volumeIcon.className = 'fas fa-volume-xmark';
        } else if (volume < 0.3) {
            volumeIcon.className = 'fas fa-volume-low';
        } else if (volume < 0.7) {
            volumeIcon.className = 'fas fa-volume-off';
        } else {
            volumeIcon.className = 'fas fa-volume-high';
        }
    }

    // 音量图标点击 - 静音/取消静音
    volumeIcon.addEventListener('click', (e) => {
        e.stopPropagation();

        if (audio.muted) {
            audio.muted = false;
            audio.volume = lastVolume;
            volumeProgress.style.width = `${lastVolume * 100}%`;
            updateVolumeIcon(lastVolume);
        } else {
            audio.muted = true;
            volumeIcon.className = 'fas fa-volume-xmark';
        }
        saveVolume();
    });

    // 更新进度条
    audio.addEventListener('timeupdate', () => {
        if (!isDraggingProgress && !isNaN(audio.duration)) {
            const currentTime = audio.currentTime;
            const duration = audio.duration;
            const percent = (currentTime / duration) * 100;
            progress.style.width = `${percent}%`;

            // 更新时间显示
            currentTimeEl.textContent = formatTime(currentTime);

            // 更新歌词
            updateLyrics(currentTime);
        }
    });

    // 音频加载完成
    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    // 音频播放结束
    audio.addEventListener('ended', () => {
        playIcon.classList.replace('fa-pause', 'fa-play');
        coverContainer.classList.remove('playing');

        // 自动播放下一首
        if (songs.length > 1) {
            currentSongIndex = (currentSongIndex + 1) % songs.length;
            loadSong(currentSongIndex);
            setTimeout(() => {
                audio.play().catch(error => {
                    console.error('自动播放失败:', error);
                });
            }, 500);
        }
    });

    // 音频错误处理
    audio.addEventListener('error', () => {
        showError('音频加载失败');
        loading.style.display = 'none';
        playIcon.classList.replace('fa-pause', 'fa-play');
        coverContainer.classList.remove('playing');
    });

    // 封面图片错误处理
    coverImage.addEventListener('error', () => {
        coverImage.src = 'https://via.placeholder.com/300';
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowRight') {
            btnForward.click();
        } else if (e.code === 'ArrowLeft') {
            btnBackward.click();
        } else if (e.code === 'ArrowUp') {
            // 增加音量
            audio.volume = Math.min(audio.volume + 0.1, 1);
            volumeProgress.style.width = `${audio.volume * 100}%`;
            updateVolumeIcon(audio.volume);
            lastVolume = audio.volume;
            if (audio.muted) {
                audio.muted = false;
            }
            saveVolume();
        } else if (e.code === 'ArrowDown') {
            // 减小音量
            audio.volume = Math.max(audio.volume - 0.1, 0);
            volumeProgress.style.width = `${audio.volume * 100}%`;
            updateVolumeIcon(audio.volume);
            lastVolume = audio.volume;
            saveVolume();
        } else if (e.code === 'KeyM') {
            // 静音/取消静音
            audio.muted = !audio.muted;
            if (audio.muted) {
                volumeIcon.className = 'fas fa-volume-xmark';
            } else {
                updateVolumeIcon(audio.volume);
            }
        }
    });

    // 播放按钮点击
    btnPlay.addEventListener('click', togglePlay);

    // 双击封面暂停/播放
    coverContainer.addEventListener('dblclick', togglePlay);

    // 触摸设备支持
    coverContainer.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const currentY = e.changedTouches[0].clientY;

        // 检查Y轴位移是否小于10px，避免滑动误触发
        if (currentTime - lastTouchTime < 300 && Math.abs(currentY - lastTouchY) < 10) {
            togglePlay();
            if (e.cancelable) {
                e.preventDefault();
            }
        }

        lastTouchTime = currentTime;
        lastTouchY = currentY;
    }, { passive: false });

    // 防止双击缩放
    document.addEventListener('dblclick', (e) => {
        if (e.cancelable) {
            e.preventDefault();
        }
    }, { passive: false });

    // 格式化时间显示 (mm:ss)
    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 初始化音量
    audio.addEventListener('canplay', function () {
        if (isNaN(audio.volume)) {
            audio.volume = 0.7;
            volumeProgress.style.width = '70%';
            updateVolumeIcon(0.7);
        }
    }, { once: true });

    // 检测网络状态
    window.addEventListener('online', () => {
        showToast('网络已连接');
        // 尝试重新加载数据
        if (songs.length === 0) {
            initPlayer();
        }
    });

    window.addEventListener('offline', () => {
        showToast('网络已断开，部分功能可能受限');
    });

    // 添加到主屏幕提示 (仅iOS)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showToast('点击分享按钮可添加到主屏幕');
    });

    // 点击歌词跳转到对应时间
    lyricsContent.addEventListener('click', (e) => {
        const lyricLine = e.target.closest('.lyrics-line');
        if (lyricLine && lyricLine.dataset.time) {
            const time = parseFloat(lyricLine.dataset.time);
            if (!isNaN(time)) {
                audio.currentTime = time;
                if (audio.paused) {
                    audio.play().catch(error => {
                        console.error('播放失败:', error);
                    });
                }
                // 更新歌词高亮
                updateLyrics(time);
            }
        }
    });

    // 监听歌词滚动事件
    lyricsContent.addEventListener('scroll', handleLyricsScroll);

    // 初始化播放器
    initPlayer();
});