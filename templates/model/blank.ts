import { Model } from "deno:db";

export default class $_NameModel extends Model {
  static table = "$_name_s";
  static timestamps = true;

  static fields = {
    _id: { primaryKey: true },
  };
}
