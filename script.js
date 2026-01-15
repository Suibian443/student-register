// =========================================================
// 1. SECURITY & INITIALIZATION (Runs Immediately)
// =========================================================
(function secureApp() {
    const isLogged = sessionStorage.getItem("isLoggedIn");
    const savedRole = sessionStorage.getItem("userRole");
    const path = window.location.pathname;

    // 🛑 1. SECURITY REDIRECT
    // If NOT logged in, kick them out of protected pages
    if (isLogged !== "true") {
        if (path.includes("attendance.html") || path.includes("results.html")) {
            window.location.href = "index.html";
        }
    }

    // 🔄 2. UI RESTORATION (Wait for page to be ready)
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

            // 2. Unlock the Main Page (if we are on it)
            if (pinOverlay && mainContent) {
                pinOverlay.style.display = 'none';
                mainContent.style.display = 'block';
                
                // Restore Admin Mode if needed
                if (savedRole === 'admin') {
                    document.body.classList.add('admin-mode');
                }
                
                // Load the student list
                setTimeout(displayStudents, 100);
            }

            // 3. Highlight the correct icon
            highlightActiveIcon(path);
        } 
        // CASE B: User is NOT LOGGED IN
        else {
            // Ensure Bar is Hidden
            if (navBar) navBar.style.setProperty('display', 'none', 'important');
        }
    });
})();

// 🚨 SAFETY NET: GUARANTEE BAR VISIBILITY
// This runs every 500ms to force the bar to appear if it accidentally hides
setInterval(() => {
    const isLogged = sessionStorage.getItem("isLoggedIn");
    const navBar = document.querySelector('.bottom-nav');
    if (isLogged === "true" && navBar) {
        // Only force it if it's currently hidden
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

    buttons.forEach(btn => btn.classList.remove('active')); // Reset all
    
    if (path.includes("attendance.html")) buttons[1].classList.add('active');
    else if (path.includes("results.html")) buttons[2].classList.add('active');
    else buttons[0].classList.add('active'); // Default to Student
}

// =========================================================
// 3. LOGIN & LOGOUT LOGIC
// =========================================================
let currentUserRole = 'guest'; // Default
let currentSort = 'roll';

function checkPin(role) {
    const inputField = document.getElementById('pinInput');
    const input = inputField.value;
    const adminPin = "1578"; 
    const guestPin = "0000";

    if ((role === 'admin' && input === adminPin) || (role === 'guest' && input === guestPin)) {
        currentUserRole = role;

        // 1. Save Session
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", role);

        // 2. Unlock Interface
        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';

        // 3. Force Nav Bar (Immediate)
        const navBar = document.querySelector('.bottom-nav');
        if (navBar) navBar.style.setProperty('display', 'flex', 'important');

        // 4. Set Mode
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
    let name = document.getElementById("name").value.trim();
    // Capitalize Name
    name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const roll = document.getElementById("roll").value.trim();
    const studentClass = document.getElementById("class").value;
    const guardian = document.getElementById("guardian").value;
    const phone = document.getElementById("phone").value;
    const notes = document.getElementById("notes").value;
    const editIndex = document.getElementById("editIndex").value;

    if (!name || !roll || !studentClass) {
        return showToast("⚠️ Please fill all required fields!");
    }

    let students = JSON.parse(localStorage.getItem("students")) || [];
    
    // Duplicate Check
    const isDuplicate = students.some((s, i) => 
        s.roll === roll && s.studentClass === studentClass && i != editIndex
    );

    if (isDuplicate) {
        return showToast(`⚠️ Roll ${roll} is already taken in Class ${studentClass}!`);
    }

    const studentData = { name, roll, studentClass, guardian, phone, notes };

    if (editIndex === "") {
        students.push(studentData);
    } else {
        students[editIndex] = studentData;
        document.getElementById("editIndex").value = "";
        document.getElementById("submitBtn").innerText = "Add Student";
        
        // Close the details panel if open
        const details = document.getElementById("studentFormDetails");
        if(details) details.open = false; 
    }

    localStorage.setItem("students", JSON.stringify(students));
    resetForm();
    displayStudents();
    showToast("✅ Student Saved!");
}

function displayStudents() {
    const tbody = document.getElementById("studentList");
    if(!tbody) return; // Guard clause

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
    
    // Check Role for buttons
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
    ["name", "roll", "class", "guardian", "phone", "notes"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
    document.getElementById("editIndex").value = "";
    document.getElementById("submitBtn").innerText = "Add Student";
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

    let html = `<div class="stat-card"><span class="stat-label">Total</span><span class="stat-value">${students.length}</span></div>`;
    Object.keys(counts).forEach(cls => { 
        html += `<div class="stat-card"><span class="stat-label">Class ${cls}</span><span class="stat-value">${counts[cls]}</span></div>`; 
    });
    dashboard.innerHTML = html;
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || "light";
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem("theme", newTheme); 
    const btn = document.querySelector(".theme-toggle");
    if(btn) btn.innerText = newTheme === "dark" ? "☀️" : "🌙";
}

// Auto-Load Theme
(function loadSavedTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.setAttribute("data-theme", savedTheme);
    const btn = document.querySelector(".theme-toggle");
    if(btn) btn.innerText = savedTheme === "dark" ? "☀️" : "🌙";
})();

function clearAllData() {
    if(confirm("DANGER: Delete ALL Data?")) {
        localStorage.clear();
        location.reload();
    }
}

// =========================================================
// 6. EXPORT & BACKUP
// =========================================================
function exportToCSV() {
    let students = JSON.parse(localStorage.getItem("students")) || [];
    let attendanceData = JSON.parse(localStorage.getItem("attendance_records")) || {};
    let resultsData = JSON.parse(localStorage.getItem("results_data")) || {};

    const subjects = ['Math', 'English', 'Science'];
    const standardExams = ['MidTerm', 'Final']; 

    let header = "Name,Roll,Class,Guardian,Phone,Total Present,Total Absent,Notes";
    subjects.forEach(sub => {
        standardExams.forEach(ex => header += `,${sub} (${ex})`);
    });
    let csv = header + "\n";

    students.forEach(s => {
        // Attendance Count
        let present = 0, absent = 0;
        const uniqueId = `_${s.studentClass}_${s.roll}`;
        Object.keys(attendanceData).forEach(key => {
            if (key.includes(uniqueId)) {
                if (attendanceData[key] === true) present++; else absent++;
            }
        });

        // Base Info
        let row = `"${s.name}","${s.roll}","${s.studentClass}","${s.guardian}","${s.phone}","${present}","${absent}","${s.notes}"`;

        // Marks
        subjects.forEach(sub => {
            standardExams.forEach(ex => {
                const key = `${ex}_${sub}_${s.studentClass}_${s.roll}`;
                row += `,${resultsData[key] || "-"}`;
            });
        });

        csv += row + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Master_Report.csv'; a.click();
}

function backupJSON() {
    try {
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            try { backupData[key] = JSON.parse(value); } 
            catch (e) { backupData[key] = value; }
        }
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; 
        a.download = `Student_Register_Backup_${new Date().toISOString().slice(0,10)}.json`; 
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        showToast("✅ Backup Downloaded!");
    } catch (err) { alert("Backup Failed: " + err.message); }
}

function restoreJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { 
        try {
            const data = JSON.parse(e.target.result);
            localStorage.clear();
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'object') localStorage.setItem(key, JSON.stringify(data[key]));
                else localStorage.setItem(key, data[key]);
            });
            showToast("✅ System Restored!"); 
            setTimeout(() => location.reload(), 1500);
        } catch (err) { alert("Error: Invalid Backup File."); }
    };
    reader.readAsText(file);
}
