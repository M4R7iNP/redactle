// @ts-check
import h from './h.js';
import RedactedWord from './RedactedWord.js';

let GUESSES = [];

if (window.customElements) {
    customElements.define('redacted-word', RedactedWord);
}

/**
 * @param {ClientGuess[]} guesses
 * @void
 */
function renderGuesses(guesses) {
    const guessesElm = document.querySelector('#guesses');
    guessesElm.innerHTML = '';
    for (const guess of guesses.slice().reverse()) {
        const { word, occurrences, occurredLemmas } = guess;
        let word_to_show = word;
        if (occurrences > 0 && !occurredLemmas.includes(word_to_show)) {
            word_to_show = occurredLemmas[0];
        }

        const isCorrectGuess = occurrences > 0;
        const row = h(
            'div',
            {
                className: 'row',
                role: isCorrectGuess ? 'button' : null,
                dataset: { word: word },
            },
            [
                guess.emoji
                    ? h(
                          'span',
                          {
                              className: 'guesser',
                          },
                          guess.emoji
                      )
                    : '',
                h(
                    'span',
                    {
                        className: `guess ${
                            isCorrectGuess ? 'correct' : 'wrong'
                        }`,
                    },
                    word_to_show
                ),
                h('span', { className: 'occurrences' }, `(${occurrences})`),
            ]
        );
        guessesElm.append(row);
    }
}

const EMOJIS = [
    '😂', // cry-laugh
    '🙃', // upside-down
    '🦄', // unicorn
    '🐴', // horse
    '🤓', // nerd
    '😎', // sunglasses
    '🎉', // party
    '🌈', // rainbow
    '✨', // sparkles
    '🚂', // locomotive
    '🚀', // rocket
    '🐶', // doggo
    '🦝', // raccoon
    '🦊', // fox
    '🐱', // cat
    '🐸', // frog
];
const getRandomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
/** @param {string} emoji */
const setEmoji = (emoji) => {
    localStorage.setItem('emoji', emoji);
};
const getEmoji = () => {
    let emoji = localStorage.getItem('emoji');
    if (!emoji) {
        emoji = getRandomEmoji();
        setEmoji(emoji);
    }
    return emoji;
};
const getPlayerId = () => {
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
        playerId = Math.random().toString(16).substring(2);
        localStorage.setItem('playerId', playerId);
    }
    return playerId;
};

let ws;

const connect = () => {
    const qs = new URLSearchParams();
    qs.set('gameId', gameId);
    qs.set('emoji', getEmoji());
    qs.set('playerId', getPlayerId());
    ws = new WebSocket(`wss://redactle.darthvader.no/ws?${qs.toString()}`);
    ws.addEventListener('message', (ev) => {
        const data = JSON.parse(ev.data);
        console.log(data);
        if (data.action === 'GAME_STATE') {
            /** @type {{ guesses: ClientGuess[] }} */
            const { guesses } = data;
            document.querySelector('#game').innerHTML = data.redactedState;
            renderGuesses((GUESSES = guesses));

            for (const guess of guesses) {
                for (const [
                    variationIdx,
                    wordIds,
                ] of guess.variationWordIds.entries()) {
                    // eslint-disable-next-line security/detect-object-injection
                    const variation = guess.variations[variationIdx];
                    for (const wordId of wordIds) {
                        /** @type {RedactedWord} */
                        const elm = document.querySelector(
                            `redacted-word[data-word-id="${wordId}"]`
                        );
                        elm.setAttribute('data-word', variation);
                    }
                }
            }
        } else if (data.action === 'GUESS') {
            const { guess } = data;
            GUESSES.push(guess);
            for (const [
                variationIdx,
                wordIds,
            ] of guess.variationWordIds.entries()) {
                // eslint-disable-next-line security/detect-object-injection
                const variation = guess.variations[variationIdx];
                for (const wordId of wordIds) {
                    /** @type {RedactedWord} */
                    const elm = document.querySelector(
                        `redacted-word[data-word-id="${wordId}"]`
                    );
                    elm.setAttribute('data-word', variation);
                    elm.render();
                }
            }
            renderGuesses(GUESSES);
        }
    });

    ws.addEventListener('close', () => {
        setTimeout(() => {
            connect();
        }, 1000);
    });
};

const qs = new URLSearchParams(window.location.search);
let gameId = qs.get('gameId');
if (!gameId) {
    gameId = Math.random().toString(16).substring(2);
    window.history.pushState('_', '', `/?gameId=${encodeURIComponent(gameId)}`);
}

connect();

/** @type {HTMLInputElement} */
const promptElm = document.querySelector('#prompt');
/** @type {HTMLFormElement} */
const promptFormElm = document.querySelector('#promptForm');
promptFormElm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    /** @type {{ value: string }} */
    const { value } = promptElm;
    if (value.startsWith('/')) {
        if (value.startsWith('/emoji ')) {
            const emoji = value.substring(7).trim();
            setEmoji(emoji);
            changeAvatarButton.textContent = emoji;
            ws.send(JSON.stringify({ action: 'SET_EMOJI', emoji }));
        }
    } else {
        ws.send(JSON.stringify({ action: 'GUESS', word: value }));
    }
    promptElm.value = '';
    promptElm.focus();
});
promptElm.focus();
promptElm.addEventListener(
    'keydown',
    /**
     * @param {KeyboardEvent} ev
     */
    (ev) => {
        if (
            !promptElm.value.startsWith('/') &&
            /^[ ,.!@#$%^&*(){}[\]\\"'-]$/.test(ev.key)
        ) {
            ev.preventDefault();
        }
    }
);

promptElm.addEventListener('keyup', () => {
    /** @type {HTMLInputElement} */
    const charCounterElm = document.querySelector('#promptCharCounter');
    charCounterElm.value = promptElm.value.length.toString();
});

document.querySelector('#scrollToTop').addEventListener('click', () => {
    document.scrollingElement.scrollTo({
        behavior: 'smooth',
        top: 0,
    });
});

const changeAvatarButton = document.querySelector('#changeAvatar');
changeAvatarButton.addEventListener('click', () => {
    const emoji = getRandomEmoji();
    promptElm.value = `/emoji ${emoji}`;
});
changeAvatarButton.textContent = getEmoji();

let LAST_CLICKED_GUESS_WORD;
let LAST_CLICKED_WORD_ID;

document.querySelector('#guesses').addEventListener(
    'click',
    /**
     * @param {MouseEvent & { target: HTMLElement }} ev
     */
    (ev) => {
        const guessElm = ev.target.closest('div[role="button"][data-word]');
        if (!guessElm) {
            return;
        }
        const guess = GUESSES.find(
            (guess) => guess.word === guessElm.getAttribute('data-word')
        );

        if (LAST_CLICKED_GUESS_WORD !== guess.word) {
            LAST_CLICKED_WORD_ID = null;
        }

        let wordIdToClick;

        for (let idx = 0; idx < guess.variationWordIds.length; idx++) {
            // eslint-disable-next-line security/detect-object-injection
            const variationWordIds = guess.variationWordIds[idx];
            if (!LAST_CLICKED_WORD_ID) {
                wordIdToClick = variationWordIds[0];
                break;
            }

            let lastClickedWordIdIdx =
                variationWordIds.indexOf(LAST_CLICKED_WORD_ID);
            if (lastClickedWordIdIdx !== -1) {
                let nextIdx = lastClickedWordIdIdx + 1;
                // eslint-disable-next-line security/detect-object-injection
                wordIdToClick = variationWordIds[nextIdx];
                if (nextIdx >= variationWordIds.length) {
                    LAST_CLICKED_WORD_ID = undefined;
                    if (idx === guess.variationWordIds.length - 1) {
                        idx = -1;
                    }
                    continue;
                }
                break;
            }
        }

        const elmToFocus = document.querySelector(
            `#game .guess.correct[data-word-id="${wordIdToClick}"]`
        );
        LAST_CLICKED_WORD_ID = wordIdToClick;
        LAST_CLICKED_GUESS_WORD = guess.word;
        document
            .querySelectorAll('.guess.focused')
            .forEach((elm) => elm.classList.remove('focused'));
        elmToFocus.classList.add('focused');
        // elmToFocus.focus();
        elmToFocus.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
);

document.body.addEventListener(
    'click',
    /**
     * @param {MouseEvent & { target: HTMLElement }} ev
     */
    (ev) => {
        const redactedWord = ev.target.closest('redacted-word.clickable');
        if (!redactedWord) {
            return;
        }
        redactedWord.classList.toggle('show-word-length');
    }
);

setInterval(() => {
    ws.send('PING');
}, 10000);
