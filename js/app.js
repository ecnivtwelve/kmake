const jsmediatags = window.jsmediatags

let currentLyrics = [];
let currentWordIndex = 0;
let goBackIndex = 0;
let importedJSON = false;
let filename = '';

function reset() {
    currentLyrics = [];
    currentWordIndex = 0;
    goBackIndex = 0;
    importedJSON = false;
    musicPlayer.src = '';
    musicInput.value = '';
    lyricsInput.value = '';
    filename = '';
    lyricsContent.innerHTML = '';
    document.getElementById('music-title').innerText = '';
    document.getElementById('music-artist').innerText = '';
    document.getElementById('music-album').innerText = '';
    document.getElementById('music-album-art').src = null;
}

// load a song
const musicInput = document.getElementById('music-input');
const musicPlayer = document.getElementById('music-player');

function importSong() {
    musicInput.click();
}

musicInput.addEventListener('change', function() {
    const file = this.files[0];
    const objectURL = URL.createObjectURL(file);
    musicPlayer.src = objectURL;

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
musicPlayer.addEventListener('play', function() {
    goBackIndex = 0;
});

function playPause() {
    const playPauseButton = document.getElementById('playpause-button');
    playPauseButton.classList.add('enabled');
    setTimeout(() => {
        playPauseButton.classList.remove('enabled');
    }, 50);

    if(musicPlayer.paused) {
        musicPlayer.play();
    } else {
        musicPlayer.pause();
    }
}

// shortcut spacebar to play/pause
document.addEventListener('keydown', function(event) {
    // check if we're in the lyrics input
    if(document.activeElement === lyricsInput) {
        return;
    }
    if(event.keyCode === 32) {
        // if audioplayer is in focus, don't play/pause
        if(document.activeElement === musicPlayer) {
            return;
        }

        playPause();

        // prevent spacebar from scrolling down
        event.preventDefault();
    }
});

// parse lyrics
const lyricsInput = document.getElementById('lyrics-input');
const lyricsContent = document.getElementById('lyrics-content');

function importJSON() {
    var input = document.createElement('input');
    input.type = 'file';
    input.click();

    importedJSON = true;

    input.addEventListener('change', function() {
        const file = this.files[0];
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = function(evt) {
            const json = JSON.parse(evt.target.result);

            // clear lyricsContent
            lyricsContent.innerHTML = '';
            
            // for each word, add a <p> when isLineEnding is 1
            json.forEach(word => {
                if(word.isLineEnding === 1) {
                    const p = document.createElement('p');
                    p.classList.add('lyrics-line');
                    lyricsContent.appendChild(p);
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

            // replace element in currentLyrics with element from lyricsContent
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
}

function parseLyrics() {
    if (lyricsInput.value.trim() === '') {
        return;
    }

    let jsonText = null;

    lyricsContent.innerHTML = '';

    // for each line, add a <p> tag in the lyrics-content div
    const lines = lyricsInput.value.split('\n');
    lines.forEach(line => {
        const p = document.createElement('p');
        p.classList.add('lyrics-line');
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
        lyricsContent.appendChild(p);
    });
}

// next word
function nextWord() {
    const NextWordButton = document.getElementById('nextword-button');

    NextWordButton.classList.add('enabled');
    setTimeout(() => {
        NextWordButton.classList.remove('enabled');
    }, 50);

    // get time of musicPlayer in milliseconds
    const time = musicPlayer.currentTime * 1000;


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
    const lyricsContent = document.getElementById('lyrics-content');
    lyricsContent.scrollTop = currentWord.offsetTop - lyricsContent.offsetTop - 100;

    // if there is no next word, remove class current-word from last word
    if(!nextWord) {
        setTimeout(() => {
            currentWord.classList.remove('current-word');
            currentWord.classList.add('done-word');
        }, 500);
    }
}

// when enter is pressed, call nextWord()
document.addEventListener('keydown', function(event) {
    // check if we're in the lyrics input
    if(document.activeElement === lyricsInput) {
        return;
    }
    if(event.keyCode === 13) {
        // prevent default
        event.preventDefault();

        nextWord();
    }
});

function exportJSON() {
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

    // make pretty JSON
    const json = JSON.stringify(currentLyrics, null, 4);

    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename + '.json';
    a.click();
}

function exportLRC() {
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename + '.lrc';
    a.click();
}


function exportELRC() {
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename + '.lrc';
    a.click();
}

function msToTime(duration) {
    let milliseconds = parseInt((duration%1000)/10);
    let seconds = parseInt((duration/1000)%60);
    let minutes = parseInt((duration/(1000*60))%60);

    milliseconds = (milliseconds < 10) ? '0' + milliseconds : milliseconds;
    seconds = (seconds < 10) ? '0' + seconds : seconds;
    minutes = (minutes < 10) ? '0' + minutes : minutes;

    return minutes + ':' + seconds + '.' + milliseconds;
}

let played_word = '';

// playback
setInterval(() => {
    // TODO : opti

    if(musicPlayer.paused) {
        document.getElementById('lyrics-content').classList.add('paused');
    }
    else {
        document.getElementById('lyrics-content').classList.remove('paused');
    }

    const time = musicPlayer.currentTime * 1000;
    
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

    const nextLyricsLine = lyricsLine.nextSibling;
    if (nextLyricsLine !== null) {
        nextLyricsLine.classList.add('next-playing-line');
    }
}, 30);

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
        musicPlayer.currentTime = word.time / 1000;
    }
});

let selectedWordIndex = -1;

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
    musicPlayer.currentTime = word.time / 1000;
}

// on properties-start change
document.getElementById('properties-start').addEventListener('change', function(event) {
    if (selectedWordIndex === -1) {
        return;
    }
    currentLyrics[selectedWordIndex].time = parseInt(event.target.value);
});

// on properties-length change
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

// on properties-preview click
document.getElementById('properties-preview').addEventListener('click', function(event) {
    const word = currentLyrics[selectedWordIndex];
    musicPlayer.currentTime = word.time / 1000;
    musicPlayer.play();

    // stop preview after duration
    setTimeout(() => {
        musicPlayer.pause();
    }, word.duration);
});

function previewToggle() {
    document.getElementById('lyrics-content').classList.toggle('preview');

    if (document.querySelector('#preview-mode').innerHTML == 'Preview mode') {
        document.querySelector('#preview-mode').innerHTML = 'Edit mode';
    }
    else {
        document.querySelector('#preview-mode').innerHTML = 'Preview mode';
    }
}

function unselect() {
    selectedWordIndex = -1;
    document.querySelectorAll('.opened-word').forEach(word => {
        word.classList.remove('opened-word');
    });

    document.getElementById('properties-word').innerText = '';
    document.getElementById('properties-start').value = 0;
    document.getElementById('properties-length').value = 0;
}

// on dom fully loaded
window.addEventListener('load', function() {
    document.getElementById('loading').style.display = 'none';
});