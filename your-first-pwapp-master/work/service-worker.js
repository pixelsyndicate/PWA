// application data
var dataCacheName = 'weatherData-v1';
// shell data
var cacheName = 'weatherPWA-step-6-1';

// include all the files needed for this site (still need to load them into the local cache)
var filesToCache = [
    '/', '/index.html'
    , '/scripts/idb.js'
    , '/scripts/app.js'
    , '/scripts/jquery-1.10.2.min.js'
    , '/scripts/ie10-viewport-bug-workaround.js'
    , '/scripts/bootstrap.min.js'
    , '/styles/inline.css', '/styles/bootstrap.min.css'
    , '/styles/bootstrap-theme.min.css'
    , '/images/clear.png'
    , '/images/cloudy-scattered-showers.png'
    , '/images/cloudy.png'
    , '/images/fog.png'
    , '/images/ic_add_white_24px.svg'
    , '/images/ic_refresh_white_24px.svg'
    , '/images/partly-cloudy.png'
    , '/images/rain.png'
    , '/images/scattered-showers.png'
    , '/images/sleet.png'
    , '/images/snow.png'
    , '/images/thunderstorm.png'
    , '/images/wind.png'
    , '/fonts/glyphicons-halflings-regular.svg'
    , '/fonts/glyphicons-halflings-regular.eot'
    , '/fonts/glyphicons-halflings-regular.ttf'
    , '/fonts/glyphicons-halflings-regular.woff'
    , '/fonts/glyphicons-halflings-regular.woff2'
    ,'//fonts.googleapis.com/css?family=Open+Sans'
];

// this 'install' event happens when navigator.serviceWorker.register('./scriptname.js') is called.
self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');
    // open the cache then add all the files needed to it
    e.waitUntil(caches.open(cacheName).then(function (cache) {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(filesToCache);
    }));
});

// the 'activate' event fires when the service-worker in the browser is started up.

// demostrate a gotcha. this activation may never get called if the previously installed
    // worker is already handling the page.
// to resolve in devtools (chrome), check in Application > Service Workers the 'Updated on reload'
self.addEventListener('activate', function (e) { 
    console.log('[ServiceWorker] Activate');
    
    
    //  update the activate event handler so that it doesn't 
    // delete the data cache when it cleans up the app shell cache.
   // if (key !== cacheName && key !== dataCacheName) { 
        e.waitUntil(caches.keys().then(function (keyList) {   
            return Promise.all(keyList.map(function (key) {    
                if (key !== cacheName) {     
                    console.log('[ServiceWorker] Removing old cache', key);     
                    return caches.delete(key);   
                } 
            }));  
        }) );
   //  } // -- end of if (key !== cacheName && key !== dataCacheName) 
    // When the app is complete, self.clients.claim() fixes a corner case in which the app wasn't returning the latest data. This happens when the service attempts to return data before the client is done initializing.
    return self.clients.claim();
});

/* 
* if the URL is requesting the WebApi, get the data, cache it in datacache and then return it.
* else if the request is asking for something in our cache (like bootstrap.css), then return that from the cache
* serve up the app shell from the cache. 
*/
self.addEventListener('fetch', function (e) {
    console.log('[ServiceWorker] Fetch', e.request.url);
    var dataUrl = 'https://query.yahooapis.com/v1/public/yql';
    if (e.request.url.indexOf(dataUrl) > -1) {
        /*
         * When the request URL contains dataUrl, the app is asking for fresh
         * weather data. In this case, the service worker always goes to the
         * network and then caches the response. This is called the "Cache then
         * network" strategy:
         * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
         */
        e.respondWith(caches.open(dataCacheName).then(function (cache) {
            return fetch(e.request).then(function (response) {
                console.log('[ServiceWorker] caching request url: ', e.request.url);
                    cache.put(e.request.url, response.clone());     
                return response;    
            });   
        })  );
    }
    else {
        /*
         * The app is asking for app shell files. In this scenario the app uses the
         * "Cache, falling back to the network" offline strategy:
         * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
         */
          
        e.respondWith(caches.match(e.request).then(function (response) {    
            return response || fetch(e.request);   
        })  );
    }
});