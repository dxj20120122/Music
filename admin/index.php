<?php
// 错误报告开启，便于调试
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 安全过滤文件名函数 - 保留空格但移除危险字符
function sanitizeFilename($name) {
    // 允许字母、数字、空格、中文、常见符号，移除危险字符
    return preg_replace('/[^\p{L}\p{N}\s_\-\.\'\()]/u', '', $name);
}

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 获取表单数据
    $songName = isset($_POST['song_name']) ? trim($_POST['song_name']) : '';
    $artist = isset($_POST['artist']) ? trim($_POST['artist']) : '';
    
    // 验证必填字段
    if (empty($songName) || empty($artist)) {
        die('歌曲名和歌手不能为空');
    }
    
    // 安全过滤（保留空格）
    $safeSongName = sanitizeFilename($songName);
    $safeArtist = sanitizeFilename($artist);
    
    // 验证文件上传
    $coverFile = $_FILES['cover'] ?? null;
    $audioFile = $_FILES['audio'] ?? null;
    $lyricsFile = $_FILES['lyrics'] ?? null;
    
    if (empty($coverFile['name']) || empty($audioFile['name']) || empty($lyricsFile['name'])) {
        die('请上传封面、音频和歌词文件');
    }
    
    // 验证文件类型
    $coverExt = strtolower(pathinfo($coverFile['name'], PATHINFO_EXTENSION));
    $audioExt = strtolower(pathinfo($audioFile['name'], PATHINFO_EXTENSION));
    $lyricsExt = strtolower(pathinfo($lyricsFile['name'], PATHINFO_EXTENSION));
    
    $allowedImage = ['jpg', 'png', 'jpeg'];
    if (!in_array($coverExt, $allowedImage)) {
        die('封面文件必须是JPG或PNG格式');
    }
    
    if ($audioExt !== 'mp3') {
        die('音频文件必须是MP3格式');
    }
    
    if ($lyricsExt !== 'lrc') {
        die('歌词文件必须是LRC格式');
    }
    
    try {
        // 创建歌曲文件夹（保留空格）
        $songDir = '../' . $safeSongName;
        
        // 检查文件夹是否已存在
        if (file_exists($songDir)) {
            die("同名歌曲文件夹 '$safeSongName' 已存在");
        }
        
        // 创建文件夹
        if (!mkdir($songDir, 0755, true)) {
            throw new Exception("无法创建文件夹: $songDir");
        }
        
        // 重命名并移动文件（保留空格）
        $newCoverName = "$safeSongName-$safeArtist.$coverExt";
        $newAudioName = "$safeSongName-$safeArtist.$audioExt";
        $newLyricsName = "$safeSongName-$safeArtist.$lyricsExt";
        
        // 移动文件
        $moveCover = move_uploaded_file($coverFile['tmp_name'], "$songDir/$newCoverName");
        $moveAudio = move_uploaded_file($audioFile['tmp_name'], "$songDir/$newAudioName");
        $moveLyrics = move_uploaded_file($lyricsFile['tmp_name'], "$songDir/$newLyricsName");
        
        if (!$moveCover || !$moveAudio || !$moveLyrics) {
            // 清理部分上传的文件
            if ($moveCover) unlink("$songDir/$newCoverName");
            if ($moveAudio) unlink("$songDir/$newAudioName");
            if ($moveLyrics) unlink("$songDir/$newLyricsName");
            rmdir($songDir);
            throw new Exception("文件移动失败，请检查权限");
        }
        
        // 从example文件夹复制文件
        $exampleDir = '../example';
        $exampleFiles = ['index.html', 'songs.json'];
        
        foreach ($exampleFiles as $file) {
            $source = "$exampleDir/$file";
            $dest = "$songDir/$file";
            
            if (!file_exists($source)) {
                throw new Exception("模板文件不存在: $source");
            }
            
            if (!copy($source, $dest)) {
                throw new Exception("无法复制文件: $file");
            }
        }
        
        // 创建歌曲的songs.json内容
        $songData = [
            [
                'id' => mt_rand(1000, 999999), // 更宽的随机范围
                'title' => $songName,  // 使用原始名称（未过滤）
                'artist' => $artist,   // 使用原始名称（未过滤）
                'cover' => $newCoverName,
                'audio' => $newAudioName,
                'lyrics' => $newLyricsName
            ]
        ];
        
        $jsonData = json_encode($songData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($jsonData === false) {
            throw new Exception("JSON编码失败");
        }
        
        if (!file_put_contents("$songDir/songs.json", $jsonData)) {
            throw new Exception("无法写入歌曲的songs.json文件");
        }
        
        // 更新主songs.json
        $mainSongsFile = '../songs.json';
        $mainSongs = [];
        
        if (file_exists($mainSongsFile)) {
            $currentContent = file_get_contents($mainSongsFile);
            if ($currentContent !== false) {
                $mainSongs = json_decode($currentContent, true);
            }
            // 如果解码失败或不是数组，重置为空数组
            if (!is_array($mainSongs)) {
                $mainSongs = [];
            }
        }
        
        // 添加新歌曲到列表（使用文件夹名称）
        $mainSongs[] = $safeSongName;
        
        $mainJsonData = json_encode($mainSongs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if ($mainJsonData === false) {
            throw new Exception("主JSON编码失败");
        }
        
        if (!file_put_contents($mainSongsFile, $mainJsonData)) {
            throw new Exception("无法更新主songs.json文件");
        }
        
        // 成功消息
        $successMsg = "歌曲 '$songName' 添加成功！";
        
    } catch (Exception $e) {
        $errorMsg = '处理过程中出错: ' . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>添加歌曲 - 管理后台</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
            margin-top: 20px;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 30px;
        }
        .upload-area {
            border: 2px dashed #ccc;
            padding: 30px;
            text-align: center;
            margin-bottom: 25px;
            border-radius: 8px;
            transition: all 0.3s ease;
            background-color: #fafafa;
        }
        .upload-area.highlight {
            border-color: #3498db;
            background-color: #e3f2fd;
        }
        .file-info {
            margin-top: 15px;
            font-size: 15px;
            color: #555;
            text-align: left;
            padding: 10px;
            background-color: #f1f1f1;
            border-radius: 5px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus {
            border-color: #3498db;
            outline: none;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        .file-input-group {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .file-input-group button {
            background-color: #3498db;
            color: white;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            transition: background-color 0.3s;
            margin-right: 10px;
        }
        .file-input-group button:hover {
            background-color: #2980b9;
        }
        .file-name {
            font-size: 14px;
            color: #555;
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .submit-btn {
            background-color: #27ae60;
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: block;
            width: 100%;
            transition: background-color 0.3s;
        }
        .submit-btn:hover {
            background-color: #219653;
        }
        .message {
            padding: 15px;
            margin: 20px 0;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
        }
        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info-text {
            text-align: center;
            color: #7f8c8d;
            margin-top: 5px;
            font-size: 14px;
        }
        .required::after {
            content: " *";
            color: #e74c3c;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>添加新歌曲</h1>
        
        <?php if (isset($successMsg)): ?>
            <div class="message success"><?php echo htmlspecialchars($successMsg); ?></div>
        <?php endif; ?>
        
        <?php if (isset($errorMsg)): ?>
            <div class="message error"><?php echo htmlspecialchars($errorMsg); ?></div>
        <?php endif; ?>
        
        <form action="" method="post" enctype="multipart/form-data" id="uploadForm">
            <div class="form-group">
                <label for="song_name" class="required">歌曲名</label>
                <input type="text" id="song_name" name="song_name" required
                       placeholder="例如：我的祖国">
            </div>
            
            <div class="form-group">
                <label for="artist" class="required">歌手</label>
                <input type="text" id="artist" name="artist" required
                       placeholder="例如：群星">
            </div>
            
            <div class="upload-area" id="uploadArea">
                <p>拖拽文件到此处或点击下方按钮选择文件</p>
                <p class="info-text">支持拖放多个文件，系统会自动识别文件类型</p>
                
                <div class="file-info" id="fileInfo">
                    未选择任何文件
                </div>
                
                <input type="file" id="cover" name="cover" accept="image/jpeg,image/png" required style="display: none;">
                <input type="file" id="audio" name="audio" accept="audio/mp3" required style="display: none;">
                <input type="file" id="lyrics" name="lyrics" accept=".lrc" required style="display: none;">
                
                <div class="form-group">
                    <label class="required">封面图片 (.jpg/.png)</label>
                    <div class="file-input-group">
                        <button type="button" id="coverBtn">选择封面</button>
                        <span class="file-name" id="coverName">未选择文件</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="required">音频文件 (.mp3)</label>
                    <div class="file-input-group">
                        <button type="button" id="audioBtn">选择音频</button>
                        <span class="file-name" id="audioName">未选择文件</span>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="required">歌词文件 (.lrc)</label>
                    <div class="file-input-group">
                        <button type="button" id="lyricsBtn">选择歌词</button>
                        <span class="file-name" id="lyricsName">未选择文件</span>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="submit-btn">提交添加</button>
        </form>
    </div>

    <script>
        // 拖放功能
        const uploadArea = document.getElementById('uploadArea');
        const coverInput = document.getElementById('cover');
        const audioInput = document.getElementById('audio');
        const lyricsInput = document.getElementById('lyrics');
        const fileInfo = document.getElementById('fileInfo');
        
        // 文件名显示元素
        const coverName = document.getElementById('coverName');
        const audioName = document.getElementById('audioName');
        const lyricsName = document.getElementById('lyricsName');
        
        // 防止默认拖放行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // 高亮显示拖放区域
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            uploadArea.classList.add('highlight');
        }
        
        function unhighlight() {
            uploadArea.classList.remove('highlight');
        }
        
        // 处理拖放文件
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }
        
        function handleFiles(files) {
            // 分类文件
            const coverFiles = [];
            const audioFiles = [];
            const lyricsFiles = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const ext = file.name.split('.').pop().toLowerCase();
                
                if (['jpg', 'png', 'jpeg'].includes(ext)) {
                    coverFiles.push(file);
                } else if (ext === 'mp3') {
                    audioFiles.push(file);
                } else if (ext === 'lrc') {
                    lyricsFiles.push(file);
                }
            }
            
            // 只取每个类型的第一个文件
            if (coverFiles.length > 0) {
                setFileInput(coverInput, coverFiles[0]);
                coverName.textContent = coverFiles[0].name;
                coverName.style.color = '#27ae60';
            }
            
            if (audioFiles.length > 0) {
                setFileInput(audioInput, audioFiles[0]);
                audioName.textContent = audioFiles[0].name;
                audioName.style.color = '#27ae60';
            }
            
            if (lyricsFiles.length > 0) {
                setFileInput(lyricsInput, lyricsFiles[0]);
                lyricsName.textContent = lyricsFiles[0].name;
                lyricsName.style.color = '#27ae60';
            }
            
            updateFileInfo();
        }
        
        // 辅助函数：设置文件输入
        function setFileInput(input, file) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
        }
        
        // 更新文件信息显示
        function updateFileInfo() {
            let info = '';
            let count = 0;
            
            if (coverInput.files.length > 0) {
                info += `<strong>封面:</strong> ${coverInput.files[0].name}<br>`;
                count++;
            }
            
            if (audioInput.files.length > 0) {
                info += `<strong>音频:</strong> ${audioInput.files[0].name}<br>`;
                count++;
            }
            
            if (lyricsInput.files.length > 0) {
                info += `<strong>歌词:</strong> ${lyricsInput.files[0].name}<br>`;
                count++;
            }
            
            if (count === 0) {
                fileInfo.innerHTML = '未选择任何文件';
                fileInfo.style.color = '#777';
            } else {
                fileInfo.innerHTML = info;
                fileInfo.style.color = '#2c3e50';
            }
        }
        
        // 按钮点击触发文件选择
        document.getElementById('coverBtn').addEventListener('click', () => coverInput.click());
        document.getElementById('audioBtn').addEventListener('click', () => audioInput.click());
        document.getElementById('lyricsBtn').addEventListener('click', () => lyricsInput.click());
        
        // 文件选择变化时更新显示
        coverInput.addEventListener('change', () => {
            if (coverInput.files.length > 0) {
                coverName.textContent = coverInput.files[0].name;
                coverName.style.color = '#27ae60';
            } else {
                coverName.textContent = '未选择文件';
                coverName.style.color = '#777';
            }
            updateFileInfo();
        });
        
        audioInput.addEventListener('change', () => {
            if (audioInput.files.length > 0) {
                audioName.textContent = audioInput.files[0].name;
                audioName.style.color = '#27ae60';
            } else {
                audioName.textContent = '未选择文件';
                audioName.style.color = '#777';
            }
            updateFileInfo();
        });
        
        lyricsInput.addEventListener('change', () => {
            if (lyricsInput.files.length > 0) {
                lyricsName.textContent = lyricsInput.files[0].name;
                lyricsName.style.color = '#27ae60';
            } else {
                lyricsName.textContent = '未选择文件';
                lyricsName.style.color = '#777';
            }
            updateFileInfo();
        });
        
        // 初始化显示
        updateFileInfo();
    </script>
</body>
</html>