export type TMemoryUsage = Deno.MemoryUsage & typeof __metadata;

const __metadata = {
  rangeRss: {
    min: 0,
    max: 0,
  },
  rangeHeapTotal: {
    min: 0,
    max: 0,
  },
};

const __base: { usage?: TMemoryUsage } = {};
const __history: { usage?: TMemoryUsage } = {};

export const getMemoryUsage = () => {
  const Usage = Deno.memoryUsage();

  if (Usage.rss > __metadata.rangeRss.max) {
    __metadata.rangeRss.max = Usage.rss;
  }

  if (Usage.rss < __metadata.rangeRss.min || __metadata.rangeRss.min === 0) {
    __metadata.rangeRss.min = Usage.rss;
  }

  if (Usage.heapTotal > __metadata.rangeHeapTotal.max) {
    __metadata.rangeHeapTotal.max = Usage.heapTotal;
  }

  if (
    Usage.heapTotal < __metadata.rangeHeapTotal.min ||
    __metadata.rangeHeapTotal.min === 0
  ) {
    __metadata.rangeHeapTotal.min = Usage.heapTotal;
  }

  const ResolvedUsage = {
    ...Usage,
    rangeRss: __metadata.rangeRss,
    rangeHeapTotal: __metadata.rangeHeapTotal,
  };

  __base.usage ??= ResolvedUsage;

  const diff = __history.usage && {
    rss: ResolvedUsage.rss - __history.usage.rss,
    heapUsed: ResolvedUsage.heapUsed - __history.usage.heapUsed,
    heapTotal: ResolvedUsage.heapTotal - __history.usage.heapTotal,
    external: ResolvedUsage.external - __history.usage.external,
  };

  __history.usage = ResolvedUsage;

  const baseDiff = {
    rss: ResolvedUsage.rss - __base.usage.rss,
    heapUsed: ResolvedUsage.heapUsed - __base.usage.heapUsed,
    heapTotal: ResolvedUsage.heapTotal - __base.usage.heapTotal,
    external: ResolvedUsage.external - __base.usage.external,
  };

  return {
    usage: ResolvedUsage,
    history: __history,
    diff,
    baseDiff,
  };
};

export type TMemoryUsageDetailsKey =
  | "usageBytes"
  | "usageMb"
  | "diffBytes"
  | "diffMb"
  | "baseDiffBytes"
  | "baseDiffMb"
  | "rssPercentage"
  | "heapPercentage";

export const getMemoryUsageDetails = (opts?: {
  project?: Partial<Record<TMemoryUsageDetailsKey, 0 | 1>>;
}) => {
  const { usage, diff, baseDiff } = getMemoryUsage();

  const bytesToMb = (bytes: number) =>
    parseFloat((bytes / 1024 / 1024).toFixed(2));

  return Object.fromEntries(
    Object.entries(
      {
        usageBytes: () => usage,
        usageMb: () =>
          Object.fromEntries(
            Object.entries(usage).map((
              [key, value],
            ) => [
              key,
              typeof value === "number" ? bytesToMb(value) : {
                min: bytesToMb(value.min),
                max: bytesToMb(value.max),
              },
            ]),
          ),
        diffBytes: () => diff,
        diffMb: () =>
          diff && Object.fromEntries(
            Object.entries(diff).map((
              [key, value],
            ) => [key, parseFloat((value / 1024 / 1024).toFixed(2))]),
          ),
        baseDiffBytes: () => baseDiff,
        baseDiffMb: () =>
          baseDiff && Object.fromEntries(
            Object.entries(baseDiff).map((
              [key, value],
            ) => [key, parseFloat((value / 1024 / 1024).toFixed(2))]),
          ),
        rssPercentage: () => getRssPercentage(usage),
        heapPercentage: () => getHeapPercentage(usage),
      } satisfies Record<TMemoryUsageDetailsKey, unknown>,
    ).map(([key, value]) =>
      (!opts?.project || opts?.project?.[key as TMemoryUsageDetailsKey])
        ? [key, value()]
        : [key, undefined]
    ).filter(([, value]) => value !== undefined),
  );
};

export const getHeapPercentage = (
  usage: TMemoryUsage,
  byMax = false,
) =>
  parseFloat(
    ((usage.heapUsed / (byMax ? usage.rangeHeapTotal.max : usage.heapTotal)) *
      100).toFixed(2),
  );

export const getRssPercentage = (
  usage: TMemoryUsage,
  byMax = false,
) =>
  parseFloat(
    (((usage.heapUsed + usage.external) /
      (byMax ? usage.rangeRss.max : usage.rss)) * 100).toFixed(2),
  );
