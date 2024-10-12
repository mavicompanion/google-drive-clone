import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
    import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';

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

    // Check if user is already logged in
    window.onload = () => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is logged in, redirect to account page
          window.location.href = 'home.html';
        }
      });
    };

    // Google Sign-In
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    googleSignInBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const provider = new GoogleAuthProvider();

      signInWithPopup(auth, provider)
        .then((result) => {
          // Successful sign-in, redirect to account page
          window.location.href = 'home.html';
        })
        .catch((error) => {
          console.error("Error during Google Sign-In:", error);
          alert("Failed to sign in: " + error.message);
        });
    });