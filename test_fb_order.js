const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAOOGNkjpW48SUkX7qZfE28hG-yLj4sMRI",
  authDomain: "sgca-platform-7abbc.firebaseapp.com",
  projectId: "sgca-platform-7abbc",
  storageBucket: "sgca-platform-7abbc.firebasestorage.app",
  messagingSenderId: "1076998535653",
  appId: "1:1076998535653:web:286639c3d92a7cfb8f970c",
  measurementId: "G-9XZ257Q648"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
    console.log("Fetching insights with orderBy...");
    try {
        const q = query(collection(db, "insights"), orderBy("date", "desc"), limit(30));
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.size} documents in 'insights' collection.`);
    } catch (e) {
        console.error("Error fetching docs: ", e.message);
    }
}
test();
