import {IBucket} from "../../../../shared/src/model";

export function isBucketMatch(bucket: IBucket, title: string): boolean {
  return bucket && (bucket.prefix.some(prefix => title.startsWith(`${prefix}-`)) || bucket.suffix.some(suffix => title.endsWith(`-${suffix}`)));
}

export function calculateAvailableBuckets(allBuckets: IBucket[], allTitles: string[]): IBucket[] {
  const availableBuckets: IBucket[] = [];
  allBuckets.filter((b: IBucket) => allTitles.some(x => isBucketMatch(b, x)))
      .forEach((b: IBucket) => availableBuckets.push(b));

  return availableBuckets;
}