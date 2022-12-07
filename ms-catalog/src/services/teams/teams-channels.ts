import log from '../../../../shared/src/utils/log';
import axios from 'axios';

export interface IChannelResponse {
    id: string;
    displayName: string;
    webUrl: string;
    error?: {
        message: string
    };
}

export async function loadChannels(teamId: string): Promise<IChannelResponse[]> {
    log.debug(`Loading channels for team ${teamId}`);
    const res = await axios.post("https://prod-07.westeurope.logic.azure.com/workflows/e777864073a44ed5a86a317eda8eb40a/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=czctWJI-Sby8d5uUH0thWz7P80-S65I3VBztbXPWNi0", {
        targetTeam: teamId
    });
    return res.data.filter(x => x.displayName !== 'General'); // exclude the general channel
}

export async function createChannel(targetTeam: string, channelTitle: string): Promise<IChannelResponse> {
    const res = await axios.post("https://prod-107.westeurope.logic.azure.com:443/workflows/513ea3caaf8d45669269dfc1a6b7aff1/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=eta_wIcdkXuBlNdqt7nMCNpzOXo3DWYdezPQJ26ks0g", {
        targetTeam: targetTeam,
        channelTitle: channelTitle
    });
    return res.data;
}