/**
 * @param {string} [tagName]
 * @param {any} [props]
 * @param {any} [children]
 * @returns {HTMLElement}
 */
const h = (tagName = 'div', props, children) => {
    const elm = document.createElement(tagName);
    if (props) {
        const { dataset, ...restAttributes } = props;
        // Object.assign(elm.attributes, restAttributes);
        for (let [key, val] of Object.entries(restAttributes)) {
            if (key in elm) {
                // eslint-disable-next-line security/detect-object-injection
                elm[key] = val;
            } else {
                elm.setAttribute(key, val);
            }
        }
        if (dataset) {
            Object.assign(elm.dataset, dataset);
        }
    }

    if (!Array.isArray(children)) children = [children];
    elm.append(...children);

    return elm;
};

export default h;
