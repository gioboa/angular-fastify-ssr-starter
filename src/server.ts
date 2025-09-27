import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import fastifyStatic from '@fastify/static';
import fastify, { FastifyInstance } from 'fastify';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app: FastifyInstance<any, any, any> = fastify();
const angularApp = new AngularNodeAppEngine();

app.register(fastifyStatic, {
  maxAge: '1y',
  prefix: '/',
  root: browserDistFolder,
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.addHook('onRequest', async (request, reply) => {
  try {
    const response = await angularApp.handle(request.raw);
    response ? writeResponseToNodeResponse(response, reply.raw) : reply.callNotFound();
  } catch (error) {
    app.log.error(error);
    reply.code(500).send('Internal Server Error');
  }
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = parseInt(process.env['PORT'] || '4000', 10);
  app.listen({ port: port, host: '0.0.0.0' }, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Node Fastify server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
});
