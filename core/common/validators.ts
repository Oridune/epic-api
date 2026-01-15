// deno-lint-ignore-file ban-ts-comment
import { ObjectId } from "mongo";
import e, { BaseValidator, inferOutput } from "validator";

export const valueSchema = e.or([
  e.object({
    type: e.in(
      [
        "string",
        "number",
        "boolean",
        "objectId",
        "date",
        "regex",
        "null",
      ] as const,
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
    $exists: valueSchema,
    $eq: valueSchema,
    $ne: valueSchema,
    $gt: valueSchema,
    $gte: valueSchema,
    $lt: valueSchema,
    $lte: valueSchema,
    $mod: e.tuple([e.number(), e.number()]),
    $regex: valueSchema,
    $in: e.array(valueSchema),
    $nin: e.array(valueSchema),
    $all: e.array(valueSchema),
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

export const testFilters = async <T extends Record<string, unknown>>(
  filters: inferOutput<typeof filtersSchema> | string,
  data: T,
) => {
  const validatedFilters = typeof filters === "string"
    ? JSON.parse(filters) as inferOutput<typeof filtersSchema>
    : filters;

  const testExpression = (
    expressions: inferOutput<typeof expressionSchema>,
    key: string,
  ) => {
    let success = true;

    for (const [operator, expression] of Object.entries(expressions)) {
      if (!success) break;

      const exists = key in data;
      const value = data[key];

      try {
        if (Array.isArray(expression)) {
          const targets = expression.map(normalizeFilterExpression).map(String);

          switch (operator) {
            case "$in":
              success = targets.includes(String(value));
              break;
            case "$nin":
              success = !targets.includes(String(value));
              break;
            case "$all":
              success = !targets.every((target) => target === String(value));
              break;

            default:
              success = false;
              break;
          }
        } else {
          const target = normalizeFilterExpression(expression);

          switch (operator) {
            case "$exists":
              success = exists === Boolean(target);
              break;
            case "$eq":
              success = String(value) === String(target);
              break;
            case "$ne":
              success = String(value) !== String(target);
              break;
            case "$gt":
              // @ts-ignore
              success = value > target;
              break;
            case "$gte":
              // @ts-ignore
              success = value >= target;
              break;
            case "$lt":
              // @ts-ignore
              success = value < target;
              break;
            case "$lte":
              // @ts-ignore
              success = value <= target;
              break;
            case "$mod":
              // @ts-ignore
              success = value % target[0] === target[1];
              break;
            case "$regex":
              // @ts-ignore
              success = RegExp(target).test(value);
              break;

            default:
              success = false;
              break;
          }
        }
      } catch {
        success = false;
      }
    }

    return success;
  };

  const testBasicFilters = (
    basicFilters: inferOutput<typeof basicFilterSchema>,
  ) => {
    let success = true;

    for (const [key, expression] of Object.entries(basicFilters)) {
      if (!success) break;

      if ("$not" in expression) {
        success = !testExpression(expression["$not"], key);

        continue;
      }

      success = testExpression(expression, key);
    }

    return success;
  };

  let pass = true;

  if ("$and" in validatedFilters && Array.isArray(validatedFilters["$and"])) {
    for (const filters of validatedFilters["$and"]) {
      const success = await testFilters(filters, data);

      if (!success) {
        pass = false;

        break;
      }
    }
  }

  if (!pass) return false;

  if ("$or" in validatedFilters && Array.isArray(validatedFilters["$or"])) {
    for (const filters of validatedFilters["$or"]) {
      const success = await testFilters(filters, data);

      if (success) return true;
    }

    return false;
  }

  if (!("$and" in validatedFilters) && !("$or" in validatedFilters)) {
    return testBasicFilters(
      validatedFilters as inferOutput<typeof basicFilterSchema>,
    );
  }

  return false;
};

export const _queryValidator = e.deepCast(e.object(
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

export const queryValidator = () => _queryValidator;

export const _responseValidatorFalse = e.object({
  status: e.false(),
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

export const _responseValidatorTrue = e.object({
  status: e.true(),
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

export const responseValidator = <T extends (BaseValidator)>(data?: T, opts?: {
  falseResponse?: boolean;
}) => {
  if (!data) {
    if (opts?.falseResponse) return _responseValidatorFalse;
    else return _responseValidatorTrue;
  }

  return e.object({
    status: opts?.falseResponse ? e.false() : e.true(),
    data,
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
};

export const normalizeFilterExpression = (
  value?: string | number | boolean | inferOutput<typeof valueSchema>,
) => {
  if (typeof value === "object" && typeof value.type === "string") {
    switch (value.type) {
      case "boolean":
        return ["true", "1"].includes(value.value);

      case "date":
        return value.value === "now" ? new Date() : new Date(value.value);

      case "number":
        return Number(value.value);

      case "objectId":
        return new ObjectId(value.value);

      case "regex":
        return new RegExp(value.value, value.options?.regexFlags);

      case "null":
        return null;

      default:
        return value.value;
    }
  }

  return value;
};

export const normalizeFilters = (
  filters?: inferOutput<typeof filtersSchema>,
) => {
  if (typeof filters !== "object" || !filters) return {};

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
          ? value.map(normalizeFilterExpression)
          : normalizeFilterExpression(value);
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
