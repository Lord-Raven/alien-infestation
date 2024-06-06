export interface AlienData {
    aliens: {[key: string]: Alien};
    sexLevelDescriptions: {[key: string]: string};
    violenceLevelDescriptions: {[key: string]: string};
}

export interface Alien {
    name: string;
    corePrompt: string;
    evolutions: {[key: string]: Evolution};
}

export interface Evolution {
    description: string;
    sexLevelDescriptions?: {[key: string]: string};
    violenceLevelDescriptions?: {[key: string]: string};
}