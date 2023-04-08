import mongoose from "mongoose";

export interface I$_namePascal extends mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export const $_namePascalSchema = new mongoose.Schema<I$_namePascal>(
  {},
  { timestamps: true, versionKey: false }
);

export const $_namePascalModel = mongoose.model<I$_namePascal>(
  "$_nameKebab",
  $_namePascalSchema
);
