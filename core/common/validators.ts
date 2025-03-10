import e, { BaseValidator } from "validator";

export const queryValidator = () =>
  e.deepCast(e.object(
    {
      search: e.optional(e.string()).describe("Enter your search term"),
      range: e.optional(
        e.tuple([e.date(), e.date()]),
      ).describe(
        "Provide a date range as an array of date object. E.g: [date1, date2]",
      ),
      offset: e.optional(e.number().min(0)).default(0),
      limit: e.optional(e.number().max(2000)).default(2000),
      sort: e.optional(
        e.record(e.number().min(-1).max(1)),
      ).default({ _id: -1 }).describe(
        "Provide a sorting information in mongodb sort object format",
      ),
      project: e.optional(
        e.record(e.number().min(0).max(1)),
      ).describe(
        "Provide a projection information in mongodb project object format",
      ),
      includeTotalCount: e.optional(
        e.boolean()
          .describe(
            "If `true` is passed, the system will return a total items count for pagination purpose.",
          ),
      ),
    },
    { allowUnexpectedProps: true },
  ));

export const responseValidator = <T extends (BaseValidator)>(data?: T, opts?: {
  falseResponse?: boolean;
}) =>
  e.object({
    status: opts?.falseResponse ? e.false() : e.true(),
    ...(data ? { data } : {}),
    messages: e.optional(e.array(
      e.partial(
        e.object({
          message: e.string(),
          location: e.string(),
          name: e.string(),
        }).rest(e.any()),
      ),
    )),
    metrics: e.optional(
      e.partial(
        e.object({
          handledInMs: e.number(),
          respondInMs: e.number(),
        }).rest(e.any()),
      ),
    ),
    metadata: e.optional(e.record(e.any())),
  });
