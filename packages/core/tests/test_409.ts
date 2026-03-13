import axios from 'axios';

async function test409() {
  const url = 'http://127.0.0.1:3000/api/search-similar';
  const callbackUrl = 'http://example.com/callback';
  const games = ['The Witcher 3'];

  console.log('--- Start Test 409 ---');
  try {
    console.log('Sending first request...');
    const res1 = await axios.post(url, { games, callbackUrl });
    console.log('First request status:', res1.status);

    console.log('Sending duplicate request...');
    try {
      await axios.post(url, { games, callbackUrl });
      console.log('Error: Second request should have failed with 409!');
    } catch (err: any) {
      if (err.response) {
        console.log('Second request failed as expected with status:', err.response.status);
        console.log('Response body:', err.response.data);
      } else {
        console.error('Second request failed with unexpected error:', err.message);
      }
    }
  } catch (err: any) {
    console.error('Failed to communicate with API. Is the server running?', err.message);
  }
}

test409();
