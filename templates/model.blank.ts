import e, { inferInput, inferOutput } from "validator";
import { Mongo, ObjectId, InputDocument, OutputDocument } from "mongo";

export const $_namePascalSchema = e.object({
  _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
  createdAt: e.optional(e.date()).default(() => new Date()),
  updatedAt: e.optional(e.date()).default(() => new Date()),
});

export type T$_namePascalInput = InputDocument<
  inferInput<typeof $_namePascalSchema>
>;
export type T$_namePascalOutput = OutputDocument<
  inferOutput<typeof $_namePascalSchema>
>;

export const $_namePascalModel = Mongo.model("$_nameKebab", $_namePascalSchema);

$_namePascalModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
