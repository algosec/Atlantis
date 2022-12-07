import { Pipe, PipeTransform } from '@angular/core';
import {IBranch, ICard} from "../../../../../shared/src/model";

@Pipe({
  name: 'channelBranchFilter'
})
export class ChannelBranchFilterPipe implements PipeTransform {

  transform(list: ICard[], selectedBranch: IBranch, isShowMasterBranch: boolean): unknown {
    // null == show all branches
    if (selectedBranch === null) {
      return list;
    }

    return list.filter(card => card.branch.id === selectedBranch.id || (card.branch.identifiers.includes('master') && isShowMasterBranch));
  }

}
