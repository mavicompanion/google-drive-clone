import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js'; 

// Firebase Configuration
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

// Get loader element
const loader = document.getElementById('fullScreenLoader');

// Function to show loader
function showLoader() {
  loader.classList.remove('d-none');
  loader.classList.add('d-flex');
}

// Function to hide loader
function hideLoader() {
  loader.classList.add('d-flex');
  loader.classList.add('d-none');
}


// Check if user is already logged in
window.onload = () => {
  showLoader();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Check and create default folder for the user
      await createDefaultFolder(user.uid);
      // User is logged in, redirect to home page with root folder
      hideLoader();
      window.location.href = `home.html?folderId=root-${user.uid}`;
    } else {
      hideLoader();
    }
  });
};

// Google Sign-In
const googleSignInBtn = document.getElementById('googleSignInBtn');
googleSignInBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  showLoader();
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check and create default folder for the user
    await createDefaultFolder(user.uid);
    
    // Successful sign-in, redirect to home page with root folder
    hideLoader();
    window.location.href = `home.html?folderId=root-${user.uid}`;
  } catch (error) {
    console.error("Error during Google Sign-In:", error);
    hideLoader();
    alert("Failed to sign in: " + error.message);
  }
});

// Function to create default folder if it doesn't exist
async function createDefaultFolder(userId) {
  const userFoldersRef = collection(db, `assets/${userId}/folders`);
  const defaultFolderId = `root-${userId}`;
  const folderDocRef = doc(userFoldersRef, defaultFolderId);
  
  // Check if the default root folder exists
  const folderSnapshot = await getDoc(folderDocRef);
  
  if (!folderSnapshot.exists()) {
    // Create the default root folder
    await setDoc(folderDocRef, {
      parentFolderId: null, // Root folder has no parent
      starred: false,
      folderName: defaultFolderId,
      createdAt: new Date(),
    });
    console.log(`Default folder '${defaultFolderId}' created for user.`);
  }
}
