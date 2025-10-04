/* istanbul ignore file */
import fetch from 'node-fetch';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { filter } from 'unist-util-filter';

/**
 * @typedef {{
 *  parse: { title: string; pageid: number; text: { "*": string; }; };
 * }} WikipediaResponse
 */

/**
 * @param {string} title
 * @returns {Promise<string>}
 */
export default async function downloadWikipediaArticle(title) {
    const url = `https://no.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=${encodeURIComponent(
        title.replace(' ', '_'),
    )}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'node-fetch (+martin@m4r7.in)',
        },
    });

    if (!res.ok) {
        throw new Error(
            `Failed to download Wikipedia article: ${res.status} ${res.statusText}`,
        );
    }

    /** @type {WikipediaResponse} */
    const data = await res.json();

    const html = `<h1>${data.parse.title}</h1>${data.parse.text['*']}`;

    const file = await unified()
        .use(rehypeParse, { fragment: true })
        .use(
            () => (tree) =>
                filter(tree, { cascade: false }, (node) => {
                    const { tagName } = node;
                    const { className = '', id = '' } = node.properties || {};
                    return (
                        !className.includes('noexcerpt') &&
                        !className.includes('reference') &&
                        !className.includes('mw-editsection') &&
                        id != 'toc' &&
                        !(
                            tagName === 'table' && className.includes('infobox')
                        ) &&
                        !className.includes('mw-references-wrap')
                    );
                }),
        )
        .use(rehypeSanitize, {
            ...defaultSchema,
            strip: ['script', 'style', ['className', 'infobox']],
            attributes: {
                ...defaultSchema.attributes,
                span: ['style'],
            },
            tagNames: [
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'p',
                'span',
                'strong',
                'i',
                'b',
                'ul',
                'ol',
                'li',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
            ],
            allowComments: false,
        })
        .use(rehypeStringify)
        .process(html);

    return file.value;
}
