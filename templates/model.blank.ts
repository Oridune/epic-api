import e from "validator";
import { Mongo, ObjectId } from "mongo";

export const $_namePascalSchema = e.object({
  _id: e.optional(e.if(ObjectId.isValid)),
  createdAt: e.optional(e.date()).default(() => new Date()),
  updatedAt: e.optional(e.date()).default(() => new Date()),
});

export const $_namePascalModel = Mongo.model("$_nameKebab", $_namePascalSchema);

$_namePascalModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
