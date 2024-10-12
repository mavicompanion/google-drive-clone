import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
    import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';

    // Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyDTbcLDqVfjIPuISl38vbt3UAEnYI4i09w",
      authDomain: "trial-login-4b1c3.firebaseapp.com",
      projectId: "trial-login-4b1c3",
      storageBucket: "trial-login-4b1c3.appspot.com",
      messagingSenderId: "633983685888",
      appId: "1:633983685888:web:f86aef95dd0b3987244fe5",
      measurementId: "G-XVP8D1N6D5"
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    // Check if user is authenticated
    window.onload = () => {
      // Show loader and hide content initially

      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is signed in, display account info and hide loader
          document.getElementById("account-name-message").textContent = user.displayName;
          document.getElementById("account-email").textContent = user.email;
          document.getElementById("account-pfp").src = user.photoURL;
          document.getElementById("account-pfp-1").src = user.photoURL;
        } else {
          // No user is signed in, redirect to index.html
          window.location.href = 'index.html';
        }
      });
    };

    // Sign out
    const signOutBtn = document.getElementById('sign-out-btn');
    signOutBtn.addEventListener('click', (event) => {
      event.preventDefault();
      signOut(auth)
        .then(() => {
          window.location.href = 'index.html'; // Redirect to login page after signing out
        })
        .catch((error) => {
          console.error("Error during sign out:", error);
          alert("Failed to sign out: " + error.message);
        });
    });