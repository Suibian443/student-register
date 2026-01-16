// =========================================================
// 1. SECURITY & INITIALIZATION (Runs Immediately)
// =========================================================
(function secureApp() {
    const isLogged = sessionStorage.getItem("isLoggedIn");
    const savedRole = sessionStorage.getItem("userRole");
    const path = window.location.pathname;

    // 🛑 1. SECURITY REDIRECT
    if (isLogged !== "true") {
        if (path.includes("attendance.html") || path.includes("results.html")) {
            window.location.href = "index.html";
        }
    }

    // 🔄 2. UI RESTORATION
    window.addEventListener('load', () => {
        const navBar = document.querySelector('.bottom-nav');
        const pinOverlay = document.getElementById('pinOverlay');
        const mainContent = document.getElementById('mainContent');

        // CASE A: User is LOGGED IN
        if (isLogged === "true") {
            // 1. Force the Bar to Show
            if (navBar) {
                navBar.style.setProperty('display', 'flex', 'important');
            }

            // 2. Unlock the Main Page
            if (pinOverlay && mainContent) {
                pinOverlay.style.display = 'none';
                mainContent.style.display = 'block';
                
                if (savedRole === 'admin') {
                    document.body.classList.add('admin-mode');
                }
                setTimeout(displayStudents, 100);
            }

            highlightActiveIcon(path);
        } 
        // CASE B: User is NOT LOGGED IN
        else {
            if (navBar) navBar.style.setProperty('display', 'none', 'important');
        }
    });
})();

// 🚨 SAFETY NET: GUARANTEE BAR VISIBILITY
setInterval(() => {
    const isLogged = sessionStorage.getItem("isLoggedIn");
    const navBar = document.querySelector('.bottom-nav');
    if (isLogged === "true" && navBar) {
        if (getComputedStyle(navBar).display === 'none') {
            navBar.style.setProperty('display', 'flex', 'important');
        }
    }
}, 500);

// =========================================================
// 2. HELPER: Highlight Active Icon
// =========================================================
function highlightActiveIcon(path) {
    const buttons = document.querySelectorAll('.nav-item');
    if (!buttons || buttons.length < 3) return;

    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (path.includes("attendance.html")) buttons[1].classList.add('active');
    else if (path.includes("results.html")) buttons[2].classList.add('active');
    else buttons[0].classList.add('active');
}

// =========================================================
// 3. LOGIN & LOGOUT LOGIC
// =========================================================
let currentUserRole = 'guest'; 
let currentSort = 'roll';

function checkPin(role) {
    const inputField = document.getElementById('pinInput');
    const input = inputField.value;
    const adminPin = "1578"; 
    const guestPin = "0000";

    if ((role === 'admin' && input === adminPin) || (role === 'guest' && input === guestPin)) {
        currentUserRole = role;

        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", role);

        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        const navBar = document.querySelector('.bottom-nav');
        if (navBar) navBar.style.setProperty('display', 'flex', 'important');

        if(role === 'admin') {
            document.body.classList.add('admin-mode');
        }
        displayStudents();
    } else {
        alert("Incorrect PIN!");
        inputField.value = "";
    }
}

function logout() {
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userRole");
    location.reload(); 
}

// =========================================================
// 4. STUDENT MANAGEMENT (CRUD)
// =========================================================
function saveStudent() {
    // 1. Get Values
    let name = document.getElementById("name").value.trim();
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const roll = document.getElementById("roll").value.trim();
    const studentClass = document.getElementById("class").value;
    const guardian = document.getElementById("guardian").value;
    const phone = document.getElementById("phone").value;
    const notes = document.getElementById("notes").value;
    const editIndex = document.getElementById("editIndex").value; 

    // 2. Validation
    if (!name || !roll || !studentClass) {
        return showToast("⚠️ Please fill Name, Roll, and Class!");
    }

    let students = JSON.parse(localStorage.getItem("students")) || [];

    // 3. DUPLICATE CHECK
    // Only checks for duplicates if we are NOT editing that specific student
    const isDuplicate = students.some((s, i) => 
        s.roll.toString() === roll.toString() && 
        s.studentClass.toString() === studentClass.toString() && 
        i.toString() !== editIndex.toString() 
    );

    if (isDuplicate) {
        return showToast(`⚠️ Error: Roll ${roll} already exists in Class ${studentClass}!`);
    }

    const studentData = { name, roll, studentClass, guardian, phone, notes };

    if (editIndex === "") {
        // CASE A: NEW STUDENT
        students.push(studentData);
        showToast("✅ Student Added!");
    } else {
        // CASE B: EDITING EXISTING
        students[editIndex] = studentData;
        showToast("✅ Student Info Updated!");
        
        const details = document.getElementById("studentFormDetails");
        if(details) details.removeAttribute("open");
    }

    localStorage.setItem("students", JSON.stringify(students));
    
    displayStudents();
    resetForm(); 
}

function displayStudents() {
    const tbody = document.getElementById("studentList");
    if(!tbody) return; 

    const searchInput = document.getElementById("search");
    const filterInput = document.getElementById("filterClass");
    
    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const filter = filterInput ? filterInput.value : "";
    
    let students = JSON.parse(localStorage.getItem("students")) || [];

    // Sorting
    students.sort((a, b) => {
        if (currentSort === 'roll') {
            if (a.studentClass !== b.studentClass) {
                return parseInt(a.studentClass || 0) - parseInt(b.studentClass || 0);
            }
            return parseInt(a.roll || 0) - parseInt(b.roll || 0);
        } else if (currentSort === 'name') {
            return (a.name || "").localeCompare(b.name || "");
        } else if (currentSort === 'notes') {
            return (a.notes || "").toLowerCase().localeCompare((b.notes || "").toLowerCase());
        }
    });

    tbody.innerHTML = "";
    
    const role = sessionStorage.getItem("userRole") || 'guest';

    students.forEach((s) => {
        const nameMatch = (s.name || "").toLowerCase().includes(search);
        const rollMatch = (s.roll || "").toString().toLowerCase().includes(search);
        const noteMatch = (s.notes || "").toLowerCase().includes(search);
        const phoneMatch = (s.phone || "").toString().includes(search);
        const guardianMatch = (s.guardian || "").toLowerCase().includes(search);

        const matchesSearch = nameMatch || rollMatch || noteMatch || phoneMatch || guardianMatch;
        const matchesFilter = filter === "" || s.studentClass === filter;

        if (matchesSearch && matchesFilter) {
            const actions = (role === 'admin') ? 
                `<button onclick="editStudent('${s.roll}', '${s.studentClass}')" class="btn-edit">Edit</button>
                 <button onclick="deleteStudent('${s.roll}', '${s.studentClass}')" class="btn-delete">Delete</button>` : 
                `<span>View Only</span>`;

            const phoneDisplay = s.phone 
                ? `<a href="tel:${s.phone}" style="color:var(--primary); text-decoration:none; font-weight:bold;">${s.phone}</a>` 
                : "-";

            tbody.innerHTML += `
                <tr>
                    <td data-label="Name"><strong>${s.name}</strong></td>
                    <td data-label="Roll">${s.roll}</td>
                    <td data-label="Class">${s.studentClass}</td>
                    <td data-label="Guardian">${s.guardian || "-"}</td>
                    <td data-label="Phone">${phoneDisplay}</td>
                    <td data-label="Notes">${s.notes || "-"}</td>
                    <td data-label="Action">${actions}</td>
                </tr>`;
        }
    });
    updateDashboard();
}

function editStudent(roll, studentClass) {
    let students = JSON.parse(localStorage.getItem("students")) || [];
    const index = students.findIndex(s => s.roll === roll && s.studentClass === studentClass);
    if (index === -1) return;
    const s = students[index];

    document.getElementById("name").value = s.name;
    document.getElementById("roll").value = s.roll;
    document.getElementById("class").value = s.studentClass;
    document.getElementById("guardian").value = s.guardian;
    document.getElementById("phone").value = s.phone;
    document.getElementById("notes").value = s.notes;
    
    document.getElementById("editIndex").value = index;
    
    // Change Button Text
    document.getElementById("submitBtn").innerText = "Update Info";
    
    const formDetails = document.getElementById("studentFormDetails");
    if (formDetails) {
        formDetails.open = true;
        formDetails.scrollIntoView({ behavior: 'smooth' });
    }
}

function deleteStudent(roll, studentClass) {
    if(confirm("Delete this student?")) {
        let students = JSON.parse(localStorage.getItem("students")) || [];
        const index = students.findIndex(s => s.roll === roll && s.studentClass === studentClass);
        if (index > -1) {
            students.splice(index, 1);
            localStorage.setItem("students", JSON.stringify(students));
            displayStudents();
        }
    }
}

function resetForm() {
    // 1. Clear text
    ["name", "roll", "guardian", "phone", "notes"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
    
    // 2. Clear Edit ID
    document.getElementById("editIndex").value = "";
    
    // 3. Reset Button Text
    const btn = document.getElementById("submitBtn");
    if(btn) btn.innerText = "Add Student";
    
    // 4. Close form
    const details = document.getElementById("studentFormDetails");
    if(details) details.removeAttribute("open");
}

function setSort(criteria) {
    currentSort = criteria;
    displayStudents();
}

// =========================================================
// 5. UTILITIES (Toast, Stats, Theme)
// =========================================================
function showToast(message) {
    const toast = document.getElementById("toast-box");
    if(toast) {
        toast.innerText = message;
        toast.classList.add("show");
        setTimeout(() => { toast.classList.remove("show"); }, 3000);
    } else { alert(message); }
}

function updateDashboard() {
    const students = JSON.parse(localStorage.getItem("students")) || [];
    const counts = { "6": 0, "7": 0, "8": 0, "9": 0, "10": 0 };
    students.forEach(s => { if(counts[s.studentClass] !== undefined) counts[s.studentClass]++; });
    
    const dashboard = document.getElementById("statsDashboard");
    if (!dashboard) return;

    let html = `<div class="
