export interface AlienMap {
    aliens: {[key: string]: Alien};
}

export interface Alien {
    name: string;
    corePrompt: string;
    evolutions: {[key: string]: Evolution};
}

export interface Evolution {
    description: string;
    contentLevelDescriptions: {[key: string]: string};
}