import e from "validator";

export const queryValidator = () =>
  e.deepCast(e.object(
    {
      search: e.optional(e.string()),
      range: e.optional(
        e.tuple([e.date(), e.date()]),
      ),
      offset: e.optional(e.number().min(0)).default(0),
      limit: e.optional(e.number().max(2000)).default(2000),
      sort: e.optional(
        e.record(e.number().min(-1).max(1)),
      ).default({ _id: -1 }),
      project: e.optional(
        e.record(e.number().min(0).max(1)),
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
