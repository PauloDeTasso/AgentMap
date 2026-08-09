import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ATTR_HTTP_REQUEST_METHOD, ATTR_HTTP_RESPONSE_STATUS_CODE, ATTR_URL_FULL } from '@opentelemetry/semantic-conventions';
import { getTracer } from './tracing';
import express from 'express';

export function httpRequestMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const tracer = getTracer();
  const span = tracer.startSpan(`${req.method} ${req.url}`);
  let spanEnded = false;
  
  span.setAttribute(ATTR_HTTP_REQUEST_METHOD, req.method);
  span.setAttribute(ATTR_URL_FULL, req.url);
  
  const endSpan = (status: SpanStatusCode) => {
    if (!spanEnded) {
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, res.statusCode);
      span.setStatus({ code: status });
      span.end();
      spanEnded = true;
    }
  };

  res.on('finish', () => {
    endSpan(res.statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK);
  });

  req.on('close', () => {
    endSpan(SpanStatusCode.ERROR);
  });

  next();
}
