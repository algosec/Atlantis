import { Pipe, PipeTransform } from '@angular/core';
import {IBranchExtendedSummary} from "../../../../../shared/src/model";
import {EmailToDisplayNamePipe} from "../../utils/email-to-display-name.pipe";

@Pipe({
  name: 'ConfigureBranchesFilter'
})
export class ConfigureBranchesFilterPipe implements PipeTransform {

  constructor(private emailToDisplayNamePipe : EmailToDisplayNamePipe) { }

  transform(list: IBranchExtendedSummary[], titleFilter: string, ownerFilter: string, showArchivedOnly: boolean): IBranchExtendedSummary[] {
    return list
        .filter(x => x.title.toLowerCase().includes(titleFilter))
        .filter(x => x.owner.toLowerCase().includes(ownerFilter) || this.emailToDisplayNamePipe.transform(x.owner).toLowerCase().includes(ownerFilter))
        .filter(x => showArchivedOnly ? x.archived : !x.archived);
  }

}
