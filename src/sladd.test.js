import test from 'ava';
import { splitText, normalize, sladdHtml } from './sladd.js';

test('sladdHtml(Mata Hari)', async (t) => {
    // Excerpt from https://no.wikipedia.org/wiki/Mata_Hari (CC BY-SA)
    const mata_hari = `<h1><span>Mata Hari</span></h1><p><b>Margaretha Geertruida Zelle</b> (født 7. august 1876 i Leeuwarden, Nederland, død 15. oktober 1917 Vincennes, Frankrike), kjent under kunstnernavnet <b>Mata Hari</b>, var en nederlandsk danser og påstått spion. Hun hevdet hun var en javanesisk prinsesse. I 1914 bodde hun i Frankrike der hun var venn med politikere og offiserer fra begge sider i krigen, før hun i 13. februar 1917 ble arrestert og 15. oktober ble henrettet ved skyting i Vincennes. Det har senere blitt diskutert om hun virkelig var spion eller ikke, og det er også blitt påstått at hun var kontraspion.</p>`;
    t.snapshot(await sladdHtml(mata_hari));
});

test('normalize()', async (t) => {
    const cases = [
        ['Mata', 'mata'],
        ['Hari', 'hari'],
        ['Réunion', 'reunion'],
        ['Straßenbahn', 'strassenbahn'],
    ];
    for (const [input, expected] of cases) {
        t.is(normalize(input), expected);
    }
});

test('splitText(Mata Hari)', async (t) => {
    const words = [];
    const spacingOrSymbols = [];
    splitText(
        'Mata Hari',
        (word) => words.push(word),
        (match) => spacingOrSymbols.push(match),
    );
    t.deepEqual(words, ['Mata', 'Hari']);
    t.deepEqual(spacingOrSymbols, ['', ' ', '']);
});

test('splitText(Martin er best, ingen protest!!!)', async (t) => {
    const words = [];
    const spacingOrSymbols = [];
    splitText(
        'Martin er best, ingen protest!!!',
        (word) => words.push(word),
        (match) => spacingOrSymbols.push(match),
    );
    t.deepEqual(words, ['Martin', 'er', 'best', 'ingen', 'protest']);
    t.deepEqual(spacingOrSymbols, ['', ' ', ' ', ', ', ' ', '!!!']);
});
