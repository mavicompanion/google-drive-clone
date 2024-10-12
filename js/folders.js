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
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

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
        hideLoader();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadFolders(parentId) {
    showLoader();
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = '';

    const q = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", parentId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        hideLoader();
        return;
    }

    querySnapshot.forEach((doc) => {
        const folderData = doc.data();
        const colDiv = document.createElement('div');
        colDiv.classList.add('col-10', 'col-md-4', 'col-lg-3', 'mt-2');

        const folderTileDiv = document.createElement('div');
        folderTileDiv.classList.add('folder-tile');

        const folderLink = document.createElement('a');
        folderLink.classList.add('folder-icon');
        folderLink.href = `home.html?folderId=${doc.id}`;

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

            if (action.label === 'Delete') {
                a.addEventListener('click', async (event) => {
                    event.preventDefault();
                    const confirmDelete = confirm("Are you sure you want to delete this folder?");
                    if (confirmDelete) {
                        const parentFolderId = folderData.parentFolderId;
                        await deleteFolder(doc.id);
                        await loadFolders(parentFolderId);
                        await updateFolderTitleIndicator(parentFolderId);
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

document.getElementById('createFolderBtn').addEventListener('click', async () => {
    const folderName = document.getElementById('newFolderName').value.trim();
    const folderId = getFolderIdFromUrl();

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

        document.getElementById('status').textContent = `Folder '${folderName}' created successfully!`;
        document.getElementById('newFolderName').value = "";

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
    } else {
        const chevronLink = document.createElement('a');
        chevronLink.className = 'd-flex p-2 rounded-pill fs-small align-items-center';
        const chevronIcon = document.createElement('i');
        chevronIcon.className = 'fa-solid fa-folder';
        chevronLink.appendChild(chevronIcon);
        folderTitleIndicator.appendChild(chevronLink);
    }

    let foldersChain = [];
    
    while (parentFolderId) {
        const parentFolderRef = doc(db, `assets/${userId}/folders`, parentFolderId);
        const parentFolderDoc = await getDoc(parentFolderRef);
        
        if (parentFolderDoc.exists()) {
            foldersChain.push(parentFolderDoc.data().folderName);
            parentFolderId = parentFolderDoc.data().parentFolderId;
        } else {
            break;
        }
    }

    foldersChain.reverse().forEach(folderName => {
        const folderLink = document.createElement('a');
        folderLink.className = 'folder-title-p d-flex p-2 rounded-pill align-items-center fs-small';
        folderLink.textContent = folderName;
        folderTitleIndicator.appendChild(folderLink);
    });

    const currentFolderLink = document.createElement('a');
    currentFolderLink.className = 'current-folder fs-small text-bold';
    currentFolderLink.textContent = folderDoc.data().folderName;
    folderTitleIndicator.appendChild(currentFolderLink);
}

async function deleteFolder(folderId) {
    showLoader();
    
    const folderRef = doc(db, `assets/${userId}/folders`, folderId);
    await deleteDoc(folderRef);
    
    const q = query(collection(db, `assets/${userId}/folders`), where("parentFolderId", "==", folderId));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(async (doc) => {
        await deleteFolder(doc.id);
    });

    const qFiles = query(collection(db, `assets/${userId}/files`), where("folderId", "==", folderId));
    const querySnapshotFiles = await getDocs(qFiles);
    
    querySnapshotFiles.forEach(async (fileDoc) => {
        await deleteFile(fileDoc.id);
    });

    hideLoader();
}

async function deleteFile(fileId) {
    showLoader();

    const fileRef = doc(db, `assets/${userId}/files`, fileId);
    const fileDoc = await getDoc(fileRef);

    if (fileDoc.exists()) {
        const storageRef = ref(storage, `assets/${userId}/files/${fileDoc.data().fileName}`);
        await deleteObject(storageRef);
        await deleteDoc(fileRef);
    }

    hideLoader();
}
