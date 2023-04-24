import {Pipe, PipeTransform} from '@angular/core';
import {IChannelLatestSummary, IBucket} from '../../../../../shared/src/model';
import {isBucketMatch} from "../../utils/buckets";

@Pipe({
  name: 'channelFilter'
})
export class ChannelFilterPipe implements PipeTransform {

  transform(list: IChannelLatestSummary[], favorites: Set<string>, search: string, bucket: string, passedOnly: boolean, failuresOnly: boolean, pendingOnly: boolean, reviewedOnly: boolean, sameStatusOnly: boolean, favoritesOnly: boolean, allBuckets: IBucket[]): IChannelLatestSummary[] {
    if (search) {
      list = this.transformSearch(list, search);
    }
    if (bucket !== 'All') {
      list = list.filter((channel: IChannelLatestSummary) => this.isBucketMatch(allBuckets, bucket, channel));
    }
    if (passedOnly) {
      list = list.filter((channel: IChannelLatestSummary) => channel.latestCard.failed === 0);
    }
    if (failuresOnly || pendingOnly || reviewedOnly || sameStatusOnly) {
      list = list.filter((channel: IChannelLatestSummary) => channel.latestCard.failed > 0);
    }
    if (reviewedOnly) {
      list = list.filter((channel: IChannelLatestSummary) => channel.latestCard.reviewed);
    }
    if (pendingOnly) {
      list = list.filter((channel: IChannelLatestSummary) => !channel.latestCard.reviewed && (!channel.latestCard.oldestEquivalentCard || !channel.latestCard.oldestEquivalentCard.reviewed));
    }
    if (sameStatusOnly) {
      list = list.filter((channel: IChannelLatestSummary) => !channel.latestCard.reviewed && (channel.latestCard.oldestEquivalentCard && channel.latestCard.oldestEquivalentCard.reviewed));
    }
    if (favoritesOnly) {
      list = list.filter((channel: IChannelLatestSummary) => favorites.has(channel.title))
    }
    return list;
  }

  private isBucketMatch (allBuckets: IBucket[], bucket: string, channel: IChannelLatestSummary) {
    let BUCKETS_BY_TITLE: {[key: string]: IBucket};
    if (bucket !== 'Others') {
      BUCKETS_BY_TITLE = allBuckets.reduce((obj, bucket: IBucket) => { obj[bucket.title] = bucket; return obj; }, {});
      return isBucketMatch(BUCKETS_BY_TITLE[bucket], channel.title)
    } else {
      return allBuckets.every((b: IBucket) => !isBucketMatch(b, channel.title))
    }
  }

  private transformSearch(list: IChannelLatestSummary[], search: string): IChannelLatestSummary[] {
    const regexPattern = search.replace(/\W+/g, '.*');
    return list.filter((channel: IChannelLatestSummary) =>
        new RegExp(regexPattern, "ig").test(channel.title)
        || new RegExp(regexPattern, "ig").test(channel.owner)
        || (channel.latestCard && new RegExp(regexPattern, "ig").test(channel.latestCard.build))
        || channel.defects.some(defect => new RegExp(regexPattern, "ig").test(defect.id))
    );
  }

}