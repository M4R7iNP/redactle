// @ts-check
import { readFileSync } from 'node:fs';
import blessed from 'blessed';
import { splitText, normalize } from './sladd.js';
import { getLemmas } from './lemma.js';
import TOP_WORDS from './top_words.js';

/**
 * @param {string} realText
 * @param {string[]} [guessedWords]
 * @returns {[string, Map<string, number>]}
 */
const sladd = (realText, guessedWords = []) => {
    let redactedText = '';
    const guessedWordOccurrences = new Map([]);
    splitText(
        realText,
        (match) => {
            const wordNormalized = normalize(match.toLowerCase());
            if (TOP_WORDS.includes(wordNormalized)) {
                redactedText += match;
            }
            if (guessedWords.includes(wordNormalized)) {
                if (!guessedWordOccurrences.has(wordNormalized)) {
                    guessedWordOccurrences.set(wordNormalized, 0);
                }
                guessedWordOccurrences.set(
                    wordNormalized,
                    guessedWordOccurrences.get(wordNormalized) + 1
                );
                redactedText += `{bold}{green-bg}${match}{/green-bg}{/bold}`;
            }
            redactedText += match.replace(/./gu, '█');
        },
        (match) => {
            redactedText += match;
        }
    );

    return [redactedText, guessedWordOccurrences];
};

const real_text = readFileSync('mata_hari_real.txt', 'utf8');
let [redacted_text, guessed_word_occurrences] = sladd(real_text);

const SOLUTION = real_text.split('\n')[0].trim().toLowerCase().split(/\s+/g);

/**
 * @typedef {{ word: string; lemmas: string[]; occurrences: number; occurred_lemmas: string[] }} Guess
 */

/** @type {Guess[]} */
const GUESSES = [];

/**
 * @param {string[]} guessed_words
 * @returns {boolean}
 */
const hasGuessedSolution = (guessed_words) => {
    return (
        SOLUTION.filter((word) => !guessed_words.includes(word.toLowerCase()))
            .length === 0
    );
};

const screen = blessed.screen({
    smartCSR: true,
    // input,
    // output,
});

const box = blessed.box({
    parent: screen,
    width: '90%',
    mouse: true,
    // height: '100%-5',
    top: 0,
    left: 0,
    tags: true,
    border: {
        type: 'line',
    },
    style: {
        fg: 'white',
        scrollbar: {
            bg: 'red',
            fg: 'blue',
        },
    },
    alwaysScroll: true,
    scrollable: true,
    // scrollbar: true,
});

const guessesBox = blessed.text({
    parent: screen,
    width: '10%',
    // height: '100%',
    top: 0,
    right: 0,
    tags: true,
    border: {
        type: 'line',
    },
});

const inputBox = blessed.textbox({
    parent: screen,
    keys: true,
    mouse: true,
    inputOnFocus: true,
    width: '100%',
    height: 3,
    left: 0,
    bottom: 0,
    // content: 'Hello {bold}world{/bold}!',
    tags: true,
    border: {
        type: 'line',
    },
    style: {
        fg: 'white',
        // bg: 'magenta',
        hover: {
            bg: 'green',
        },
    },
});

box.setContent(redacted_text);

screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    process.exit(0);
});
inputBox.key(['escape', 'C-c'], function (ch, key) {
    process.exit(0);
});

const scrollHandler = function (ch, key) {
    let scrollBy = 1;
    if (key.name.startsWith('page')) {
        if (typeof box.height == 'number') {
            scrollBy = Math.floor(box.height / 2);
        }
    }
    const direction = key.name.endsWith('up') ? -1 : 1;
    box.scroll(scrollBy * direction);
    screen.render();
};
screen.key(['down', 'pagedown', 'up', 'pageup'], scrollHandler);
inputBox.key(['down', 'pagedown', 'up', 'pageup'], scrollHandler);

/*
screen.on('keypress', (letter) => {
    const isLetter = /^[\wæøå]$/iu.test(letter);
    if (isLetter) {
        input += letter;
        inputBox.setContent(input);
        screen.render();
        // console.log('letter', letter);
    }
});

screen.key(['backspace'], () => {
    input = input.slice(0, input.length - 1);
    inputBox.setContent(input);
    screen.render();
});
*/

const renderGuessesBox = () => {
    guessesBox.setContent(
        GUESSES.map((guess) => {
            let { word, occurrences, occurred_lemmas } = guess;
            if (occurrences > 0 && !occurred_lemmas.includes(word)) {
                word = occurred_lemmas[0];
            }
            // const occurrences = guessed_word_occurrences.get(word) || 0;
            let color = 'red';
            if (occurrences > 0) {
                color = 'green';
            }
            return `{${color}-bg}${word}{/${color}-bg} {|}(${occurrences})`;
        })
            .reverse()
            .join('\n')
    );
};

// screen.key(['enter'], () => {
inputBox.on('submit', async () => {
    let input = inputBox.getValue().toLowerCase();
    if (!input) {
        return;
    }

    const guessed_words_with_lemmas = GUESSES.map((guess) => guess.lemmas).flat(
        1
    );

    if (guessed_words_with_lemmas.includes(input)) {
        inputBox.clearValue();
        inputBox.focus();
        screen.render();
        return;
    }

    // input = normalize(input);
    const lemmas = await getLemmas(input);
    /** @type {Guess} */
    const guess = {
        word: input,
        lemmas: lemmas.length ? lemmas : [input],
        occurrences: 0,
        occurred_lemmas: [],
    };
    GUESSES.push(guess);
    inputBox.setValue('');
    guessed_words_with_lemmas.push(...guess.lemmas);

    [redacted_text, guessed_word_occurrences] = sladd(
        real_text,
        guessed_words_with_lemmas
    );
    for (const word of guess.lemmas) {
        const occurrences = guessed_word_occurrences.get(word);
        if (occurrences > 0) {
            guess.occurrences += occurrences;
            guess.occurred_lemmas.push(word);
        }
    }

    renderGuessesBox();

    if (hasGuessedSolution(guessed_words_with_lemmas)) {
        box.setContent(real_text);
        screen.render();
        return;
    }

    box.setContent(redacted_text);
    inputBox.focus();
    screen.render();
});

// screen.append(box);
// screen.append(inputBox);
// box.focus();
inputBox.focus();
screen.render();
