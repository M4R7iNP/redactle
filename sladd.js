// @ts-check
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { RewritingStream } from 'parse5-html-rewriting-stream';

import TOP_WORDS from './top_words.js';

// eslint-disable-next-line security/detect-non-literal-regexp
const NORMALIZED_Å_REGEX = new RegExp(
    Buffer.from('61cc8a', 'hex').toString(),
    'g'
);

/**
 * @param {string} str
 * @returns {string}
 */
export const normalize = (str) =>
    str
        .toLowerCase()
        .normalize('NFKD')
        .replace(/ß/gu, 'ss')
        .replace(NORMALIZED_Å_REGEX, 'å')
        .replace(/\p{Diacritic}/gu, '');

const noop = () => {};

/**
 * Split text (not html)
 *
 * First callback is words, second is spacing and/or symbols
 *
 * @param {string} str
 * @param {(match: string) => void} callback
 * @param {(match: string) => void} [spacingOrSymbolsCallback]
 * @void
 */
export const splitText = (str, callback, spacingOrSymbolsCallback = noop) =>
    str
        .split(/([^\s!"#$€%&'()\\*+,./:;<=>?@[\]\\^_`’{|}~•«»-]+)/giu)
        .forEach((match, idx) => {
            idx % 2 === 1 ? callback(match) : spacingOrSymbolsCallback(match);
        });

/**
 * @param {string} html
 * @returns {Promise<{ redactedText: string; words: string[] }>}
 */
export async function sladdHtml(html) {
    const rewriter = new RewritingStream();
    const words = [];

    rewriter.on('text', (text) => {
        splitText(
            text.text,
            (match) => {
                const wordNormalized = normalize(match.toLowerCase());

                if (TOP_WORDS.includes(wordNormalized)) {
                    rewriter.emitText({ text: match });
                    return;
                }

                const idx = words.push(match) - 1;
                rewriter.emitStartTag({
                    tagName: 'redacted-word',
                    attrs: [
                        { name: 'data-word-id', value: idx.toString() },
                        { name: 'data-length', value: match.length.toString() },
                    ],
                    selfClosing: false,
                });
                rewriter.emitEndTag({ tagName: 'redacted-word' });
            },
            (text) => {
                rewriter.emitText({ text });
            }
        );
    });

    const redacted = await pipeline(
        Readable.from(html),
        rewriter,
        async (stream) => {
            let html = '';
            for await (const chunk of stream) {
                html += chunk;
            }
            return html;
        }
    );

    return {
        redactedText: redacted.toString(),
        words: Array.from(words),
    };
}
