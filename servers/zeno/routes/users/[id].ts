import { Request, Response } from "zeno/src";

export const GET = async (req: Request, res: Response) => {
  const { id } = (req as any).params;
  return res.json({ id, name: `User ${id}` });
}