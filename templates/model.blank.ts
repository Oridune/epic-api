import mongoose from "mongoose";

export interface I$_namePascal {
  createdAt: Date;
  updatedAt: Date;
}

export type I$_namePascalDocument = I$_namePascal & mongoose.Document;

export const $_namePascalSchema = new mongoose.Schema<I$_namePascal>(
  {},
  { timestamps: true, versionKey: false }
);

export const $_namePascalModel = mongoose.model<I$_namePascal>(
  "$_nameKebab",
  $_namePascalSchema
);
