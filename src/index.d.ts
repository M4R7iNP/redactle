interface Guess {
    word: string;
    occurrences: number;
    occurredLemmas: string[];
    playerId: string;
    /**
     * occurred variations of word (lemmas, casing etc)
     */
    variations?: string[];
    /**
     * each variation as an array of word ids
     */
    variationWordIds?: number[][];
}

// Guess, but sent to the clients
interface ClientGuess extends Omit<Guess, 'playerId'> {
    emoji: string;
}

interface Game {
    answerText: string;
    redactedState: string;
    words: string[]; // case sensitive list of words
    guesses: Guess[];
    solution: string;
    solutionWords: string[]; // normalized array of words
    // playerIds: string;
    playerEmojis: Map<string, string>;
}
