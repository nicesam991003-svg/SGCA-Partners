const admin = require('firebase-admin');

admin.initializeApp({
  projectId: "sgca-platform-7abbc"
});

const db = admin.firestore();

async function run() {
  try {
    const querySnapshot = await db.collection("insights").orderBy("date", "desc").limit(150).get();
    console.log("Docs count:", querySnapshot.size);
    querySnapshot.forEach(doc => {
      console.log(doc.id, doc.data().date, doc.data().status);
    });
  } catch(e) {
    console.error(e);
  }
}

run();
