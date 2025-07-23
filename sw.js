const CACHE_NAME = 'simple-music-v1';
const DYNAMIC_CACHE_NAME = 'simple-music-dynamic-v1';
const API_CACHE_NAME = 'simple-music-api-v1';

// 需要预缓存的核心文件
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/index_styles.css',
  '/index_script.js',
  '/favicon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
];

// 安装阶段 - 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker 安装中，预缓存核心资源');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('所有核心资源已预缓存');
        return self.skipWaiting();
      })
  );
});

// 激活阶段 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 缓存策略：网络优先，失败时回退到缓存
const networkFirst = async (request, cacheName) => {
  try {
    // 首先尝试从网络获取
    const networkResponse = await fetch(request);
    
    // 如果成功，更新缓存
    const cache = await caches.open(cacheName);
    await cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // 网络请求失败，尝试从缓存获取
    const cachedResponse = await caches.match(request);
    return cachedResponse || Promise.reject('没有缓存且网络不可用');
  }
};

// 缓存策略：缓存优先，失败时回退到网络
const cacheFirst = async (request, cacheName) => {
  // 首先尝试从缓存获取
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  
  // 缓存中没有，从网络获取
  try {
    const networkResponse = await fetch(request);
    
    // 如果成功，添加到缓存
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return Promise.reject('网络请求失败');
  }
};

// 拦截请求并应用适当的缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 忽略非GET请求
  if (request.method !== 'GET') return;
  
  // 处理API请求 (JSON数据)
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      networkFirst(request, API_CACHE_NAME)
        .catch(() => caches.match(request))
    );
    return;
  }
  
  // 处理图片和音频文件
  if (request.destination === 'image' || 
      request.destination === 'audio' || 
      url.pathname.endsWith('.mp3') || 
      url.pathname.endsWith('.jpg') || 
      url.pathname.endsWith('.png') || 
      url.pathname.endsWith('.webp')) {
    event.respondWith(
      cacheFirst(request, DYNAMIC_CACHE_NAME)
        .catch(() => {
          // 对于图片，可以返回一个占位图
          if (request.destination === 'image') {
            return new Response(
              '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#eee"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
          return Promise.reject('无法加载资源');
        })
    );
    return;
  }
  
  // 默认处理：网络优先
  event.respondWith(
    networkFirst(request, CACHE_NAME)
      .catch(() => caches.match(request))
  );
});

// 监听清除缓存的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('收到清除缓存指令');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('删除缓存:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('所有缓存已清除');
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      console.error('清除缓存失败:', error);
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});