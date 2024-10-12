import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js'; 

const firebaseConfig = {
  apiKey: "AIzaSyCGVw76Kw_sSkx9gcwRRobzx0CF4kLPVEw",
  authDomain: "drive-clone-f46ea.firebaseapp.com",
  projectId: "drive-clone-f46ea",
  storageBucket: "drive-clone-f46ea.appspot.com",
  messagingSenderId: "1064122137195",
  appId: "1:1064122137195:web:c154d6f166d369637e4f2e",
  measurementId: "G-EZ1658JP7G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loader = document.getElementById('fullScreenLoader');

function showLoader() {
  loader.classList.remove('d-none');
  loader.classList.add('d-flex');
}

function hideLoader() {
  loader.classList.add('d-flex');
  loader.classList.add('d-none');
}

window.onload = () => {
  showLoader();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await createDefaultFolder(user.uid);
      hideLoader();
      window.location.href = `home.html?folderId=root-${user.uid}`;
    } else {
      hideLoader();
    }
  });
};

const googleSignInBtn = document.getElementById('googleSignInBtn');
googleSignInBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  showLoader();
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    await createDefaultFolder(user.uid);
    hideLoader();
    window.location.href = `home.html?folderId=root-${user.uid}`;
  } catch (error) {
    console.error("Error during Google Sign-In:", error);
    hideLoader();
    alert("Failed to sign in: " + error.message);
  }
});

async function createDefaultFolder(userId) {
  const userFoldersRef = collection(db, `assets/${userId}/folders`);
  const defaultFolderId = `root-${userId}`;
  const folderDocRef = doc(userFoldersRef, defaultFolderId);
  
  const folderSnapshot = await getDoc(folderDocRef);
  
  if (!folderSnapshot.exists()) {
    await setDoc(folderDocRef, {
      parentFolderId: null,
      starred: false,
      folderName: defaultFolderId,
      createdAt: new Date(),
    });
    console.log(`Default folder '${defaultFolderId}' created for user.`);
  }
}
