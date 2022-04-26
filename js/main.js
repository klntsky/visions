const bubble = document.getElementById("bubble");
const table = document.getElementById("table");
const cfg = {
    rows: 20,
    cols: 15,
    vision_width: 500,
    vision_height: 280,
    visions_count: 60,
    x_uniq: 5,
    y_uniq: 5,
    intro_audio_file: './audio/intro.mp3',
    visions_audio_file: './audio/visions.mp3',
    intro_audio_file_mime: 'audio/mp3',
    preloader_chars: '先夢嘘幻血',
};
const IS_CHROMIUM = isChromiumBased();

function nonNegative(x) {
    return x > 0 ? x : 0;
}

function handleError (err = "") {
    alert(
        "Something went wrong. Please reload the page."
            + err ? "Error: " + err : ""
    );
}

async function preloadVisions () {
    return await Promise.all([...Array(cfg.visions_count).keys()].map(i => {
        let tmp = new Image();
        tmp.src = 'img/vision%23' + i + '.png';
        return new Promise((resolve, reject) => {
            tmp.addEventListener('load', resolve);
            if (tmp.complete) { resolve(); }
        });
    }));
}


function openFullscreen(elem) {
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
}


function hidePreloader() {
    const preloaderContainer = document.querySelector('#preloader-container');
    preloaderContainer.style.opacity = 0;
    setTimeout(() => preloaderContainer.hidden = true, 5000);
}

function once(f) {
    let flag = false;
    return () => {
        if (!flag) {
            flag = true;
            return f();
        }
    };
}



function showPreloader (cb=() => {}, limit=6000) {
    const preloaderContainer = document.querySelector('#preloader-container');
    preloaderContainer.hidden = false;
    preloaderContainer.style.opacity = 1;
    const wrappedCb = () => {
        once(cb)();
        preloaderContainer.removeEventListener("animationend", wrappedCb);
    };
    setTimeout(once(cb), limit);
    preloaderContainer.addEventListener("animationend", wrappedCb);
}

function initBubble () {
    if (IS_CHROMIUM) {
        const bubble = document.querySelector('#bubble');
        // bubble.style.backgroundColor = 'black';
        bubble.style.boxShadow = 'inset 0 0 50vh 50vh #000000';
    }
}

function finalize () {
    document.querySelector('#table-container').hidden = true; // do not waste CPU

}

async function init () {
    initBubble();
    calculateShifts();
    const stopPreloader = startPreloader();
    const tableContainer = document.querySelector('#table-container');
    const startButtonContainer = document.querySelector('#start-button-container');
    const startButton = document.querySelector('#start-button');
    const preloader = document.querySelector('#preloader');
    const preloaderContainer = document.querySelector('#preloader-container');
    const headPhonesNote = document.querySelector('#headphones-note');
    const videoNote = document.querySelector('#video-note');
    const authorLinkContainer = document.querySelector('#author-link-container');

    let intro_audio = new Audio(cfg.intro_audio_file);
    let visions_audio = new Audio(cfg.visions_audio_file);
    await Promise.all([
        new Promise((resolve, reject) => intro_audio.oncanplaythrough = resolve),
        new Promise((resolve, reject) => visions_audio.oncanplaythrough = resolve),
        preloadVisions()
    ]);

    const START_INTRO_FROM = 0;

    if (!IS_CHROMIUM) {
        intro_audio.onended = () => {
            visions_audio.play();
            startVisualizer(visions_audio, [10, 40, 80, 150]);
            tableContainer.style.animation = (
                'vertical 54s ease-in-out infinite, horizontal 75s ease-in-out infinite'
            );
        };
    }

    visions_audio.onended = () => {
        showPreloader();
        finalize();
        document.querySelector('#author-link-container').hidden = true;
        document.querySelector('#logo').hidden = false;
    };

    startButtonContainer.hidden = false;
    startButton.onclick = () => {
        tableContainer.hidden = false;
        if (IS_CHROMIUM) {
            setTimeout(() => {
                showPreloader(() => {
                    visions_audio.play();
                    startVisualizer(visions_audio, [10, 40, 80, 150]);
                    tableContainer.style.animation = (
                        'vertical 54s ease-in-out infinite, horizontal 75s ease-in-out infinite'
                    );
                    hidePreloader();
                }, 5500);
            }, 26000 - START_INTRO_FROM * 1000);
        }
        startButtonContainer.remove();
        videoNote.hidden = true;
        headPhonesNote.hidden = true;
        intro_audio.currentTime = START_INTRO_FROM;
        intro_audio.play();
        startVisualizer(intro_audio, [9]);
        openFullscreen(document.body);
        hidePreloader();
    };
    preloader.remove();
    initVisions();
}

var globalIxs = null;

function startVisualizer (audio, ixs) {
    window.AudioContext = (
        window.AudioContext
            || window.webkitAudioContext
            || window.mozAudioContext
            || window.msAudioContext
    );
    window.requestAnimationFrame = (
        window.requestAnimationFrame
            || window.webkitRequestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.msRequestAnimationFrame
    );
    let ctx;
    try {
        ctx = new AudioContext();
    } catch (e) {
        handleError("Your browser does not support AudioContext");
        return;
    }

    let analyser = ctx.createAnalyser();
    let source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    const bubble = document.querySelector('#bubble');
    const pos = x => x < 10 ? 10 : x;
    let prevX = 0;

    const update = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        ixs = globalIxs ? globalIxs : ixs;
        let x = 0;
        for (let ix of ixs) {
            x += array[ix];
        }
        x /= ixs.length;
        if (IS_CHROMIUM) {
            let opacity = 255 - (x - 85) * 2;
            opacity = opacity > 255 ? 255 : opacity < 0 ? 0 : opacity;
            if (prevX > opacity) {
                opacity = prevX - (prevX - opacity) * 0.1;
            }
            prevX = opacity;
            bubble.style.opacity = opacity / 255;
        } else {
            bubble.style.boxShadow = (
                'inset 0 0 ' + pos(250 - x) * 0.25  + 'vh ' +
                    (210 - x) * 0.25 + 'vh #000000'
            );
        }
        if (!audio.paused) {
             if (IS_CHROMIUM) {
                setTimeout(() => window.requestAnimationFrame(update), 40);
            } else {
                window.requestAnimationFrame(update);
            }
        }
    };
    window.requestAnimationFrame(update);
}

function calculateShifts () {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const img_width = cfg.cols * cfg.vision_width;
    const img_height = cfg.rows * cfg.vision_height;

    const right_border = vw - img_width;
    const bottom_border = vh - img_height;

    const css = `
      @keyframes vertical {
          0% {
              bottom: 0;
          }

          50% {
              bottom: ${bottom_border}px;
          }

          100% {
              bottom: 0;
          }
      }

      @keyframes horizontal {
          0% {
              right: ${right_border}px;
          }

          50% {
              right: 0;
          }

          100% {
              right: ${right_border}px;
          }
      }`;

    const style = document.getElementById("animation-css");
    style.innerHTML = css;
}

function startPreloader () {
    const preloader = document.querySelector('#preloader');
    // const headPhonesNote = document.querySelector('#headphones-note');
    let state = 0;

    const tickPreloader = () => {
        if (state == 3) {
            preloader.innerHTML = '';
            state = 0;
            // headPhonesNote.hidden = false;
        } else {
            preloader.textContent += cfg.preloader_chars[
                Math.floor(Math.random() * cfg.preloader_chars.length)
            ];
            state++;
            // headPhonesNote.hidden = true;
        }
    };
    let it = setInterval(tickPreloader, 600);
    return () => clearInterval(it);
}

function initVisions () {
    const arr = [];
    const x_range = cfg.x_uniq; // Math.floor(cfg.x_uniq / 2);
    const y_range = cfg.y_uniq; // Math.floor(cfg.y_uniq / 2);
    for (let i = 0; i < cfg.rows; ++i) {
        let row = [];
        arr.push(row);
        for (let j = 0; j < cfg.cols; ++j) {
            let prevs = [];
            let i_lbound = nonNegative(i - x_range);
            let i_rbound = i + x_range;
            let j_lbound = nonNegative(j - y_range);
            let j_rbound = j + y_range;

            for (let it = i_lbound; it < i_rbound; it++) {
                for (let jt = j_lbound; jt < j_rbound; jt++) {
                    if (typeof arr[it] != 'undefined' && typeof arr[it][jt] != 'undefined') {
                        prevs.push(arr[it][jt]);
                    }
                }
            }

            if (prevs.length > cfg.visions_count) {
                throw "Not enough visions!";
            }

            let cell = null;
            while (cell === null || prevs.includes(cell))
            {
                cell = Math.random() * cfg.visions_count | 0;
            }
            row.push(cell);
        }
    }

    for (let i = 0; i < cfg.rows; ++i) {
        let tr = document.createElement('tr');
        for (let j = 0; j < cfg.cols; ++j) {
            let td = document.createElement('td');
            td.className = "img-container";
            let img = document.createElement('img');
            img.className = "vision";
            img.src = 'img/vision%23' + arr[i][j] + '.png';
            td.appendChild(img);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}

function isChromiumBased () { // NB: Chromium is cringe
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

init();

document.body.addEventListener('keydown', event => {
    if (event.ctrlKey==true &&
        (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109'  || event.which == '187'  || event.which == '189') ) {
        event.preventDefault();
    }
});


window.addEventListener('mousewheel', function (event) {
    if (event.ctrlKey == true) {
        event.preventDefault();
    }
});

window.addEventListener('DOMMouseScroll', function (event) {
    if (event.ctrlKey == true) {
        event.preventDefault();
    }
});

window.addEventListener('resize', calculateShifts);

// Hide mouse cursor when inactive

(function() {
    var mouseTimer = null, cursorVisible = true;

    function disappearCursor() {
        mouseTimer = null;
        document.body.style.cursor = "none";
        cursorVisible = false;
    }

    document.onmousemove = function() {
        if (mouseTimer) {
            window.clearTimeout(mouseTimer);
        }
        if (!cursorVisible) {
            document.body.style.cursor = "default";
            cursorVisible = true;
        }
        mouseTimer = window.setTimeout(disappearCursor, 3000);
    };
})();
