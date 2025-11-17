(function() {
    // Use a global object to ensure the script only initializes once per page,
    // and to hold the audio element.
    if (!window.persistentMusic) {
        window.persistentMusic = {
            audio: new Audio('assets/Sonido/MUSICA_FONDO.mp3'),
            initialized: false
        };
    }

    const music = window.persistentMusic.audio;

    function saveState() {
        sessionStorage.setItem('musicTime', music.currentTime);
        sessionStorage.setItem('musicPlaying', !music.paused);
    }

    function loadStateAndPlay() {
        music.loop = true;
        const savedTime = sessionStorage.getItem('musicTime');
        const musicWasPlaying = sessionStorage.getItem('musicPlaying') !== 'false';

        if (savedTime) {
            music.currentTime = parseFloat(savedTime);
        }

        if (musicWasPlaying) {
            const playPromise = music.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay prevented. Click anywhere to start music.");
                    const startMusic = () => {
                        music.play();
                        document.body.removeEventListener('click', startMusic);
                        document.body.removeEventListener('keydown', startMusic);
                    };
                    document.body.addEventListener('click', startMusic);
                    document.body.addEventListener('keydown', startMusic);
                });
            }
        }
    }

    // When the page is about to be unloaded, save the current time.
    window.addEventListener('beforeunload', saveState);

    // When the page loads, load the saved time and start playing.
    window.addEventListener('load', loadStateAndPlay);

})();
