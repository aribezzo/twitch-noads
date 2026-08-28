(function() {
    let hlsInstance = null;

    function replacePlayer(channel) {
        if (!channel) return;

        let player = document.querySelector('.video-player, .player-container, [data-test-selector="video-player"]');
        if (!player) {
            let video = document.querySelector('video');
            if (video) {
                player = video.closest('div[style*="position"]') || video.parentElement;
            }
        }
        if (!player) return;

        // Svuota il player
        player.innerHTML = '';
        player.style.position = 'relative';
        player.style.background = '#000';
        player.style.width = '100%';
        player.style.height = '100%';

        // Crea il nuovo video
        let newVideo = document.createElement('video');
        newVideo.controls = true;
        newVideo.autoplay = true;
        newVideo.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
        player.appendChild(newVideo);

        // Chiedi lo stream al server
        fetch('http://localhost:8765/play?channel=' + encodeURIComponent(channel))
            .then(response => response.json())
            .then(data => {
                if (data.status !== 'success' || !data.stream_url) return;

                // Carica hls.js
                let script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
                script.onload = function() {
                    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                        if (hlsInstance) {
                            hlsInstance.destroy();
                            hlsInstance = null;
                        }
                        hlsInstance = new Hls();
                        hlsInstance.loadSource(data.stream_url);
                        hlsInstance.attachMedia(newVideo);
                        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                            newVideo.play();
                        });
                    } else {
                        newVideo.src = data.stream_url;
                        newVideo.play();
                    }
                };
                document.head.appendChild(script);
            })
            .catch(() => {});

        // Etichetta canale
        let label = document.createElement('div');
        label.style.cssText = 'position:absolute;top:10px;left:10px;z-index:10;color:rgba(255,255,255,0.6);font-family:sans-serif;font-size:11px;background:rgba(0,0,0,0.5);padding:3px 10px;border-radius:3px;pointer-events:none;';
        label.textContent = '🎬 No-Ads · ' + channel;
        player.appendChild(label);

        // Pulsante "Torna a Twitch"
        let closeBtn = document.createElement('button');
        closeBtn.textContent = '↩️ Torna a Twitch';
        closeBtn.style.cssText = 'position:absolute;bottom:20px;right:20px;z-index:10;background:rgba(145,71,255,0.9);color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:12px;font-family:sans-serif;';
        closeBtn.onclick = function() {
            if (hlsInstance) {
                hlsInstance.destroy();
                hlsInstance = null;
            }
            location.reload();
        };
        player.appendChild(closeBtn);
    }

    function waitForPlayerAndReplace() {
        let channel = window.location.pathname.split('/')[1];
        if (channel && channel !== '') {
            let checkInterval = setInterval(function() {
                let player = document.querySelector('.video-player, .player-container, [data-test-selector="video-player"]');
                if (player) {
                    clearInterval(checkInterval);
                    replacePlayer(channel);
                }
            }, 500);
        }
    }

    // Avvio iniziale
    setTimeout(waitForPlayerAndReplace, 2000);

    // Rileva cambio canale
    let observer = new MutationObserver(function() {
        let channel = window.location.pathname.split('/')[1];
        if (channel && channel !== '') {
            let player = document.querySelector('.video-player, .player-container, [data-test-selector="video-player"]');
            if (player) {
                replacePlayer(channel);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Intercetta navigazione SPA (cambio pagina senza ricarica)
    let pushState = history.pushState;
    history.pushState = function() {
        pushState.apply(history, arguments);
        setTimeout(waitForPlayerAndReplace, 500);
    };

    window.addEventListener('popstate', function() {
        setTimeout(waitForPlayerAndReplace, 500);
    });
})();
