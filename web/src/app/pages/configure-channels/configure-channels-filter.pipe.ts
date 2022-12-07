import { Pipe, PipeTransform } from '@angular/core';
import {IChannelSetupInfo} from "../../../../../shared/src/model";
import {EmailToDisplayNamePipe} from "../../utils/email-to-display-name.pipe";

@Pipe({
  name: 'ConfigureChannelsFilter'
})
export class ConfigureChannelsFilterPipe implements PipeTransform {

    constructor(private emailToDisplayNamePipe : EmailToDisplayNamePipe) { }

  transform(list: IChannelSetupInfo[], channelFilter: string, ownerFilter: string, showArchivedOnly: boolean): IChannelSetupInfo[] {
    channelFilter = (channelFilter || '').toLowerCase();
    ownerFilter = (ownerFilter || '').toLowerCase();
    return list
        .filter(x => x.title.toLowerCase().includes(channelFilter))
        .filter(x => x.owner.toLowerCase().includes(ownerFilter) || this.emailToDisplayNamePipe.transform(x.owner).toLowerCase().includes(ownerFilter))
        .filter(x => showArchivedOnly ? x.archived : !x.archived);
  }

}
