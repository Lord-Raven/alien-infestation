import {ReactElement} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import {Alien, Aliens, Evolution} from "./Alien";
import aliens from './assets/aliens.json';

/***
 The type that this stage persists message-level state in.
 This is primarily for readability, and not enforced.

 @description This type is saved in the database after each message,
  which makes it ideal for storing things like positions and statuses,
  but not for things like history, which is best managed ephemerally
  in the internal state of the Stage class itself.
 ***/
type MessageStateType = any;

/***
 The type of the stage-specific configuration of this stage.

 @description This is for things you want people to be able to configure,
  like background color.
 ***/
type ConfigType = any;

/***
 The type that this stage persists chat initialization state in.
 If there is any 'constant once initialized' static state unique to a chat,
 like procedurally generated terrain that is only created ONCE and ONLY ONCE per chat,
 it belongs here.
 ***/
type InitStateType = any;

/***
 The type that this stage persists dynamic chat-level state in.
 This is for any state information unique to a chat,
    that applies to ALL branches and paths such as clearing fog-of-war.
 It is usually unlikely you will need this, and if it is used for message-level
    data like player health then it will enter an inconsistent state whenever
    they change branches or jump nodes. Use MessageStateType for that.
 ***/
type ChatStateType = any;

/***
 A simple example class that implements the interfaces necessary for a Stage.
 If you want to rename it, be sure to modify App.js as well.
 @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/stage.ts
 ***/
export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    readonly defaultAlienKey: string = 'shoggoth';
    readonly defaultPacing: string = 'Deliberate';
    readonly defaultSexLevel: string = 'Rakish';
    readonly DefaultViolenceLevel: string = 'Bloody';
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
        "Gorey": 2
    }
    
    escalation: number = 0;
    alienKey: string = this.defaultAlienKey;
    alienMap: {[key: string]: Alien};
    sexLevelDescriptions: {[key: string]: string};
    violenceLevelDescriptions: {[key: string]: string};
    alien: Alien;
    pacing: number;
    sexLevel: number;
    violenceLevel: number;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {
        /***
         This is the first thing called in the stage,
         to create an instance of it.
         The definition of InitialData is at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/initial.ts
         Character at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/character.ts
         User at @link https://github.com/CharHubAI/chub-stages-ts/blob/main/src/types/user.ts
         ***/
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
        this.alien = this.alienMap[this.alienKey];
        this.pacing = this.pacingMap[config.pacing] ?? this.pacingMap[this.defaultPacing];
        this.sexLevel = this.sexLevelMap[config.sex_level] ?? this.sexLevelMap[this.defaultSexLevel];
        this.violenceLevel = this.violenceLevelMap[config.violence_level] ?? this.violenceLevelMap[this.DefaultViolenceLevel];
        console.log(config);
        if (messageState) {
            this.setFromMessageState(messageState);
        }
        console.log("Alien loaded:" + this.alien.name);
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {
        /***
         This is called immediately after the constructor, in case there is some asynchronous code you need to
         run on instantiation.
         ***/
        return {
            /*** @type boolean @default null
             @description The 'success' boolean returned should be false IFF (if and only if), some condition is met that means
              the stage shouldn't be run at all and the iFrame can be closed/removed.
              For example, if a stage displays expressions and no characters have an expression pack,
              there is no reason to run the stage, so it would return false here. ***/
            success: true,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            initState: null,
            chatState: null,
        };
    }

    async setState(state: MessageStateType): Promise<void> {
        /***
         This can be called at any time, typically after a jump to a different place in the chat tree
         or a swipe. Note how neither InitState nor ChatState are given here. They are not for
         state that is affected by swiping.
         ***/
        this.setFromMessageState(state);

    }

    setFromMessageState(messageState: MessageStateType) {
        if (messageState != null) {
            this.escalation = messageState['escalation'];
            this.alienKey = (messageState['alienKey'] in this.alienMap) ? messageState['alienKey'] : this.defaultAlienKey;
            this.alien = this.alienMap[messageState['alienKey']];
        }
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        /***
         This is called after someone presses 'send', but before anything is sent to the LLM.
         ***/
        const {
            content,            /*** @type: string
             @description Just the last message about to be sent. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is itself from another bot, ex. in a group chat. ***/
        } = userMessage;
        
        this.escalation += this.pacing;
        return {
            /*** @type null | string @description A string to add to the
             end of the final prompt sent to the LLM,
             but that isn't persisted. ***/
            stageDirections: this.getAlienPrompt(),
            /*** @type MessageStateType | null @description the new state after the userMessage. ***/
            messageState: this.buildMessageState(),
            /*** @type null | string @description If not null, the user's message itself is replaced
             with this value, both in what's sent to the LLM and in the database. ***/
            modifiedMessage: null,
            /*** @type null | string @description A system message to append to the end of this message.
             This is unique in that it shows up in the chat log and is sent to the LLM in subsequent messages,
             but it's shown as coming from a system user and not any member of the chat. If you have things like
             computed stat blocks that you want to show in the log, but don't want the LLM to start trying to
             mimic/output them, they belong here. ***/
            systemMessage: null,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {
        /***
         This is called immediately after a response from the LLM.
         ***/
        const {
            content,            /*** @type: string
             @description The LLM's response. ***/
            anonymizedId,       /*** @type: string
             @description An anonymized ID that is unique to this individual
              in this chat, but NOT their Chub ID. ***/
            isBot             /*** @type: boolean
             @description Whether this is from a bot, conceivably always true. ***/
        } = botMessage;

        return {
            /*** @type null | string @description A string to add to the
             end of the final prompt sent to the LLM,
             but that isn't persisted. ***/
            stageDirections: null,
            /*** @type MessageStateType | null @description the new state after the botMessage. ***/
            messageState: this.buildMessageState(),
            /*** @type null | string @description If not null, the bot's response itself is replaced
             with this value, both in what's sent to the LLM subsequently and in the database. ***/
            modifiedMessage: null,
            /*** @type null | string @description an error message to show
             briefly at the top of the screen, if any. ***/
            error: null,
            systemMessage: null,
            chatState: null
        };
    }


    render(): ReactElement {
        /***
         There should be no "work" done here. Just returning the React element to display.
         If you're unfamiliar with React and prefer video, I've heard good things about
         @link https://scrimba.com/learn/learnreact but haven't personally watched/used it.

         For creating 3D and game components, react-three-fiber
           @link https://docs.pmnd.rs/react-three-fiber/getting-started/introduction
           and the associated ecosystem of libraries are quite good and intuitive.

         Cuberun is a good example of a game built with them.
           @link https://github.com/akarlsten/cuberun (Source)
           @link https://cuberun.adamkarlsten.com/ (Demo)
         ***/
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
        let prompt = `[${this.alien.corePrompt} ${evolution.description} ${this.getSexLevelDescription()} ${this.getViolenceLevelDescription()}]`;
        console.log(`${this.escalation} - ${prompt}`);
        return prompt;
    }

    getEvolution(): Evolution {
        if (!this.alien || !this.alien.evolutions) {
            return {
                description: '',
                sexLevelDescriptions: {},
                violenceLevelDescriptions: {}
            };
        }
        return this.getBestMatch(this.alien.evolutions, this.escalation);
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

    getBestMatch<Type>(targetMap: {[key: string]: Type}, value: number): Type {
        return targetMap[
            Math.max(...Object.keys(targetMap).map(Number).filter(key => key <= value))];
    }

    buildMessageState(): {[key: string]: any} {
        return {'escalation': this.escalation,
                'alienKey': this.alienKey
        };
    }

}
