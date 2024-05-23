export interface AlienMap {
    aliens: {[key: string]: Alien};
}

export interface Alien {
    name: string;
    corePrompt: string;
    evolutions: {[key: string]: string};
}