const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
    console.log("Fetching insights...");
    try {
        const querySnapshot = await getDocs(collection(db, "insights"));
        console.log(`Found ${querySnapshot.size} documents in 'insights' collection.`);
        querySnapshot.forEach((doc) => {
            console.log(doc.id, " => ", doc.data());
        });
    } catch (e) {
        console.error("Error fetching docs: ", e);
    }
}
test();
