import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Alien, Evolution} from "./Alien";
import aliens from './assets/aliens.json';

type MessageStateType = any;

type ConfigType = any;

type InitStateType = any;

type ChatStateType = any;

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    readonly defaultAlien: string = 'Random';
    readonly defaultPacing: string = 'Deliberate';
    readonly defaultSexLevel: string = 'Rakish';
    readonly defaultViolenceLevel: string = 'Bloody';
    readonly defaultEvolution: Evolution = {
        description: '',
        sexLevelDescriptions: {},
        violenceLevelDescriptions: {}
    }
    readonly pacingMap: {[key: string]: number} = {
        "Glacial": 1, 
        "Plodding": 3,
        "Deliberate": 5,
        "Brisk": 7,
        "Harrowing": 9
    }
    readonly sexLevelMap: {[key: string]: number} = {
        "Chaste": 0,
        "Rakish": 1,
        "Debaucherous": 2,
        "Depraved": 3
    }
    readonly violenceLevelMap: {[key: string]: number} = {
        "Nerf": 0,
        "Bloody": 1,
        "Grisly": 2
    }
    readonly climaxPrompt: string = 'Though the situation is dire, the narrative (or other characters) may present clever, daring, climactic opportunities to finally defeat the alien menace once and for all.';
    
    escalation: number = 0;
    alienMap: {[key: string]: Alien};
    sexLevelDescriptions: {[key: string]: string};
    violenceLevelDescriptions: {[key: string]: string};
    alien: Alien;
    pacing: number;
    sexLevel: number;
    violenceLevel: number;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {

        super(data);
        const {
            characters,         // @type:  { [key: string]: Character }
            users,                  // @type:  { [key: string]: User}
            config,                                 //  @type:  ConfigType
            messageState,                           //  @type:  MessageStateType
            environment,                     // @type: Environment (which is a string)
            initState,                             // @type: null | InitStateType
            chatState                              // @type: null | ChatStateType
        } = data;
        this.alienMap = aliens.aliens;
        this.sexLevelDescriptions = aliens.sexLevelDescriptions;
        this.violenceLevelDescriptions = aliens.violenceLevelDescriptions;
        const alienKeys = Object.keys(this.alienMap);
        this.alien = (config ? this.alienMap[config.alien] : null) ?? 
                (chatState && chatState['alien'] ? this.alienMap[chatState['alien']] : null) ?? 
                this.alienMap[this.defaultAlien] ?? 
                this.alienMap[alienKeys[Math.floor(Math.random() * alienKeys.length)]];
        this.pacing = (config ? this.pacingMap[config.pacing] : null) ?? this.pacingMap[this.defaultPacing];
        this.sexLevel = (config ? this.sexLevelMap[config.sex_level] : null) ?? this.sexLevelMap[this.defaultSexLevel];
        this.violenceLevel = (config ? this.violenceLevelMap[config.violence_level] : null) ?? this.violenceLevelMap[this.defaultViolenceLevel];
        console.log("Configuration values loaded:");
        console.log(config);
        if (messageState) {
            this.setFromMessageState(messageState);
        }
        console.log("Current alien archetype:" + this.alien.name);
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        return {
            success: true,
            error: null,
            initState: null,
            chatState: this.buildChatState(),
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        this.setFromMessageState(state);
    }

    setFromMessageState(messageState: MessageStateType) {
        if (messageState != null) {
            this.escalation = messageState['escalation'] ?? 0;
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        this.escalation += this.pacing;
        return {
            stageDirections: this.getAlienPrompt(),
            messageState: this.buildMessageState(),
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: this.buildChatState(),
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        return {
            stageDirections: null,
            messageState: this.buildMessageState(),
            modifiedMessage: null,
            error: null,
            systemMessage: null,
            chatState: this.buildChatState()
        };
    }


    render(): ReactElement {
        return <div style={{
            width: '100vw',
            height: '100vh',
            display: 'grid',
            alignItems: 'stretch'
        }}>
        </div>;
    }

    getAlienPrompt(): string {
        if (!this.alien) {
            return '';
        }
        let evolution: Evolution = this.getEvolution();
        let prompt = `[${this.alien.corePrompt} ${evolution.description} ${this.escalation > 75 ? this.climaxPrompt : ''} ${this.getSexLevelDescription()} ${this.getViolenceLevelDescription()}]`;
        console.log(`Alien: ${this.alien.name}\nEscalation Score: ${this.escalation}\nPrompt: ${prompt}`);
        return prompt;
    }

    getEvolution(): Evolution {
        if (!this.alien || !this.alien.evolutions) {
            return this.defaultEvolution;
        }
        return this.getBestMatch(this.alien.evolutions, this.escalation) ?? this.defaultEvolution;
    }

    getSexLevelDescription(): string {
        if (!this.alien) {
            return '';
        }

        return `${this.getBestMatch(this.sexLevelDescriptions, this.sexLevel)} ${this.getBestMatch(this.getEvolution().sexLevelDescriptions, this.sexLevel) ?? ''}`;
    }

    getViolenceLevelDescription(): string {
        if (!this.alien) {
            return '';
        }

        return `${this.getBestMatch(this.violenceLevelDescriptions, this.violenceLevel)} ${this.getBestMatch(this.getEvolution().violenceLevelDescriptions, this.violenceLevel) ?? ''}`;
    }

    getBestMatch<Type>(targetMap: {[key: string]: Type}|undefined, value: number): Type|undefined {
        return !targetMap ? undefined : targetMap[
            Math.max(...Object.keys(targetMap ?? {}).map(Number).filter(key => key <= value))];
    }

    buildMessageState(): {[key: string]: any} {
        return {'escalation': this.escalation};
    }

    buildChatState(): {[key: string]: any} {
        return {'alien': this.alien.name};
    }
}
