import {globalConfig} from "../../../../shared/src/globalConfig"
export interface IBucket {
  title: string;
  prefix: string[]
  suffix: string[]
}

export function isBucketMatch(bucket: IBucket, title: string): boolean {
  return bucket && (bucket.prefix.some(prefix => title.startsWith(`${prefix}-`)) || bucket.suffix.some(suffix => title.endsWith(`-${suffix}`)));
}

export function calculateAvailableBuckets(allTitles: string[]): IBucket[] {
  const availableBuckets: IBucket[] = [];

  BUCKETS.filter((b: IBucket) => allTitles.some(x => isBucketMatch(b, x)))
      .forEach((b: IBucket) => availableBuckets.push(b));

  return availableBuckets;
}

export const BUCKETS: IBucket[] = globalConfig.buckets;

export const BUCKETS_BY_TITLE: {[key: string]: IBucket} = BUCKETS.reduce((obj, bucket: IBucket) => { obj[bucket.title] = bucket; return obj; }, {});