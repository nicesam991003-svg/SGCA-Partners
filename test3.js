const https = require('https');

const query = {
  structuredQuery: {
    from: [{ collectionId: "insights" }],
    orderBy: [{ field: { fieldPath: "date" }, direction: "DESCENDING" }],
    limit: 150
  }
};

const data = JSON.stringify(query);

const options = {
  hostname: 'firestore.googleapis.com',
  path: '/v1/projects/sgca-platform-7abbc/databases/(default)/documents:runQuery',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let resData = '';
  res.on('data', d => { resData += d; });
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(resData);
      console.log(JSON.stringify(parsed, null, 2));
    } catch(e) {
      console.log(resData);
    }
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
