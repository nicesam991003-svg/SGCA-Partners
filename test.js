const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// We just want to use REST API since firebase-admin might not be installed.
const https = require('https');

https.get('https://firestore.googleapis.com/v1/projects/sgca-platform-7abbc/databases/(default)/documents/insights', (resp) => {
  let data = '';
  resp.on('data', (chunk) => {
    data += chunk;
  });
  resp.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
