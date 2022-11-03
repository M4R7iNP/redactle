import Redis from 'ioredis';
import { sladdHtml, normalize, splitText } from './sladd.js';
import downloadWikipediaArticle from './download_wikipedia_article.js';
import getWikipediaArticleTitleOfTheDay from './getWikipediaArticleTitleOfTheDay.js';
import TOP_WORDS from './top_words.js';

export const redis = new Redis({
    port: 6379,
    keyPrefix: 'redactle:production:',
    password: process.env.REDIS_PASSWORD,
    // lazyConnect: true,
    enableOfflineQueue: true,
});

export const GAMES = new Map([]);

/**
 * @param {Game} game
 * @return {string}
 */
export function serializeGame(game) {
    return JSON.stringify({
        ...game,
        playerEmojis: Array.from(game.playerEmojis.entries()),
    });
}

/**
 * @param {string} gameStr
 * @return {Game}
 */
export function unserializeGame(gameStr) {
    const game = JSON.parse(gameStr);
    game.playerEmojis = new Map(game.playerEmojis || []);

    return game;
}

/**
 * @param {string} gameId
 * @returns {Promise<Game>}
 */
export async function createGame(gameId) {
    const title = await getWikipediaArticleTitleOfTheDay();
    const answerText = await downloadWikipediaArticle(title.replace(' ', '_'));
    let { redactedText, words } = await sladdHtml(answerText);
    const solutionWords = [];
    splitText(title, (word) => {
        if (!TOP_WORDS.includes(word)) {
            solutionWords.push(normalize(word.trim().toLowerCase()));
        }
    });

    /** @type {Game} */
    const game = {
        answerText,
        redactedState: redactedText,
        words,
        guesses: [],
        solution: title,
        solutionWords,
        playerEmojis: new Map(),
    };

    updateGameById(gameId, game);

    return game;
}

/**
 * @param {string} gameId
 * @returns {Promise<Game>}
 */
export async function getGameById(gameId) {
    if (!GAMES.has(gameId)) {
        const gameJson = await redis.get(`games:${gameId}`);
        if (gameJson) {
            GAMES.set(gameId, unserializeGame(gameJson));
        }
    }
    return GAMES.get(gameId);
}

/**
 * @param {string} gameId
 * @param {Game} game
 */
export function updateGameById(gameId, game) {
    GAMES.set(gameId, game);
    redis.setex(`games:${gameId}`, 60 * 60 * 24 * 2, serializeGame(game));
}

/**
 * NOT IN USE
 * @param {string} gameId
 * @param {string} word
export const tryGuess = async (gameId, word) =>
    await redis.sismember(`games:${gameId}:word_lemmas`, word);
 */
