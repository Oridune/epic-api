import mongoose from "mongoose";

export interface I$_NameModel {
  createdAt: Date;
  updatedAt: Date;
}

export const $_NameModel = mongoose.model<I$_NameModel>(
  "$_Name",
  new mongoose.Schema({}, { timestamps: true, versionKey: false })
);
