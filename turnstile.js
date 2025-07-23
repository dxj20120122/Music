(function() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 1)';
    overlay.style.zIndex = '9998';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    
    const container = document.createElement('div');
    container.id = 'turnstile-container';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '9999';
    container.style.display = 'none';
    
    const iframe = document.createElement('iframe');
    iframe.src = 'turnstile.html';  // ✅ 确保路径正确
    iframe.style.border = 'none';
    iframe.style.width = '360px';
    iframe.style.height = '500px';
    iframe.style.borderRadius = '8px';
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    function showTurnstile() {
        overlay.style.display = 'block';
        container.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    function hideTurnstile() {
        overlay.style.display = 'none';
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // ✅ 监听 iframe 发送的消息
    window.addEventListener('message', function(e) {
        console.log('收到消息:', e.data, '来自:', e.origin);
        
        // ✅ 检查来源（防止跨域攻击）
        if (e.origin !== window.location.origin) return;
        
        // ✅ 检查消息内容
        if (e.data && e.data.type === 'turnstileVerified' && e.data.success) {
            hideTurnstile();  // 关闭验证窗口
        }
    });
    
    showTurnstile();  // 自动显示验证
    
    window.Turnstile = {
        show: showTurnstile,
        hide: hideTurnstile
    };
})();