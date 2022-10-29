// @ts-check

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import emojiRegex from 'emoji-regex';

import { getGameById, createGame, updateGameById } from './redis.js';
import { normalize } from './sladd.js';
import { getLemmas } from './lemma.js';

/** @type {Map<string, Set<import("ws").WebSocket>>} */
const GAME_CLIENTS = new Map([]);

/**
 * @param {string} gameId
 * @param {any} data
 * @void
 */
const sendToGameClients = (gameId, data) => {
    const clientsSet = GAME_CLIENTS.get(gameId) || new Set();
    const clients = clientsSet.values();
    for (const conn of clients) {
        conn.send(data);
    }
};

/**
 * @param {string} str
 * @returns {string | undefined}
 */
const sanitizeEmoji = (str) => (emojiRegex().exec(str) || [])[0];

const server = createServer();
const wss = new WebSocketServer({
    server,
    perMessageDeflate: {
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 4,
        },
        concurrencyLimit: 10,
        threshold: 1024,
    },
});

/**
 * @param {Game} game
 * @param {string[]} guessedWords
 * @returns {boolean}
 */
const hasGuessedSolution = (game, guessedWords) =>
    game.solutionWords.every((word) =>
        guessedWords.includes(word.toLowerCase())
    );

/**
 * Format guess for websocket clients. Removes playerId and adds emoji
 *
 * @param {Game} game
 * @param {Guess} guess
 * @returns {Omit<Guess, 'playerId'> & { emoji: string }}
 */
const formatGuessForClients = (game, { playerId, ...guess }) => ({
    ...guess,
    emoji: game.playerEmojis.get(playerId),
});

wss.on('connection', async (conn, req) => {
    const qs = new URLSearchParams(req.url.replace(/^[^?]*/, ''));
    const gameId = String(qs.get('gameId'));
    const playerId = String(
        qs.get('playerId') || Math.random().toString(16).substring(2)
    );
    const emoji = sanitizeEmoji(qs.get('emoji') || '') || '🙂';
    if (!GAME_CLIENTS.has(gameId)) {
        GAME_CLIENTS.set(gameId, new Set());
    }
    GAME_CLIENTS.get(gameId).add(conn);
    sendToGameClients(
        gameId,
        JSON.stringify({ action: 'PLAYER_JOINED', emoji })
    );

    let game = (await getGameById(gameId)) ?? (await createGame(gameId));

    // set player's chosen emoji
    game.playerEmojis.set(playerId, emoji);

    // send game state to player
    conn.send(
        JSON.stringify({
            action: 'GAME_STATE',
            redactedState: game.redactedState,
            guesses: game.guesses.map((guess) =>
                formatGuessForClients(game, guess)
            ),
        })
    );

    conn.on('message', async (rawData) => {
        try {
            const rawDataStr = rawData.toString();
            if (rawDataStr === 'PING') {
                return;
            }

            const data = JSON.parse(rawDataStr);
            if (data.action === 'SET_EMOJI') {
                const game = await getGameById(gameId);
                const emoji = sanitizeEmoji(data.emoji);
                if (!emoji) {
                    return;
                }
                game.playerEmojis.set(playerId, emoji);
                updateGameById(gameId, game);
                sendToGameClients(
                    gameId,
                    JSON.stringify({
                        action: 'GAME_STATE',
                        redactedState: game.redactedState,
                        guesses: game.guesses.map((guess) =>
                            formatGuessForClients(game, guess)
                        ),
                    })
                );
                return;
            }

            if (data.action == 'GUESS') {
                if (!data.word) {
                    return;
                }

                const word = String(data.word).toLowerCase();

                let lemmas = (await getLemmas(word)).map((word) =>
                    normalize(word)
                );
                if (!lemmas?.length) {
                    lemmas = [normalize(word)];
                }

                /** @type {Guess} */
                const guess = {
                    word,
                    occurrences: 0,
                    occurredLemmas: [],
                    playerId,
                };
                const game = await getGameById(gameId);
                const existingGuess = game.guesses.find((existingGuess) =>
                    lemmas.find(
                        (newGuessLemma) => existingGuess.word === newGuessLemma
                        // existingGuess.occurredLemmas.includes(newGuessLemma)
                    )
                );
                if (existingGuess) {
                    conn.send(
                        JSON.stringify({ action: 'EXISTING_GUESS', guess })
                    );
                    return;
                }
                const guessedWordLemmas = game.guesses
                    .map((guess) => guess.occurredLemmas)
                    .flat(1);
                guessedWordLemmas.push(...lemmas);

                if (hasGuessedSolution(game, guessedWordLemmas)) {
                    // Set redactedState to answerText and emit to clients.
                    game.redactedState = game.answerText;
                    sendToGameClients(
                        gameId,
                        JSON.stringify({
                            action: 'GAME_STATE',
                            redactedState: game.redactedState,
                            guesses: game.guesses.map((guess) =>
                                formatGuessForClients(game, guess)
                            ),
                        })
                    );
                }

                // construct matches by normalized check
                guess.variations ??= [];
                guess.variationWordIds ??= [];
                const lemmasNormalized = lemmas.map((lemma) =>
                    normalize(lemma)
                );
                for (const [idx, gameWord] of game.words.entries()) {
                    const matchingNormalizedLemmaIdx = lemmasNormalized.indexOf(
                        normalize(gameWord)
                    );
                    if (matchingNormalizedLemmaIdx !== -1) {
                        guess.occurrences++;

                        // eslint-disable-next-line security/detect-object-injection
                        const lemma = lemmas[matchingNormalizedLemmaIdx];
                        if (!guess.occurredLemmas.includes(lemma)) {
                            guess.occurredLemmas.push(lemma);
                        }

                        let variationIdx = guess.variations.indexOf(gameWord);
                        if (variationIdx === -1) {
                            variationIdx = guess.variations.push(gameWord) - 1;
                        }
                        // eslint-disable-next-line security/detect-object-injection
                        (guess.variationWordIds[variationIdx] ??= []).push(idx);
                    }
                }

                game.guesses.push(guess);
                updateGameById(gameId, game);

                sendToGameClients(
                    gameId,
                    JSON.stringify({
                        action: 'GUESS',
                        guess: formatGuessForClients(game, guess),
                    })
                );
            }
        } catch (err) {
            console.error(err);
        }
    });

    conn.on('close', () => {
        const clients = GAME_CLIENTS.get(gameId);
        if (clients) {
            clients.delete(conn);
        }
    });
});

export default server;
