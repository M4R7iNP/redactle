export default class GuessListRow extends HTMLElement {
    static observedAttributes = ['data-emoji', 'data-word', 'data-occurrences'];

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const word = this.getAttribute('data-word');
        const { classList } = this;
        if (word) {
            this.textContent = word;
            classList.add('guess', 'correct');
            classList.remove('clickable', 'show-word-length');
        } else {
            this.textContent = '█'.repeat(
                parseInt(this.getAttribute('data-length'))
            );
            classList.add('clickable');
        }
    }
}
