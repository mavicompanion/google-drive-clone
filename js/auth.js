import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';

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

window.onload = () => {
  onAuthStateChanged(auth, (user) => {
      if (user) {
          document.getElementById("account-name-message").textContent = user.displayName;
          document.getElementById("account-email").textContent = user.email;
          document.getElementById("account-pfp").src = user.photoURL;
          document.getElementById("account-pfp-1").src = user.photoURL;
      } else {
          window.location.href = 'index.html';
      }
  });
};

const signOutBtn = document.getElementById('sign-out-btn');
signOutBtn.addEventListener('click', (event) => {
  event.preventDefault();
  signOut(auth)
      .then(() => {
          window.location.href = 'index.html';
      })
      .catch((error) => {
          console.error("Error during sign out:", error);
          alert("Failed to sign out: " + error.message);
      });
});
