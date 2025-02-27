import type { Request, Response } from "zeno/src";

export const POST = async (req: Request, res: Response) => {
  // const data = await req.json();
  // return res.json({ received: true, data });
  res.json({ received: true, data: "todo" });
};