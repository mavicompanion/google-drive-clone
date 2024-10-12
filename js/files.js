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

const loader = document.getElementById('fullScreenLoader');

function showLoader() {
    loader.classList.remove('d-none');
    loader.classList.add('d-flex');
}

function hideLoader() {
    loader.classList.remove('d-flex');
    loader.classList.add('d-none');
}

function getFolderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('folderId');
}

let userId;

window.deleteFile = deleteFile;

window.addEventListener('beforeunload', showLoader);

window.addEventListener('load', hideLoader);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; // Fetch user ID

        const folderId = getFolderIdFromUrl();

        if (!folderId || folderId === 'null') {
            window.location.href = `home.html?folderId=root-${userId}`; // Redirect to the root folder
            return;
        }

        const folderRef = doc(db, `assets/${userId}/folders`, folderId);
        const folderDoc = await getDoc(folderRef);

        if (!folderDoc.exists()) {
            window.location.href = `home.html?folderId=root-${userId}`;
            return;
        }

        showLoader();
        await loadFiles(folderId);
        hideLoader();

        window.currentFolderId = folderId;
    } else {
        window.location.href = 'index.html';
    }
});

// Function to trigger the file input when clicking the upload button
document.getElementById('uploadFileButton').addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('fileInput').click(); 
});

// Function to handle file selection and upload
document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const folderId = window.currentFolderId;

    showLoader();

    try {
        const docRef = await addDoc(collection(db, `assets/${userId}/files`), {
            folderId: folderId,
            starred: false,
            createdAt: serverTimestamp(),
            fileName: file.name 
        });

        const uniqueFileId = docRef.id; // Get the fileId from the newly created document
        const fileRef = ref(storage, `assets/${userId}/${folderId}/files/${uniqueFileId}`); // Use fileId for storage reference

        await uploadBytes(fileRef, file);

        const metadata = {
            customMetadata: {
                uniqueFileId: uniqueFileId,
                folderId: folderId
            }
        };

        await updateMetadata(fileRef, metadata);

        const fileUrl = await getDownloadURL(fileRef);

        await updateDoc(docRef, {
            url: fileUrl,
            fileName: file.name,
            uniqueFileId: uniqueFileId
        });

        await loadFiles(folderId);
    } catch (error) {
        console.error("Error uploading file: ", error);
        alert("Error uploading file. Please try again.");
    } finally {
        hideLoader();
    }
});




// Function to delete a file
async function deleteFile(uniqueFileId) {
    showLoader();

    try {
        const filesRef = collection(db, `assets/${userId}/files`);

        const q = query(filesRef, where("uniqueFileId", "==", uniqueFileId));
        const querySnapshot = await getDocs(q);

        console.log(`Querying Firestore for uniqueFileId: ${uniqueFileId}`);

        if (querySnapshot.empty) {
            alert("File not found.");
            console.error("No documents found with uniqueFileId:", uniqueFileId);
            return;
        }

        const fileDoc = querySnapshot.docs[0];
        const fileId = fileDoc.id; 
        const fileData = fileDoc.data();
        
        const fileRef = ref(storage, `assets/${userId}/${fileData.folderId}/files/${fileId}`); // Use the original file name if available

        console.log(`Attempting to delete file with ID: ${fileId} and uniqueFileId: ${uniqueFileId}`); // Debug log

        // Delete file from Firebase Storage
        await deleteObject(fileRef);
        console.log("File deleted from storage successfully.");

        // Delete file from Firestore
        await deleteDoc(doc(db, `assets/${userId}/files`, fileId));
        console.log("File deleted from Firestore successfully.");

        await loadFiles(window.currentFolderId);
    } catch (error) {
        console.error("Error deleting file: ", error);
        alert("Error deleting file. Please try again.");
    } finally {
        hideLoader();
    }
}




// Load files in the current folder
async function loadFiles(folderId) {
    const fileListContainer = document.getElementById('fileList');
    fileListContainer.innerHTML = '';

    console.log("Loading files for folderId:", folderId);

    try {
        const filesRef = collection(db, `assets/${userId}/files`);
        const q = query(filesRef, where("folderId", "==", folderId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No files found in this folder.");
            return;
        }

        querySnapshot.forEach((doc) => {
            const fileData = doc.data();
            const fileId = doc.id;
            console.log("File data:", fileData);
            const fileUrl = doc.fileUrl;

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

            fileListContainer.appendChild(fileTile);
        });
    } catch (error) {
        console.error("Error loading files: ", error);
        alert("Error loading files. Please try again.");
    }
}
