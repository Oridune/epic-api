import { Model } from "deno:db";

export default class $_NameModel extends Model {
  static timestamps = true;

  static fields = {
    _id: { primaryKey: true },
  };
}
