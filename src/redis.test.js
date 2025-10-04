import test from 'ava';
import esmock from 'esmock';
import ioredis from 'ioredis-mock';

const answerText = '<h1>Mata Hari</h1><p>test test</p>';
/** @type {import('./redis.js')} */
const { GAMES, serializeGame, unserializeGame, createGame, getGameById } =
    await esmock('./redis.js', {
        ioredis,
        './getWikipediaArticleTitleOfTheDay.js': async () => 'Mata Hari',
        './download_wikipedia_article.js': async () => answerText,
    });

test('createGame()', async (t) => {
    const game = await createGame('createGame-test');
    /** @type {Partial<Game>} */
    const expected = {
        answerText,
        solution: 'Mata Hari',
        solutionWords: ['mata', 'hari'],
        playerEmojis: new Map(),
    };

    t.like(game, expected);

    GAMES.clear();
    const game2 = await getGameById('createGame-test');
    t.like(game2, expected, 'getGameById() can fetch from redis');
});

test('serializing and unserializing', async (t) => {
    /** @type {any} */
    const game = {
        answerText: '<html>',
        solution: 'Mata Hari',
        solutionWords: ['mata', 'hari'],
        playerEmojis: new Map([
            ['abc', '🚀'],
            ['def', '🐸'],
        ]),
    };

    t.deepEqual(unserializeGame(serializeGame(game)), game);
});
