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
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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

function getFolderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('folderId');
}

let userId;

// Show loader on window change
window.addEventListener('beforeunload', showLoader);

// Hide loader after window loads
window.addEventListener('load', hideLoader);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid; // Fetch user ID

        // Get folderId from URL
        const folderId = getFolderIdFromUrl();

        // Redirect to root folder if folderId is invalid or not provided
        if (!folderId || folderId === 'null') {
            window.location.href = `home.html?folderId=root-${userId}`; // Redirect to the root folder
            return; // Exit to prevent further execution
        }

        // Check if the folderId exists in Firestore
        const folderRef = doc(db, `assets/${userId}/folders`, folderId);
        const folderDoc = await getDoc(folderRef);

        if (!folderDoc.exists()) {
            // If folder doesn't exist, redirect to root folder
            window.location.href = `home.html?folderId=root-${userId}`;
            return; // Exit to prevent further execution
        }

        // Load folders and files that belong to the current folderId
        showLoader();
        await loadFolders(folderId);
        await updateFolderTitleIndicator(folderId); // Update the folder title indicator
        hideLoader();
    } else {
        // User is signed out, redirect to login page
         window.location.href = 'index.html';
    }
});

// Load folders and files that belong to the current folderId
async function loadFolders(parentId) {
    showLoader();
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = '';

    const q = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", parentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        hideLoader(); // Ensure loader is hidden if no folders are found
        return;
    }

    querySnapshot.forEach((doc) => {
        const folderData = doc.data();
        
        // Create the column div
        const colDiv = document.createElement('div');
        colDiv.classList.add('col-10', 'col-md-4', 'col-lg-3', 'mt-2');

        // Create the folder-tile div
        const folderTileDiv = document.createElement('div');
        folderTileDiv.classList.add('folder-tile');

        // Create the folder link
        const folderLink = document.createElement('a');
        folderLink.classList.add('folder-icon');
        folderLink.href = `home.html?folderId=${doc.id}`;
        
        // Create the folder icon
        const folderIcon = document.createElement('i');
        folderIcon.classList.add('fas', 'fa-folder');

        // Create the folder name
        const folderTitleP = document.createElement('p');
        folderTitleP.classList.add('folder-title', 'folder-title-p');
        folderTitleP.textContent = folderData.folderName;

        // Append icon and title to the link
        folderLink.appendChild(folderIcon);
        folderLink.appendChild(folderTitleP);

        // Create the dropdown button
        const dropdownDiv = document.createElement('div');
        dropdownDiv.classList.add('dropdown');

        const dropdownButton = document.createElement('button');
        dropdownButton.classList.add('folder-three-dots', 'btn');
        dropdownButton.setAttribute('data-bs-toggle', 'dropdown');
        dropdownButton.setAttribute('aria-expanded', 'false');

        const threeDotsIcon = document.createElement('i');
        threeDotsIcon.classList.add('fas', 'fa-ellipsis-v');

        dropdownButton.appendChild(threeDotsIcon);

        // Create the dropdown menu
        const dropdownMenu = document.createElement('ul');
        dropdownMenu.classList.add('dropdown-menu', 'dropdown-menu-end', 'mt-2', 'rounded-1', 'border-0');
        dropdownMenu.setAttribute('aria-labelledby', 'dropdownMenuButton');
        dropdownMenu.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';

        // Dropdown items
        const actions = [
            { icon: './img/open_file_icon.png', label: 'Open', href: `home.html?folderId=${doc.id}` },
            { icon: './img/download_icon.png', label: 'Download', href: '#' },
            { icon: './img/star_icon.png', label: 'Starred', href: '#' },
            { icon: './img/delete_icon.png', label: 'Delete', action: () => deleteFolder(doc.id) },
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

            // Attach click event for delete action
            if (action.label === 'Delete') {
                a.addEventListener('click', async (event) => {
                    event.preventDefault(); // Prevent default link behavior
                    const confirmDelete = confirm("Are you sure you want to delete this folder?");
                    if (confirmDelete) {
                        const parentFolderId = folderData.parentFolderId; // Save parent folder ID
                        await deleteFolder(doc.id);
                        await loadFolders(parentFolderId); // Reload the folders after deletion
                        await updateFolderTitleIndicator(parentFolderId); // Update folder title indicator
                    }
                });
            }
        });

        // Append dropdown button and menu
        dropdownDiv.appendChild(dropdownButton);
        dropdownDiv.appendChild(dropdownMenu);

        // Append folder link and dropdown to folder-tile div
        folderTileDiv.appendChild(folderLink);
        folderTileDiv.appendChild(dropdownDiv);

        // Append the folder-tile div to the column div
        colDiv.appendChild(folderTileDiv);

        // Append the column div to the folder list
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

    // Close the modal
    const modalElement = bootstrap.Modal.getInstance(document.getElementById('newFolderModal'));
    modalElement.hide(); // Close the modal

    // Show the loader
    showLoader();

    try {
        // Add the new folder to Firestore
        await addDoc(collection(db, `assets/${userId}/folders`), {
            folderName: folderName,
            parentFolderId: folderId, // Use the folderId from the URL
            createdAt: new Date(),
        });

        document.getElementById('status').textContent = `Folder '${folderName}' created successfully!`;
        document.getElementById('newFolderName').value = ""; // Clear input

        // Refresh the folder list
        await loadFolders(folderId);

        // Hide the loader after the folder is created
        hideLoader();
    } catch (e) {
        console.error("Error creating folder: ", e);
        document.getElementById('status').textContent = "Error creating folder.";
        
        // Hide the loader in case of error
        hideLoader();
    }
});

async function updateFolderTitleIndicator(folderId) {
    const folderTitleIndicator = document.getElementById('folderTitleIndicator');
    folderTitleIndicator.innerHTML = ''; // Clear previous content

    // Create and append root folder link
    const rootLink = document.createElement('a');
    rootLink.href = `home.html?folderId=root-${userId}`; // Link to the user's root folder
    rootLink.className = 'rounded-pill folder-locator';

    const rootIcon = document.createElement('i');
    rootIcon.className = 'fa-solid fa-folder-tree'; // Root icon
    rootLink.appendChild(rootIcon);
    
    folderTitleIndicator.appendChild(rootLink);

    // Fetch folder hierarchy
    const folderRef = doc(db, `assets/${userId}/folders`, folderId);
    const folderDoc = await getDoc(folderRef);

    if (!folderDoc.exists()) {
        return;
    }

    let currentFolderId = folderId;
    let parentFolderId = folderDoc.data().parentFolderId;

    // Create parent folder chevron link
    if (parentFolderId) {
        const chevronLink = document.createElement('a');
        chevronLink.href = `home.html?folderId=${parentFolderId}`; // Link to the parent folder
        chevronLink.className = 'd-flex px-3 rounded-pill align-items-center fs-small button folder-locator';
        
        const chevronIcon = document.createElement('i');
        chevronIcon.className = 'fa-solid fa-chevron-left'; // Chevron left icon
        chevronLink.appendChild(chevronIcon);
        
        folderTitleIndicator.appendChild(chevronLink);
    }
    else{
        const chevronLink = document.createElement('a');
        chevronLink.className = 'd-flex p-2 rounded-pill fs-small align-items-center';
        const chevronIcon = document.createElement('i');
        chevronIcon.className = 'fa-solid fa-chevron-right'; // Chevron left icon
        chevronLink.appendChild(chevronIcon);
        folderTitleIndicator.appendChild(chevronLink)
    }

    // Create current folder link
    const currentFolderLink = document.createElement('a');
    currentFolderLink.className = 'rounded-pill folder-locator';

    // Set the current folder's name or "Home" if it's the root folder
    if (folderId === `root-${userId}`) {
        currentFolderLink.textContent = 'Home'; // Show "Home" for the root folder
    } else {
        currentFolderLink.textContent = folderDoc.data().folderName; // Use actual folder name
    }

    folderTitleIndicator.appendChild(currentFolderLink);

    // Show the folder title indicator
    folderTitleIndicator.classList.remove('d-none');
}

// Function to delete a folder and its child folders recursively
async function deleteFolder(folderId) {
    const folderRef = doc(db, `assets/${userId}/folders`, folderId);
    
    // Get child folders
    const childFoldersQuery = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", folderId));
    const childFoldersSnapshot = await getDocs(childFoldersQuery);
    
    // Recursively delete child folders
    const deletePromises = childFoldersSnapshot.docs.map(doc => {
        return deleteFolder(doc.id); // Recursive call
    });

    // Wait for all child folders to be deleted
    await Promise.all(deletePromises);
    
    // Now delete the current folder
    await deleteDoc(folderRef);

    console.log(`Folder with ID ${folderId} deleted successfully.`);
}

// Example button click listener for delete action
document.getElementById('deleteFolderBtn').addEventListener('click', async () => {
    const folderId = getFolderIdFromUrl(); // Get the current folder ID
    const confirmDelete = confirm("Are you sure you want to delete this folder and all its contents? This action cannot be undone.");
    
    if (confirmDelete) {
        showLoader(); // Show loader while processing
        try {
            await deleteFolder(folderId); // Call the delete function
            alert("Folder deleted successfully."); // Notify user
            window.location.href = `home.html?folderId=root-${userId}`; // Redirect to root or desired page
        } catch (error) {
            console.error("Error deleting folder: ", error);
            alert("Error deleting folder. Please try again."); // Notify user of error
        } finally {
            hideLoader(); // Hide loader after processing
        }
    }
});
