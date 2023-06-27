// imports
const jsmediatags = window.jsmediatags

// global variables
let currentLyrics = [] // (final JSON) -> array of lyrics
let currentWordIndex = 0; // index of the currently recorded word
let goBackIndex = 0; // index of the word to go back to (arrow keys)
let importedJSON = false; // if the lyrics have been imported from a JSON file
let filename = ''; // name of the file
let selectedWordIndex = -1; // index of the selected word
let played_word = ''; // word that is currently being played
let music_file = null; // music file

// dom elements
const elem_part_sortable = document.getElementsByClassName('part-sortable');
const elem_musicInput = document.getElementById('music-input');
const elem_musicPlayer = document.getElementById('music-player');
const elem_lyricsInput = document.getElementById('lyrics-input');
const elem_lyricsContent = document.getElementById('lyrics-content');

// plyr
const player = new Plyr(elem_musicPlayer, {
    controls: ['play', 'progress', 'current-time', 'mute', 'settings'],
    speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.5]
    }
});

// sortable
for (let i = 0; i < elem_part_sortable.length; i++) {
    var sortable = Sortable.create(elem_part_sortable[i], {
        group: "part-sortable",
        handle: ".inner-part-title",
        animation: 150,
        filter: ".ignore-elements",
        ghostClass: "inner-part-ghost",
        chosenClass: "inner-part-chosen",
        dragClass: "inner-part-drag",
        store: {
            set: function (sortable) {
                var order = sortable.toArray();
                localStorage.setItem(sortable.options.group.name, order.join('|'));
            },
            get: function (sortable) {
                var order = localStorage.getItem(sortable.options.group.name);
			    return order ? order.split('|') : [];
            }
        }
    });
}

// tools
function msToTime(duration) {
    let milliseconds = parseInt((duration%1000)/10);
    let seconds = parseInt((duration/1000)%60);
    let minutes = parseInt((duration/(1000*60))%60);

    milliseconds = (milliseconds < 10) ? '0' + milliseconds : milliseconds;
    seconds = (seconds < 10) ? '0' + seconds : seconds;
    minutes = (minutes < 10) ? '0' + minutes : minutes;

    return minutes + ':' + seconds + '.' + milliseconds;
}

// functionnal functions
function reset() {
    // reset global variables
    currentLyrics = [];
    currentWordIndex = 0;
    goBackIndex = 0;
    importedJSON = false;
    filename = '';
    selectedWordIndex = -1;
    played_word = '';

    // reset dom elements
    elem_musicPlayer.src = '';
    elem_musicInput.value = '';
    elem_lyricsInput.value = '';
    elem_lyricsContent.innerHTML = '';

    // reset music info
    document.getElementById('music-title').innerText = '';
    document.getElementById('music-artist').innerText = '';
    document.getElementById('music-album').innerText = '';
    document.getElementById('music-album-art').src = null;
}

function importSong() {
    elem_musicInput.type = 'file';
    elem_musicInput.accept = '.mp3, .wav, .ogg, .flac, .m4a, .mp4';
    elem_musicInput.click();
}

function importJSON(files) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    if(!files) {
        input.click();
    }

    importedJSON = true;

    input.addEventListener('change', function() {
        const file = this.files[0];
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = function(evt) {
            const json = JSON.parse(evt.target.result);

            // clear elem_lyricsContent
            elem_lyricsContent.innerHTML = '';
            
            inc = 0;

            // for each word, add a <p> when isLineEnding is 1
            json.forEach(word => {
                if(word.isLineEnding === 1) {
                    const p = document.createElement('p');
                    p.classList.add('lyrics-line');
                    if(inc % 2 === 0) {
                        p.classList.add('even');
                    }
                    else {
                        p.classList.add('odd');
                    }
                    elem_lyricsContent.appendChild(p);
                    inc++;
                }
            });

            // for each word, add a <span> tag in the right <p> tag
            let isLineEndingCounter = 0;
            json.forEach(word => {
                const p = document.querySelectorAll('.lyrics-line')[isLineEndingCounter];
                const span = document.createElement('span');
                span.classList.add('lyrics-word');
                span.innerText = word.text + ' ';
                p.appendChild(span);

                if(word.isLineEnding === 1) {
                    isLineEndingCounter++;
                }
            });

            // for each word, set id to word-<index>
            document.querySelectorAll('.lyrics-word').forEach(word => {
                const index = Array.from(document.querySelectorAll('.lyrics-word')).indexOf(word);
                word.id = 'word-' + index.toString();
                
                try {
                    word.style.setProperty('--duration', json[index].duration + 'ms');
                }
                catch(error) {
                    console.error(error);
                }
            });

            // set currentLyrics to json
            for(let i = 0; i < json.length; i++) {
                const word = json[i];
                currentLyrics.push(word);
            }

            // replace element in currentLyrics with element from elem_lyricsContent
            currentLyrics.forEach(word => {
                const index = currentLyrics.indexOf(word);
                const element = document.getElementById('word-' + index.toString());
                word.element = element;
            });

            // set all words to done-word
            const words = document.querySelectorAll('.lyrics-word');
            words.forEach(word => {
                word.classList.add('done-word');
            });

            // set currentWordIndex to last word
            currentWordIndex = currentLyrics.length - 1;
        }
    });

    if(files) {
        input.files = files;
        input.dispatchEvent(new Event('change'));
    }
}

function parseLyrics() {
    if (elem_lyricsInput.value.trim() === '') {
        return;
    }

    let jsonText = null;

    elem_lyricsContent.innerHTML = '';

    let inc = 0;

    // for each line, add a <p> tag in the lyrics-content div
    const lines = elem_lyricsInput.value.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        p.classList.add('lyrics-line');

        // if inc is even, add .even to the <p> tag, else add .odd
        if(inc % 2 === 0) {
            p.classList.add('even');
        }
        else {
            p.classList.add('odd');
        }

        // for each word, add a <span> tag in the <p> tag
        const words = line.split(' ');
        words.forEach(word => {
            const span = document.createElement('span');
            span.classList.add('lyrics-word');

            if(word.trim() === '') {
                span.innerText = ' ';
                span.classList.add('lyrics-space');
                p.appendChild(span);
                return;
            }

            span.innerText = word + ' ';
            p.appendChild(span);
        });
        elem_lyricsContent.appendChild(p);

        inc++;
    });
}

function nextWord() {
    const NextWordButton = document.getElementById('nextword-button');

    NextWordButton.classList.add('enabled');
    setTimeout(() => {
        NextWordButton.classList.remove('enabled');
    }, 50);

    // get time of elem_musicPlayer in milliseconds
    const time = elem_musicPlayer.currentTime * 1000;


    let currentWord = document.querySelectorAll('.lyrics-word')[currentWordIndex];
    let lastWord = document.querySelectorAll('.lyrics-word')[currentWordIndex - 1];
    let nextWord = document.querySelectorAll('.lyrics-word')[currentWordIndex + 1];
    
    // if playing-word is behind current-word, delete everything after playing-word in currentLyrics and go back to it
    if(document.querySelector('.playing-word')) {
        const playingWord = document.querySelector('.playing-word');
        const playingWordIndex = Array.from(document.querySelectorAll('.lyrics-word')).indexOf(playingWord);
        if(playingWordIndex < currentWordIndex) {
            // delete everything after playing-word in currentLyrics
            currentLyrics = currentLyrics.slice(0, playingWordIndex);
            currentWordIndex = playingWordIndex;

            // go back to playing-word
            currentWord = document.querySelectorAll('.lyrics-word')[currentWordIndex];
            lastWord = document.querySelectorAll('.lyrics-word')[currentWordIndex - 1];

            // remove done-word class from all words after playing-word
            const doneWords = document.querySelectorAll('.done-word');
            doneWords.forEach(word => {
                if(Array.from(document.querySelectorAll('.lyrics-word')).indexOf(word) > currentWordIndex) {
                    word.classList.remove('done-word');
                }
            });

            // remove current-word class from all words
            const currentWords = document.querySelectorAll('.current-word');
            currentWords.forEach(word => {
                word.classList.remove('current-word');
            });
        }
    }

    let isLastWord = 0;

    if(currentWord.nextSibling === null) {
        isLastWord = 1;
    }

    // add current word to currentLyrics
    currentLyrics.push({
        time: parseInt(time.toFixed(0)),
        duration: 0,
        text: currentWord.innerText,
        isLineEnding: isLastWord,
        element: currentWord
    });

    // get difference between time and lastWordTime
    if(currentLyrics[currentLyrics.length - 2]) {
        const lastWordTime = currentLyrics[currentLyrics.length - 2].time;
        const difference = time - lastWordTime;
        currentLyrics[currentLyrics.length - 2].duration = parseInt(difference.toFixed(0));
        currentLyrics[currentLyrics.length - 2].element.style.setProperty('--duration', parseInt(difference.toFixed(0)) + 'ms');
    }

    // set current word to next word
    currentWord.classList.add('current-word');
    currentWord.id = 'word-' + (currentLyrics.length - 1).toString();

    if(lastWord) {
        lastWord.classList.add('done-word');
        lastWord.classList.remove('current-word');
    }

    currentWordIndex += 1;

    // scroll to next word
    const elem_lyricsContent = document.getElementById('lyrics-content');
    elem_lyricsContent.scrollTop = currentWord.offsetTop - elem_lyricsContent.offsetTop - 100;

    // if there is no next word, remove class current-word from last word
    if(!nextWord) {
        setTimeout(() => {
            currentWord.classList.remove('current-word');
            currentWord.classList.add('done-word');
        }, 500);
    }
}

function openWord(wordIndex) {
    const word = currentLyrics[wordIndex];
    selectedWordIndex = wordIndex;

    document.querySelectorAll('.opened-word').forEach(word => {
        word.classList.remove('opened-word');
    });

    word.element.classList.add('opened-word');
    document.getElementById('properties-word').innerText = word.text;
    document.getElementById('properties-start').value = word.time;
    document.getElementById('properties-length').value = word.duration;

    // go to word
    elem_musicPlayer.currentTime = word.time / 1000;
}

// UI functions
function playPause() {
    const playPauseButton = document.getElementById('playpause-button');
    playPauseButton.classList.add('enabled');
    setTimeout(() => {
        playPauseButton.classList.remove('enabled');
    }, 50);

    if(elem_musicPlayer.paused) {
        elem_musicPlayer.play();
    } else {
        elem_musicPlayer.pause();
    }
}

function previewToggle() {
    document.getElementById('lyrics-content').classList.toggle('preview');

    if (document.querySelector('#preview-mode').innerHTML == 'Preview mode') {
        document.querySelector('#preview-mode').innerHTML = 'Edit mode';
    }
    else {
        document.querySelector('#preview-mode').innerHTML = 'Preview mode';
    }

    // preview-checkbox
    const previewCheckbox = document.getElementById('preview-checkbox');
    previewCheckbox.checked = document.getElementById('lyrics-content').classList.contains('preview');
}

document.getElementById('preview-theme').addEventListener('change', () => {
    // change data-theme of lyrics-content
    document.getElementById('lyrics-content').setAttribute('data-theme', document.getElementById('preview-theme').value);
});

function unselect() {
    selectedWordIndex = -1;
    document.querySelectorAll('.opened-word').forEach(word => {
        word.classList.remove('opened-word');
    });

    document.getElementById('properties-word').innerText = '';
    document.getElementById('properties-start').value = 0;
    document.getElementById('properties-length').value = 0;
}

// exports
function prepareJSON() {
    let exportedLyrics = currentLyrics;

    // add mussing lyrics with duration 0 and last time
    const lastTime = currentLyrics[currentLyrics.length - 1].time;

    const words = document.querySelectorAll('.lyrics-word');
    words.forEach(word => {
        const index = Array.from(document.querySelectorAll('.lyrics-word')).indexOf(word);
        if(index >= currentLyrics.length) {
            let isLineEnding = 0;
            if(word.nextSibling === null) {
                isLineEnding = 1;
            }

            exportedLyrics.push({
                time: lastTime,
                duration: 0,
                text: word.innerText,
                isLineEnding: isLineEnding,
            });
        }
    });

    // filter out empty words
    const filteredLyrics = currentLyrics.filter(word => word.text !== '');

    // make pretty JSON
    const json = JSON.stringify(filteredLyrics, null, 4);

    const blob = new Blob([json], {type: 'application/json'});
    return blob;
}

function prepareLRC() {
    let lrcContent = '';

    let currentPhraseTime = '';
    let currentPhrase = '';

    currentLyrics.forEach((word, index) => {
        if (index === 0 || currentLyrics[index - 1].isLineEnding === 1) {
            if (currentPhrase !== '') {
                lrcContent += '[' + currentPhraseTime + ']' + currentPhrase.trim() + '\n';
            }
            currentPhraseTime = msToTime(word.time);
            currentPhrase = word.text;
        } else {
            currentPhrase += word.text;
        }
    });

    lrcContent += '[' + currentPhraseTime + ']' + currentPhrase.trim() + '\n';

    const formattedContent = lrcContent.trim();
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    return blob;
}

function prepareELRC() {
    let lrcContent = '';

    currentLyrics.forEach((word, index) => {
        if (index === 0 || currentLyrics[index - 1].isLineEnding === 1) {
            lrcContent += '\n' + '[' + msToTime(word.time) + ']' + word.text;
        }
        else {
            lrcContent += ' <' + msToTime(word.time) + '>' + word.text;
        }
    });

    const formattedContent = lrcContent.trim();
    const blob = new Blob([formattedContent], { type: 'text/plain' });
    return blob;
}

function exportJSON() {
    const blob = prepareJSON();
    downloadBlob(blob);
}

function exportLRC() {
    const blob = prepareLRC();
    downloadBlob(blob, 'lrc');
}

function exportELRC() {
    const blob = prepareELRC();
    downloadBlob(blob, 'lrc');
}

function downloadBlob(blob, format = 'json') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename + '.' + format;
    a.click();
}

function exportKMAKE() {
    var zip = new JSZip();

    // add music
    zip.file("audiofile.kmakefile", music_file);

    // add lyrics
    let jsonLyrics = prepareJSON();
    zip.file("lyrics.kmakefile", jsonLyrics);

    const options = { 
        type: 'blob',
        mimeType: 'application/kmake',
    };

    // export
    zip.generateAsync(options).then(function (content) {
        downloadBlob(content, 'kmake');
    });
}

function importKMAKE() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kmake';
    input.onchange = e => {
        reset();

        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = readerEvent => {
                const content = readerEvent.target.result;
                JSZip.loadAsync(content).then(function (zip) {
                    // get music
                    zip.file("audiofile.kmakefile").async("blob").then(function (content) {
                        const file = new File([content], 'audiofile.mp3');
                        
                        // create filelist
                        const fileList = new DataTransfer();
                        fileList.items.add(file);

                        // set music
                        elem_musicInput.files = fileList.files;
                        elem_musicInput.dispatchEvent(new Event('change'));
                    });

                    // get lyrics
                    zip.file("lyrics.kmakefile").async("string").then(function (content) {
                        const file = new File([content], 'lyrics.json');

                        // create filelist
                        const fileList = new DataTransfer();
                        fileList.items.add(file);

                        // set lyrics
                        importJSON(fileList.files);
                    });
                });
            }
        }
    }
    input.click();
}

// shortcuts
document.addEventListener('keydown', function(event) {
    // check if we're in the lyrics input
    if(document.activeElement === elem_lyricsInput) {
        return;
    }
    if(event.keyCode === 13) {
        // prevent default
        event.preventDefault();

        nextWord();
    }
});

// playback
setInterval(() => {
    // TODO : opti

    if(elem_musicPlayer.paused) {
        document.getElementById('lyrics-content').classList.add('paused');
    }
    else {
        document.getElementById('lyrics-content').classList.remove('paused');
    }

    const time = elem_musicPlayer.currentTime * 1000;
    
    // find the word next to the word that is currently playing
    let currentWord = null;
    for(let i = 0; i < currentLyrics.length; i++) {
        const word = currentLyrics[i];
        if(word.time > time) {
            currentWord = currentLyrics[i-1];
            break;
        }
    }

    if(document.querySelectorAll('.playing-word').length > 0) {
        document.querySelector('.playing-word').classList.remove('playing-word');
    }

    if(currentWord) {
        currentWord.element.classList.add('playing-word');
    }

    if (currentWord && currentWord.text === played_word) {
        return;
    } else if (!currentWord) {
        return;
    } else {
        played_word = currentWord.text;
    }

    if(!currentWord) {
        return;
    }

    // add past-word class to all words before currentWord
    const allWords = Array.from(document.querySelectorAll('.lyrics-word'));
    const currentIndex = allWords.indexOf(currentWord.element);

    allWords.forEach((word, index) => {
        word.classList.toggle('past-word', index < currentIndex);
    });

    document.querySelectorAll('.lyrics-line').forEach(line => {
        line.classList.remove('playing-line', 'next-playing-line');
    });

    const lyricsLine = currentWord.element.closest('.lyrics-line');
    lyricsLine.classList.add('playing-line');
    lyricsLine.classList.remove('next-playing-line');
    
    document.querySelectorAll('.next-next-playing-line').forEach(line => {
        line.classList.remove('next-next-playing-line');
    });

    document.querySelectorAll('.previous-playing-line').forEach(line => {
        line.classList.remove('previous-playing-line');
    });

    const nextLyricsLine = lyricsLine.nextSibling;
    if (nextLyricsLine !== null) {
        nextLyricsLine.classList.add('next-playing-line');
    }

    const nextNextLyricsLine = nextLyricsLine.nextSibling;
    if (nextNextLyricsLine !== null) {
        nextNextLyricsLine.classList.add('next-next-playing-line');
    }

    // get previous line
    const previousLyricsLine = lyricsLine.previousSibling;
    if (previousLyricsLine !== null) {
        previousLyricsLine.classList.add('previous-playing-line');
    }

    // if preview, scroll to current line
    if (document.getElementById('lyrics-content').classList.contains('preview')) {
        const lyricsContent = document.getElementById('lyrics-content');
       
        const currentLine = document.querySelector('.playing-line');

        const currentLineTop = currentLine.offsetTop;
        
        lyricsContent.scrollTop = currentLineTop - lyricsContent.clientHeight / 2 + 120;
    }
}, 30);

// events
elem_musicInput.addEventListener('change', function() {
    const file = this.files[0];
    const objectURL = URL.createObjectURL(file);
    elem_musicPlayer.src = objectURL;

    music_file = file;

    // remove extension from filename
    filename = file.name.split('.').slice(0, -1).join('.');

    jsmediatags.read(file, {
        onSuccess: function(tag) {
            document.getElementById('music-title').innerText = tag.tags.title;
            document.getElementById('music-artist').innerText = tag.tags.artist;
            document.getElementById('music-album').innerText = tag.tags.album;

            // Array buffer to base64
            const data = tag.tags.picture.data
            const format = tag.tags.picture.format
            const base64String = btoa(String.fromCharCode.apply(null, data))

            document.getElementById('music-album-art').src = 'data:' + format + ';base64,' + base64String
        },
        onError: function(error) {
            console.error(error)
        }
    })  

    if(!importedJSON) {
        currentLyrics = [];
        lastWordTime = 0;
        currentWordIndex = 0;
    }
});

// on play, reset goBackIndex
elem_musicPlayer.addEventListener('play', function() {
    goBackIndex = 0;
});

// shortcut spacebar to play/pause
document.addEventListener('keydown', function(event) {
    // check if we're in the lyrics input
    if(document.activeElement === elem_lyricsInput) {
        return;
    }
    if(event.keyCode === 32) {
        // if audioplayer is in focus, don't play/pause
        if(document.activeElement === elem_musicPlayer) {
            return;
        }

        playPause();

        // prevent spacebar from scrolling down
        event.preventDefault();
    }
});

// on arrow left, go back to last word and on arrow right, go to next word
document.addEventListener('keydown', function(event) {
    if(event.keyCode === 37) {
        goBackIndex -= 1;
    }
    if(event.keyCode === 39) {
        goBackIndex += 1;

        if(goBackIndex > 0) {
            goBackIndex = 0;
        }
    }

    // move to word
    if(event.keyCode === 37 || event.keyCode === 39) {
        let word = currentLyrics[currentWordIndex + goBackIndex];
        elem_musicPlayer.currentTime = word.time / 1000;
    }
});

// on click on .lyrics-word
document.addEventListener('click', function(event) {
    if(event.target.classList.contains('lyrics-word')) {
        const word = event.target;
        if(word.id) {
            const wordIndex = parseInt(word.id.split('-')[1]);
            openWord(wordIndex);
            
        }
    }
});

// properties change
document.getElementById('properties-start').addEventListener('change', function(event) {
    if (selectedWordIndex === -1) {
        return;
    }
    currentLyrics[selectedWordIndex].time = parseInt(event.target.value);
});

document.getElementById('properties-length').addEventListener('change', function(event) {
    if (selectedWordIndex === -1) {
        return;
    }
    currentLyrics[selectedWordIndex].duration = parseInt(event.target.value);

    // make sure that the next word starts after this word ends
    const nextWord = currentLyrics[selectedWordIndex + 1];
    if(nextWord) {
        if(nextWord.time < currentLyrics[selectedWordIndex].time + currentLyrics[selectedWordIndex].duration) {
            nextWord.time = currentLyrics[selectedWordIndex].time + currentLyrics[selectedWordIndex].duration;
        }
    }

    // make sure that the previous word ends before this word starts
    const previousWord = currentLyrics[selectedWordIndex - 1];
    if(previousWord) {
        if(previousWord.time + previousWord.duration > currentLyrics[selectedWordIndex].time) {
            previousWord.duration = currentLyrics[selectedWordIndex].time - previousWord.time;
        }
    }

    // update duration of word in DOM
    currentLyrics[selectedWordIndex].element.style.setProperty('--duration', currentLyrics[selectedWordIndex].duration + 'ms');
});

document.getElementById('properties-preview').addEventListener('click', function(event) {
    const word = currentLyrics[selectedWordIndex];
    elem_musicPlayer.currentTime = word.time / 1000;
    elem_musicPlayer.play();

    // stop preview after duration
    setTimeout(() => {
        elem_musicPlayer.pause();
    }, word.duration);
});

// on dom fully loaded
window.addEventListener('load', function() {
    document.getElementById('loading').style.display = 'none';
});

// dropdown
tippy('#export-drop', {
    content: `
        <div id="export-dropdown" class="dropdown-content">
            <button onclick="exportJSON()" id="json-button">Export as JSON</button>
            <button onclick="exportLRC()" id="lrc-button">Export as LRC</button>
            <button onclick="exportELRC()" id="lrc-button">Export as eLRC</button>
        </div>
    `,
    allowHTML: true,
    trigger: 'click',
    interactive: true,
    animation: 'fade',
    arrow: false,
    theme: 'kmake-dropdown',
    placement: 'bottom-start',
});