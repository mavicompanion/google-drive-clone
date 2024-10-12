// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGVw76Kw_sSkx9gcwRRobzx0CF4kLPVEw",
    authDomain: "drive-clone-f46ea.firebaseapp.com",
    projectId: "drive-clone-f46ea",
    storageBucket: "drive-clone-f46ea.appspot.com",
    messagingSenderId: "1064122137195",
    appId: "1:1064122137195:web:c154d6f166d369637e4f2e",
    measurementId: "G-EZ1658JP7G"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp, query, where, updateDoc,getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, updateMetadata} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Get the loader element
const loader = document.getElementById('fullScreenLoader');

// Function to show loader
function showLoader() {
    loader.classList.remove('d-none');
    loader.classList.add('d-flex');
}

// Function to hide loader
function hideLoader() {
    loader.classList.remove('d-flex');
    loader.classList.add('d-none');
}

// Function to get the folder ID from URL
function getFolderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('folderId');
}

let userId;

window.deleteFile = deleteFile;

// Show loader on window change
window.addEventListener('beforeunload', showLoader);

// Hide loader after window loads
window.addEventListener('load', hideLoader);

// Handle user authentication state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; // Fetch user ID

        // Get folderId from URL
        const folderId = getFolderIdFromUrl();

        // Redirect to root folder if folderId is invalid or not provided
        if (!folderId || folderId === 'null') {
            window.location.href = `home.html?folderId=root-${userId}`; // Redirect to the root folder
            return;
        }

        // Check if the folderId exists in Firestore
        const folderRef = doc(db, `assets/${userId}/folders`, folderId);
        const folderDoc = await getDoc(folderRef);

        if (!folderDoc.exists()) {
            // If folder doesn't exist, redirect to root folder
            window.location.href = `home.html?folderId=root-${userId}`;
            return;
        }

        // Load files that belong to the current folderId
        showLoader();
        await loadFiles(folderId);
        hideLoader();

        // Store the folderId globally to use it during file uploads
        window.currentFolderId = folderId; // Store current folderId globally
    } else {
        // User is signed out, redirect to login page
        window.location.href = 'login.html';
    }
});

// Function to trigger the file input when clicking the upload button
document.getElementById('uploadFileButton').addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default link behavior
    document.getElementById('fileInput').click(); // Trigger the file input
});

// Function to handle file selection and upload
document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0]; // Get the selected file
    if (!file) return; // If no file is selected, exit

    const folderId = window.currentFolderId; // Use the globally stored current folder ID

    showLoader(); // Show loader during upload

    try {
        // Create Firestore document first to get the fileId
        const docRef = await addDoc(collection(db, `assets/${userId}/files`), {
            folderId: folderId, // Use the current folderId
            starred: false, // Default value
            createdAt: serverTimestamp(), // Use serverTimestamp for Firestore
            fileName: file.name // Store original file name temporarily
        });

        const uniqueFileId = docRef.id; // Get the fileId from the newly created document
        const fileRef = ref(storage, `assets/${userId}/${folderId}/files/${uniqueFileId}`); // Use fileId for storage reference

        // Upload file to Firebase Storage
        await uploadBytes(fileRef, file);

        // Prepare metadata
        const metadata = {
            customMetadata: {
                uniqueFileId: uniqueFileId, // Store uniqueFileId as metadata
                folderId: folderId // Store folderId as metadata
            }
        };

        // Update file metadata
        await updateMetadata(fileRef, metadata);

        // Get file URL after upload
        const fileUrl = await getDownloadURL(fileRef); // Use fileRef to get URL

        // Update Firestore document with final file info
        await updateDoc(docRef, {
            url: fileUrl, // Save file URL
            fileName: file.name, // Store original file name
            uniqueFileId: uniqueFileId // Store unique file ID
        });

        // Load files again to refresh the file list
        await loadFiles(folderId);
    } catch (error) {
        console.error("Error uploading file: ", error);
        alert("Error uploading file. Please try again.");
    } finally {
        hideLoader(); // Hide loader after upload
    }
});




// Function to delete a file
async function deleteFile(uniqueFileId) {
    showLoader(); // Show loader during deletion

    try {
        // Get the files collection reference
        const filesRef = collection(db, `assets/${userId}/files`);

        // Query to find the document with the specified uniqueFileId
        const q = query(filesRef, where("uniqueFileId", "==", uniqueFileId));
        const querySnapshot = await getDocs(q);

        console.log(`Querying Firestore for uniqueFileId: ${uniqueFileId}`); // Debug log

        if (querySnapshot.empty) {
            alert("File not found.");
            console.error("No documents found with uniqueFileId:", uniqueFileId); // Log the error
            return;
        }

        // Assume there's only one document with that uniqueFileId
        const fileDoc = querySnapshot.docs[0];
        const fileId = fileDoc.id; // Get the document ID for deletion
        const fileData = fileDoc.data();
        
        // Construct file storage reference using fileId and original file name
        const fileRef = ref(storage, `assets/${userId}/${fileData.folderId}/files/${fileId}`); // Use the original file name if available

        console.log(`Attempting to delete file with ID: ${fileId} and uniqueFileId: ${uniqueFileId}`); // Debug log

        // Delete file from Firebase Storage
        await deleteObject(fileRef);
        console.log("File deleted from storage successfully."); // Log success

        // Delete file from Firestore
        await deleteDoc(doc(db, `assets/${userId}/files`, fileId));
        console.log("File deleted from Firestore successfully."); // Log success


        // Reload files to update the list
        await loadFiles(window.currentFolderId); // Reload files for the current folder
    } catch (error) {
        console.error("Error deleting file: ", error); // Log the error
        alert("Error deleting file. Please try again.");
    } finally {
        hideLoader(); // Hide loader after deletion
    }
}




// Load files in the current folder
async function loadFiles(folderId) {
    const fileListContainer = document.getElementById('fileList');
    fileListContainer.innerHTML = '';

    console.log("Loading files for folderId:", folderId); // Debug log

    try {
        const filesRef = collection(db, `assets/${userId}/files`);
        const q = query(filesRef, where("folderId", "==", folderId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No files found in this folder."); // Debug log
            return;
        }

        querySnapshot.forEach((doc) => {
            const fileData = doc.data();
            const fileId = doc.id; // Get the document ID for deletion
            console.log("File data:", fileData); // Debug log
            const fileUrl = doc.fileUrl;

            // Create a new file tile element
            const fileTile = document.createElement('div');
            fileTile.className = "file-tile bg-slate rounded-4 p-2 pb-3 ms-md-1";

            fileTile.innerHTML = `
                <div class="file-header d-flex align-items-center">
                    <a href="${fileData.url}" data-bs-toggle="tooltip" title="${fileData.fileName}" class="file-title d-flex align-items-center">
                        <p class="text-truncate m-0 fw-semibold">${fileData.fileName}</p>
                    </a>
                    <!-- Dropdown Menu replacing the download button -->
                    <div class="dropdown ms-auto">
                        <button class="file-three-dots btn" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end mt-2 rounded-1 border-0" aria-labelledby="dropdownMenuButton" style="box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2)">
                            <li>
                                <a class="dropdown-item fw-light py-1" style="font-size: 15px;" href="${fileData.url}" target="_blank">
                                    <img src="./img/open_file_icon.png" style="width: 18px;" class="me-1 ms-0" alt="">
                                    Open
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item fw-light py-1" style="font-size: 15px;" href="${fileData.url}" download>
                                    <img src="./img/download_icon.png" style="width: 18px;" class="me-1 ms-0" alt="">
                                    Download
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item text-danger fw-light py-1" style="font-size: 15px;" href="#" onclick="deleteFile('${fileId}')">
                                    <img src="./img/delete_icon.png" style="width: 18px;" class="me-1 ms-0" alt="">
                                    Delete
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <a href="${fileData.url}" target="_blank">
                <div class="file-preview mt-2 d-flex">
                    <img src="./img/document_icon.png" class="img-fluid rounded-3 ms-auto me-auto" style="max-height: 200px;">
                </div>
                </a>
            `;

            // Append the file tile to the file list container
            fileListContainer.appendChild(fileTile);
        });
    } catch (error) {
        console.error("Error loading files: ", error);
        alert("Error loading files. Please try again.");
    }
}
