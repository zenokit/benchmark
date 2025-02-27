import { createServer, getRoutesDir } from "zeno/src";

const routesDir = getRoutesDir();
createServer(routesDir);