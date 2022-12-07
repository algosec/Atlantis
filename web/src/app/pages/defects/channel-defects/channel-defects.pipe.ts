import { Pipe, PipeTransform } from '@angular/core';
import {IDefectFailures} from "../../../../../../shared/src/model";
import {BUCKETS_BY_TITLE, IBucket, isBucketMatch} from "../../../utils/buckets";

@Pipe({
  name: 'channelDefects'
})
export class ChannelDefectsPipe implements PipeTransform {

  transform(defects: IDefectFailures[], selectedBucket: string, searchText: string): IDefectFailures[] {
    if (searchText) {
      defects = this.transformSearch(defects, searchText);
    }

    const bucket: IBucket = BUCKETS_BY_TITLE[selectedBucket];
    return defects.filter(x => !bucket || x.channels.some(c => isBucketMatch(bucket, c.title)));
  }

  private transformSearch(list: IDefectFailures[], search: string): IDefectFailures[] {
    const regexPattern = search.replace(/\W+/g, '.*');
    return list.filter((defect: IDefectFailures) =>
        new RegExp(regexPattern, "ig").test(defect.id)
        || new RegExp(regexPattern, "ig").test(defect.summary)
        || new RegExp(regexPattern, "ig").test(defect.assignee)
        || defect.channels.some(channel => new RegExp(regexPattern, "ig").test(channel.title))
    );
  }

}
