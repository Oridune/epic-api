import { ObjectId } from "mongo";
import e, { BaseValidator, inferOutput } from "validator";

export const valueSchema = e.or([
  e.object({
    type: e.in(
      ["string", "number", "boolean", "objectId", "date", "regex"] as const,
    ),
    value: e.string(),
    options: e.optional(e.object({
      regexFlags: e.optional(e.string()),
    })),
  }),
  e.string(),
]);

export const expressionSchema = e.partial(
  e.object({
    $eq: valueSchema,
    $ne: valueSchema,
    $in: e.array(valueSchema),
    $nin: e.array(valueSchema),
    $all: e.array(valueSchema),
    $lt: valueSchema,
    $lte: valueSchema,
    $gt: valueSchema,
    $gte: valueSchema,
    $mod: e.tuple([e.number(), e.number()]),
    $regex: valueSchema,
  }),
);

export const basicFilterSchema = e.record(
  e.or([e.object({ $not: expressionSchema }), expressionSchema]),
);

export const multiFilterSchema = e.partial(e.object({
  $and: e.array(basicFilterSchema),
  $or: e.array(basicFilterSchema),
}));

export const filtersSchema = e.or([basicFilterSchema, multiFilterSchema]);

export const queryValidator = () =>
  e.deepCast(e.object(
    {
      search: e.optional(e.string()).describe("Enter your search term"),
      filters: e.optional(filtersSchema),
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

export const normalizeFilters = (
  filters?: inferOutput<typeof filtersSchema>,
) => {
  if (typeof filters !== "object" || !filters) return {};

  const normalize = (
    value?: string | number | inferOutput<typeof valueSchema>,
  ) => {
    if (!value || typeof value === "string" || typeof value === "number") {
      return value;
    }

    switch (value.type) {
      case "boolean":
        return ["true", "1"].includes(value.value);

      case "date":
        return new Date(value.value);

      case "number":
        return Number(value.value);

      case "objectId":
        return new ObjectId(value.value);

      case "regex":
        return new RegExp(value.value, value.options?.regexFlags);

      default:
        return value.value;
    }
  };

  const transform = (
    expr:
      | { $not: inferOutput<typeof expressionSchema> }
      | inferOutput<typeof expressionSchema>,
  ) => {
    // deno-lint-ignore no-explicit-any
    const newExpr: Record<string, any> = {};

    for (const [key, value] of Object.entries(expr)) {
      if (key === "$not") newExpr[key] = transform(value);
      else {
        newExpr[key] = value instanceof Array
          ? value.map(normalize)
          : normalize(value);
      }
    }

    return newExpr;
  };

  // deno-lint-ignore no-explicit-any
  const newFilters: Record<string, any> = {};

  for (const [key, expr] of Object.entries(filters)) {
    if (["$and", "$or"].includes(key)) {
      newFilters[key] = expr.map(normalizeFilters);
    }

    newFilters[key] = transform(expr);
  }

  return newFilters;
};
