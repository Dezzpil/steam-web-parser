import axios from 'axios';
import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const CALLBACK_PORT = 4000;
const CALLBACK_HOST = '127.0.0.1';
const API_URL = `http://127.0.0.1:${parseInt(process.env.PORT || '3000')}`;
const CALLBACK_URL = `http://127.0.0.1:${CALLBACK_PORT}/callback`;

const games = ['XcoM', 'baldur`s Gate'];

async function runIntegrationTest() {
  const callbackServer = Fastify({ logger: false });
  let callbackReceived = false;

  callbackServer.post('/callback', async (request, reply) => {
    console.log('\n[Callback Server] Received result:');
    console.log(JSON.stringify(request.body, null, 2));
    callbackReceived = true;
    reply.send({ status: 'ok' });

    // Wait a bit then exit
    setTimeout(() => {
      console.log('\n[Integration Test] Success! Closing callback server...');
      callbackServer.close().then(() => {
        process.exit(0);
      });
    }, 1000);
  });

  try {
    await callbackServer.listen({ port: CALLBACK_PORT, host: CALLBACK_HOST });
    console.log(`[Callback Server] Listening on ${CALLBACK_URL}`);

    console.log(`[Integration Test] Calling API at ${API_URL}/search-similar`);
    console.log(`[Integration Test] Games to search: ${games.join(', ')}`);

    const response = await axios.post(`${API_URL}/api/search-similar`, {
      games,
      callbackUrl: CALLBACK_URL,
    });

    console.log(`[API Response] Status: ${response.status} ${response.statusText}`);
    console.log(`[API Response] Body:`, response.data);

    // Set a timeout for the callback
    setTimeout(() => {
      if (!callbackReceived) {
        console.error(
          '\n[Integration Test] Error: Callback timeout! (No response received in 60s)',
        );
        callbackServer.close().then(() => {
          process.exit(1);
        });
      }
    }, 300000);
  } catch (err) {
    console.error('[Integration Test] Failed:', (err as Error).message);
    process.exit(1);
  }
}

runIntegrationTest();
