(function() {
    // 配置
    const config = {
        allowedOrigins: [
            window.location.origin // 允许当前域作为合法域名
        ],
        iframeSrc: './turnstile.html', // 使用相对路径
        verificationTimeout: 300000 // 5分钟验证超时
    };
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    overlay.style.zIndex = '9998';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    
    // 创建验证容器
    const container = document.createElement('div');
    container.id = 'turnstile-container';
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '9999';
    container.style.display = 'none';
    
    // 创建iframe
    const iframe = document.createElement('iframe');
    iframe.src = config.iframeSrc;
    iframe.style.border = 'none';
    iframe.style.width = '320px';
    iframe.style.height = '550px';
    iframe.style.borderRadius = '8px';
    iframe.allow = 'accelerometer; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; xr-spatial-tracking';
    iframe.sandbox = 'allow-scripts allow-forms';
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // 验证状态
    let verificationTimer;
    let isVerified = false;
    
    // 显示验证
    function showTurnstile() {
        overlay.style.display = 'block';
        container.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // 设置验证超时
        verificationTimer = setTimeout(() => {
            if (!isVerified) {
                hideTurnstile();
                alert('验证超时，请刷新页面重试');
            }
        }, config.verificationTimeout);
    }
    
    // 隐藏验证
    function hideTurnstile() {
        overlay.style.display = 'none';
        container.style.display = 'none';
        document.body.style.overflow = 'auto';
        clearTimeout(verificationTimer);
    }
    
    // 严格的消息监听
    window.addEventListener('message', function(e) {
        // 验证消息来源
        if (!config.allowedOrigins.includes(e.origin)) {
            console.warn('收到来自未授权域的消息:', e.origin);
            return;
        }
        
        // 验证消息结构
        if (e.data && typeof e.data === 'object' && 
            e.data.type === 'turnstileVerified' && 
            typeof e.data.success === 'boolean') {
            
            if (e.data.success) {
                isVerified = true;
                hideTurnstile();
                
                // 存储验证token
                if (e.data.token) {
                    localStorage.setItem('turnstile_token', e.data.token);
                    localStorage.setItem('turnstile_token_expiry', Date.now() + 3600000); // 1小时有效
                }
            }
        }
    });
    
    // 检查是否有有效token
    function checkExistingToken() {
        const token = localStorage.getItem('turnstile_token');
        const expiry = localStorage.getItem('turnstile_token_expiry');
        
        if (token && expiry && Date.now() < parseInt(expiry)) {
            return true;
        }
        return false;
    }
    
    // 初始化
    if (!checkExistingToken()) {
        showTurnstile();
    }
    
    // 公开API
    window.Turnstile = {
        show: showTurnstile,
        hide: hideTurnstile,
        isVerified: function() {
            return isVerified || checkExistingToken();
        },
        getToken: function() {
            return localStorage.getItem('turnstile_token');
        }
    };
})();
