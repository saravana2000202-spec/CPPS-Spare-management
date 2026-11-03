const localtunnel = require('localtunnel');

(async () => {
  let tunnel;
  async function connect() {
    try {
      console.log('Connecting localtunnel...');
      tunnel = await localtunnel({ port: 3001, subdomain: 'cpps-plant-spares' });
      console.log('TUNNEL_URL:' + tunnel.url);
      tunnel.on('close', () => {
        console.log('Tunnel closed, reconnecting in 5s...');
        setTimeout(connect, 5000);
      });
      tunnel.on('error', (err) => {
        console.error('Tunnel error:', err);
        setTimeout(connect, 5000);
      });
    } catch (err) {
      console.error('Connection failed, retrying in 5s...', err.message);
      setTimeout(connect, 5000);
    }
  }
  connect();
})();
