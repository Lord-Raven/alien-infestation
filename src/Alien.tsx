export interface AlienMap {
    aliens: {[key: string]: Alien};
}

export interface Alien {
    name: string;
    evolutions: {[key: string]: string};
}