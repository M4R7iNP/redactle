/* istanbul ignore file */
import fetch from 'node-fetch';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { filter } from 'unist-util-filter';

/**
 * @param {string} title
 * @returns {Promise<string>}
 */
export default async function downloadWikipediaArticle(title) {
    const url = `https://no.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(
        title.replace(' ', '_')
    )}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'node-fetch (+martin@m4r7.in)',
        },
    });

    const data = await res.json();
    const html =
        `<h1>${data.lead.displaytitle}</h1>` +
        data.lead.sections
            .map((leadSection) => {
                let text = leadSection.text;
                if (!text) {
                    const remainingSection = data.remaining.sections.find(
                        (remainingSection) =>
                            remainingSection.id === leadSection.id
                    );
                    if (
                        remainingSection.anchor === 'Eksterne_lenker' ||
                        remainingSection.anchor === 'Referanser'
                    ) {
                        return '';
                    }
                    text =
                        '<h2>' +
                        remainingSection.line +
                        '</h2>' +
                        '\n' +
                        remainingSection.text;
                }
                return text.trim();
            })
            .join('\n\n');

    const file = await unified()
        .use(rehypeParse, { fragment: true })
        .use(
            () => (tree) =>
                filter(
                    tree,
                    { cascade: false },
                    (node) =>
                        !(
                            node.tagName === 'table' &&
                            node.properties.className?.includes?.('infobox')
                        ) &&
                        !node.properties?.className?.includes?.(
                            'mw-references-wrap'
                        )
                )
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
