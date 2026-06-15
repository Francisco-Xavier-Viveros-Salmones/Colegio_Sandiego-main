const { request } = require('http');

async function test() {
  const token = process.argv[2];
  if (!token) {
    console.log("No token provided");
    return;
  }
  
  const req = request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/pagos?alumnoId=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
  });
  req.on('error', console.error);
  req.end();
}
test();
