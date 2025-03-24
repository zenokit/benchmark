import type { Request, Response } from "zeno";

export const POST = async (req: Request, res: Response) => {
  const data = await req.bindJSON<any>();
  res.json({ received: true, data: data.data ?? null });
};