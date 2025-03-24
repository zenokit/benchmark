import type { Request, Response } from "zeno/src";

export const GET = async (req: Request, res: Response) => {
  res.json({ hello: 'world' });
};