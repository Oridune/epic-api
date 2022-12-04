import mongoose from "mongoose";

export interface I$_NameModel {}

export const $_NameModel = mongoose.model<I$_NameModel>(
  "$_Name",
  new mongoose.Schema({}, { timestamps: true })
);
