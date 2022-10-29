import t from 'tap';
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

t.test('createGame()', async (t) => {
    const game = await createGame('createGame-test');
    /** @type {Game} */
    const expected = {
        answerText,
        solution: 'Mata Hari',
        solutionWords: ['mata', 'hari'],
        playerEmojis: new Map(),
    };

    t.has(game, expected);

    t.test('getGameById() can fetch from redis', async (t) => {
        GAMES.clear();
        const game = await getGameById('createGame-test');
        t.has(game, expected);
    });
});

t.test('serializing and unserializing', async (t) => {
    /** @type {Game} */
    const game = {
        answerText: '<html>',
        solution: 'Mata Hari',
        solutionWords: ['mata', 'hari'],
        playerEmojis: new Map([
            ['abc', '🚀'],
            ['def', '🐸'],
        ]),
    };

    t.same(unserializeGame(serializeGame(game)), game);
});
