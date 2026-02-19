import { Request, RequestHandler, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

type RequestSegment = 'body' | 'query' | 'params';

function getFirstErrorMessage(error: ZodError): string {
  const firstIssue = error.issues[0];
  return firstIssue?.message ?? 'Invalid request data';
}

export function validate(schema: ZodTypeAny, segment: RequestSegment = 'body'): RequestHandler {
  return (req: Request, res: Response, next) => {
    const result = schema.safeParse(req[segment]);

    if (!result.success) {
      res.status(400).json({ error: getFirstErrorMessage(result.error) });
      return;
    }

    req[segment] = result.data;
    next();
  };
}
