// ============================================================
// 1. Firebase Configuration - NEW SECURE KEY
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyA1PUbGQSYXh41L4_NVX6_X57LDNlaAF4g",
    authDomain: "aceed-tutoring.firebaseapp.com",
    projectId: "aceed-tutoring",
    storageBucket: "aceed-tutoring.firebasestorage.app",
    messagingSenderId: "225577605291",
    appId: "1:225577605291:web:75327bc4e1f644cef47fee"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// 2. Check if User is Logged In (for protected pages)
// ============================================================
function checkAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(user => {
            if (user) {
                resolve(user);
            } else {
                resolve(null);
            }
        });
    });
}

// ============================================================
// 3. Register New User (Sign Up)
// ============================================================
async function registerUser(email, password, fullName, phone) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            fullName: fullName,
            email: email,
            phone: phone,
            role: 'student',
            createdAt: new Date().toISOString()
        });

        return { success: true, user: user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================
// 4. Login User (Sign In)
// ============================================================
async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================
// 5. Logout User
// ============================================================
async function logoutUser() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================================
// 6. Get Current User Data
// ============================================================
async function getCurrentUser() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async user => {
            if (user) {
                try {
                    const doc = await db.collection('users').doc(user.uid).get();
                    if (doc.exists) {
                        resolve({ ...user, ...doc.data() });
                    } else {
                        resolve({ ...user });
                    }
                } catch (error) {
                    resolve({ ...user });
                }
            } else {
                resolve(null);
            }
        });
    });
}

// ============================================================
// 7. Update Navigation Based on Auth Status
// ============================================================
function updateNavButtons() {
    const signinBtn = document.getElementById('signinBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardLink = document.getElementById('dashboardLink');

    auth.onAuthStateChanged(user => {
        if (user) {
            // Logged in
            if (signinBtn) signinBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (dashboardLink) dashboardLink.style.display = 'inline-block';
        } else {
            // Logged out
            if (signinBtn) signinBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (dashboardLink) dashboardLink.style.display = 'none';
        }
    });
}

// ============================================================
// 8. Check if Content Should Be Protected
// ============================================================
function protectPage() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Redirect to signin.html in the root folder
            window.location.href = '/signin.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
    });
}
// ============================================================
// 9. Show/Hide Content Based on Auth
// ============================================================
function showContentIfLoggedIn(elementId) {
    const element = document.getElementById(elementId);
    auth.onAuthStateChanged(user => {
        if (element) {
            element.style.display = user ? 'block' : 'none';
        }
    });
}

// ============================================================
// 10. Show/Hide Content Based on Auth (Reversed)
// ============================================================
function showContentIfLoggedOut(elementId) {
    const element = document.getElementById(elementId);
    auth.onAuthStateChanged(user => {
        if (element) {
            element.style.display = user ? 'none' : 'block';
        }
    });
}

// ============================================================
// 11. Run updateNavButtons when page loads
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    updateNavButtons();
});
