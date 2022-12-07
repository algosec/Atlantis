import axios from 'axios';
import {globalConfig} from "../../../../shared/src/globalConfig";

export interface IPostMessageResponse {
    id?: string;
    error?: string & {message: string};
}

export async function postMessage<T>(targetTeamId: string, targetChannelId: string, message: T): Promise<IPostMessageResponse> {
    const res = await axios.post(globalConfig.teams.postMessageURL, {
        targetTeamId,
        targetChannelId,
        message: JSON.stringify(message)
    });
    return res.data;
}

// todo not used?
export async function postReplay(targetTeamId: string, targetChannelId: string, targetMessageId: string, message: string): Promise<IPostMessageResponse> {
    const res = await axios.post(globalConfig.teams.postReplayURL, {
        targetTeamId,
        targetChannelId,
        targetMessageId,
        message
    });
    return res.data;
}