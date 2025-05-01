const CACHE_NAME = 'music-cache-v1';
const urlsToCache = [
  './',
  'index.html',
  'songs.json'
];

// 安装Service Worker时缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截请求并返回缓存内容
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中则返回缓存内容
        if (response) {
          return response;
        }
        
        // 否则从网络获取并缓存
        return fetch(event.request).then(
          response => {
            // 只缓存成功的响应和音乐文件
            if(!response || response.status !== 200 || response.type !== 'basic' || 
               !event.request.url.includes('.mp3') && !event.request.url.includes('.lrc')) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});