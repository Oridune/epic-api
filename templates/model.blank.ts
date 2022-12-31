import mongoose from "mongoose";

export interface I$_namePascal {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const $_namePascalSchema = new mongoose.Schema(
  {},
  { timestamps: true, versionKey: false }
);

export const $_namePascalModel = mongoose.model<I$_namePascal>(
  "$_namePascal",
  $_namePascalSchema
);
