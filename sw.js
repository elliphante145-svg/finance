// Быстрый запуск при плохом интернете: приложение открывается из сохранённой копии сразу,
// а новая версия скачивается в фоне. Чужие сайты не трогаем.
const CACHE='finance-v49';
const CORE=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','reminder.ics'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
const timeout=(ms)=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;            // только свои файлы
  const net=fetch(req).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>{c.put(req,copy.clone());if(req.mode==='navigate')c.put('index.html',copy);});}return r;});
  if(req.mode==='navigate'){
    // страница: есть сохранённая копия — показываем её сразу, а свежую кладём в кэш на следующий раз.
    // Копии нет (первый запуск) — ждём сеть, но не дольше 8 секунд.
    e.respondWith(caches.match('index.html').then(cached=>{
      if(cached){e.waitUntil(net.catch(()=>{}));return cached;}
      return Promise.race([net,timeout(8000)]).catch(()=>caches.match('./').then(m=>m||new Response('Нет связи. Открой приложение ещё раз, когда появится интернет.',{headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    }));
    return;
  }
  // иконки и прочее: из кэша, в фоне обновляем
  e.respondWith(caches.match(req).then(m=>{if(m){e.waitUntil(net.catch(()=>{}));return m;}return net.catch(()=>caches.match('index.html'));}));
});
