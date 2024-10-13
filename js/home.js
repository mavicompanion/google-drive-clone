const firebaseConfig = {
    apiKey: "AIzaSyCGVw76Kw_sSkx9gcwRRobzx0CF4kLPVEw",
    authDomain: "drive-clone-f46ea.firebaseapp.com",
    projectId: "drive-clone-f46ea",
    storageBucket: "drive-clone-f46ea.appspot.com",
    messagingSenderId: "1064122137195",
    appId: "1:1064122137195:web:c154d6f166d369637e4f2e",
    measurementId: "G-EZ1658JP7G"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, doc,getDoc, deleteDoc,updateDoc, serverTimestamp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref,deleteObject,getStorage, uploadBytes, getDownloadURL, updateMetadata} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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
        userId = user.uid;
        const folderId = getFolderIdFromUrl();

        if (!folderId || folderId === 'null') {
            window.location.href = `home.html?folderId=root-${userId}`; 
            return;
        }

        const folderRef = doc(db, `assets/${userId}/folders`, folderId);
        const folderDoc = await getDoc(folderRef);

        if (!folderDoc.exists()) {
            window.location.href = `home.html?folderId=root-${userId}`;
            return;
        }

        showLoader();
        await loadFolders(folderId);
        await updateFolderTitleIndicator(folderId);
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

document.getElementById('fileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const folderId = window.currentFolderId;

    // Debugging step to check if folderId is valid
    console.log("Current folderId:", folderId);

    if (!folderId) {
        console.error("Error: folderId is undefined");
        alert("Folder ID is not defined. Please reload the page and try again.");
        return;
    }

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

        await loadFiles(fileData.folderId);
    } catch (error) {
        console.error("Error deleting file: ", error);
        alert("Error deleting file. Please try again.");
    } finally {
        hideLoader();
    }
}


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

        querySnapshot.forEach((fileDoc) => {
            const fileData = fileDoc.data();
            const fileId = fileDoc.id; // Get the document ID directly
            console.log("File data:", fileData);

            const fileTile = document.createElement('div');
            fileTile.className = "file-tile bg-slate rounded-4 p-2 pb-3 ms-md-1";

            fileTile.innerHTML = `
                <div class="file-header d-flex align-items-center">
                    <a href="${fileData.url}" data-bs-toggle="tooltip" title="${fileData.fileName}" class="file-title d-flex align-items-center">
                        <p class="text-truncate m-0 fw-semibold">${fileData.fileName}</p>
                    </a>
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
                                <a class="dropdown-item fw-light py-1" style="font-size: 15px;" href="#" onclick="deleteFile('${fileId}')">
                                    <img src="./img/delete_icon.png" style="width: 18px;" class="me-1 ms-0" alt="">
                                    Delete
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item fw-light py-1" style="font-size: 15px;" href="#" id="starred-${fileId}">
                                    <img src="./img/star_icon.png" style="width: 18px;" class="me-1 ms-0" alt="">
                                    ${fileData.starred ? 'Unstar' : 'Star'}
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

            // Event listener for starring action
            const starredButton = fileTile.querySelector(`#starred-${fileId}`);
            starredButton.addEventListener('click', async (event) => {
                event.preventDefault(); // Prevent the default link behavior

                const newStarredStatus = !fileData.starred; // Toggle starred status

                try {
                    // Update the file document directly using the document ID
                    await updateDoc(querySnapshot.docs.find(doc => doc.id === fileId).ref, {
                        starred: newStarredStatus
                    });

                    starredButton.textContent = newStarredStatus ? 'Unstar' : 'Star';
                    alert(newStarredStatus ? "File starred successfully." : "File unstarred successfully.");
                } catch (error) {
                    console.error("Error toggling starred file: ", error);
                    alert("Failed to star/unstar the file. Please try again.");
                }
            });

            fileListContainer.appendChild(fileTile);
        });
    } catch (error) {
        console.error("Error loading files: ", error);
        alert("Error loading files. Please try again.");
    }
}



async function loadFolders(parentId) {
    showLoader();
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = '';

    const folderRef = doc(db, `assets/${userId}/folders`, parentId);
    const folderDoc = await getDoc(folderRef);

    if (!folderDoc.exists()) {
        window.location.href = `home.html?folderId=root-${userId}`;
        return;
    }

    const q = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", parentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        hideLoader(); 
        return;
    }

    querySnapshot.forEach((folderDoc) => {  
        const folderData = folderDoc.data();
        
        const colDiv = document.createElement('div');
        colDiv.classList.add('col-10', 'col-md-4', 'col-lg-3', 'mt-2');

        const folderTileDiv = document.createElement('div');
        folderTileDiv.classList.add('folder-tile');

        const folderLink = document.createElement('a');
        folderLink.classList.add('folder-icon');
        folderLink.href = `home.html?folderId=${folderDoc.id}`;
        
        const folderIcon = document.createElement('i');
        folderIcon.classList.add('fas', 'fa-folder');

        const folderTitleP = document.createElement('p');
        folderTitleP.classList.add('folder-title', 'folder-title-p');
        folderTitleP.textContent = folderData.folderName;

        folderLink.appendChild(folderIcon);
        folderLink.appendChild(folderTitleP);

        const dropdownDiv = document.createElement('div');
        dropdownDiv.classList.add('dropdown');

        const dropdownButton = document.createElement('button');
        dropdownButton.classList.add('folder-three-dots', 'btn');
        dropdownButton.setAttribute('data-bs-toggle', 'dropdown');
        dropdownButton.setAttribute('aria-expanded', 'false');

        const threeDotsIcon = document.createElement('i');
        threeDotsIcon.classList.add('fas', 'fa-ellipsis-v');

        dropdownButton.appendChild(threeDotsIcon);

        const dropdownMenu = document.createElement('ul');
        dropdownMenu.classList.add('dropdown-menu', 'dropdown-menu-end', 'mt-2', 'rounded-1', 'border-0');
        dropdownMenu.setAttribute('aria-labelledby', 'dropdownMenuButton');
        dropdownMenu.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';

        const actions = [
            { icon: './img/open_file_icon.png', label: 'Open', href: `home.html?folderId=${folderDoc.id}` },
            { icon: './img/download_icon.png', label: 'Download', href: '#' },
            { icon: folderData.starred ? './img/unstar_icon.png' : './img/star_icon.png', label: folderData.starred ? 'Unstar' : 'Star', href: '#' },
            { icon: './img/delete_icon.png', label: 'Delete', action: () => deleteFolder(folderDoc.id) },
        ];

        actions.forEach(action => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.classList.add('dropdown-item', 'fw-light', 'py-1');
            a.href = action.href;

            const img = document.createElement('img');
            img.src = action.icon;
            img.style.width = '18px';
            img.classList.add('me-1', 'ms-0');
            a.appendChild(img);

            const textNode = document.createTextNode(action.label);
            a.appendChild(textNode);
            li.appendChild(a);
            dropdownMenu.appendChild(li);

            // Attach event listener for "Starred" action
            if (action.label === 'Star' || action.label === 'Unstar') {
                a.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent default link behavior

                    const newStarredStatus = !folderData.starred; // Toggle starred status

                    try {
                        // Update the starred field in Firestore
                        await updateDoc(folderDoc.ref, {
                            starred: newStarredStatus
                        });

                        // Update the UI: Toggle the icon and text based on new status
                        img.src = newStarredStatus ? './img/unstar_icon.png' : './img/star_icon.png';
                        a.textContent = newStarredStatus ? 'Unstar' : 'Star';

                        alert(newStarredStatus ? "Folder starred successfully." : "Folder unstarred successfully.");
                    } catch (error) {
                        console.error("Error toggling starred folder: ", error);
                        alert("Failed to star/unstar the folder. Please try again.");
                    }
                });
            }

            // Attach click event for delete action
            if (action.label === 'Delete') {
                a.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent default link behavior
                    const confirmDelete = confirm("Are you sure you want to delete this folder?");
                    if (confirmDelete) {
                        const parentFolderId = folderData.parentFolderId; // Save parent folder ID
                        await deleteFolder(folderDoc.id);
                        await loadFolders(parentFolderId); // Reload the folders after deletion
                        await updateFolderTitleIndicator(parentFolderId); // Update folder title indicator
                    }
                });
            }
        });

        dropdownDiv.appendChild(dropdownButton);
        dropdownDiv.appendChild(dropdownMenu);

        folderTileDiv.appendChild(folderLink);
        folderTileDiv.appendChild(dropdownDiv);

        colDiv.appendChild(folderTileDiv);

        foldersList.appendChild(colDiv);
    });
    hideLoader();
}

// Create a folder in Firestore
document.getElementById('createFolderBtn').addEventListener('click', async () => {
    const folderName = document.getElementById('newFolderName').value.trim(); // Trim whitespace
    const folderId = getFolderIdFromUrl(); // Fetch folderId from the URL

    if (folderName === "") {
        document.getElementById('status').textContent = "Please enter a folder name.";
        return;
    }

    const modalElement = bootstrap.Modal.getInstance(document.getElementById('newFolderModal'));
    modalElement.hide();

    showLoader();

    try {
        await addDoc(collection(db, `assets/${userId}/folders`), {
            folderName: folderName,
            parentFolderId: folderId,
            createdAt: new Date(),
        });

        document.getElementById('newFolderName').value = ""; // Clear input

        await loadFolders(folderId);

        hideLoader();
    } catch (e) {
        console.error("Error creating folder: ", e);
        document.getElementById('status').textContent = "Error creating folder.";
        
        hideLoader();
    }
});

async function updateFolderTitleIndicator(folderId) {
    const folderTitleIndicator = document.getElementById('folderTitleIndicator');
    folderTitleIndicator.innerHTML = '';

    const rootLink = document.createElement('a');
    rootLink.href = `home.html?folderId=root-${userId}`;
    rootLink.className = 'rounded-pill folder-locator';

    const rootIcon = document.createElement('i');
    rootIcon.className = 'fa-solid fa-folder-tree';
    rootLink.appendChild(rootIcon);
    
    folderTitleIndicator.appendChild(rootLink);

    const folderRef = doc(db, `assets/${userId}/folders`, folderId);
    const folderDoc = await getDoc(folderRef);

    if (!folderDoc.exists()) {
        return;
    }

    let currentFolderId = folderId;
    let parentFolderId = folderDoc.data().parentFolderId;

    if (parentFolderId) {
        const chevronLink = document.createElement('a');
        chevronLink.href = `home.html?folderId=${parentFolderId}`; 
        chevronLink.className = 'd-flex px-3 rounded-pill align-items-center fs-small button folder-locator';
        
        const chevronIcon = document.createElement('i');
        chevronIcon.className = 'fa-solid fa-chevron-left'; 
        chevronLink.appendChild(chevronIcon);
        
        folderTitleIndicator.appendChild(chevronLink);
    }
    else{
        const chevronLink = document.createElement('a');
        chevronLink.className = 'd-flex p-2 rounded-pill fs-small align-items-center';
        const chevronIcon = document.createElement('i');
        chevronIcon.className = 'fa-solid fa-chevron-right'; 
        chevronLink.appendChild(chevronIcon);
        folderTitleIndicator.appendChild(chevronLink)
    }

    const currentFolderLink = document.createElement('a');
    currentFolderLink.className = 'rounded-pill folder-locator';

    if (folderId === `root-${userId}`) {
        currentFolderLink.textContent = 'Home';
    } else {
        currentFolderLink.textContent = folderDoc.data().folderName;
    }

    folderTitleIndicator.appendChild(currentFolderLink);

    folderTitleIndicator.classList.remove('d-none');
}

// Function to delete a folder and its child folders recursively
async function deleteFolder(folderId) {
    const folderRef = doc(db, `assets/${userId}/folders`, folderId);
    
    const childFoldersQuery = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", folderId));
    const childFoldersSnapshot = await getDocs(childFoldersQuery);
    
    const deletePromises = childFoldersSnapshot.docs.map(doc => {
        return deleteFolder(doc.id); // Recursive call
    });

    await Promise.all(deletePromises);
    
    await deleteDoc(folderRef);

    console.log(`Folder with ID ${folderId} deleted successfully.`);
}

document.addEventListener("DOMContentLoaded", () => {
    const deleteFolderBtn = document.getElementById('deleteFolderBtn');

    if (deleteFolderBtn) {
        deleteFolderBtn.addEventListener('click', async () => {
            const folderId = getFolderIdFromUrl(); 
            const confirmDelete = confirm("Are you sure you want to delete this folder and all its contents? This action cannot be undone.");
            
            if (confirmDelete) {
                showLoader();
                try {
                    await deleteFolder(folderId);
                    alert("Folder deleted successfully.");
                    window.location.href = `home.html?folderId=root-${userId}`;
                } catch (error) {
                    console.error("Error deleting folder: ", error);
                    alert("Error deleting folder. Please try again.");
                } finally {
                    hideLoader();
                }
            }
        });
    } else {
        console.error('deleteFolderBtn element not found.');
    }
});

