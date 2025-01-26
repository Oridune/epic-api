import _axios from "axios";
import { PORT } from "@Core/constants.ts";

export const axios = _axios.create({
  baseURL: "http://localhost:" + PORT,
});
