// =========================================================
// 1. GLOBAL VARIABLES & IMMEDIATE SESSION CHECK
// =========================================================
let currentUserRole = 'guest';
let currentSort = 'roll';

// 🛑 THIS RUNS IMMEDIATELY WHEN PAGE LOADS
(function initApp() {
    const isLogged = sessionStorage.getItem("isLoggedIn");
    const savedRole = sessionStorage.getItem("userRole");
    
    const pinOverlay = document.getElementById('pinOverlay');
    const mainContent = document.getElementById('mainContent');

    // If user was already logged in...
    if (isLogged === "true" && pinOverlay && mainContent) {
        // 1. Restore Role
        currentUserRole = savedRole || 'guest';

        // 2. Hide PIN Screen / Show App
        pinOverlay.style.display = 'none';
        mainContent.style.display = 'block';

        // 3. Apply Admin Visuals if needed
        if (currentUserRole === 'admin') {
            document.body.classList.add('admin-mode');
        }

        // 4. Load Data
        // We wait a tiny bit to ensure DOM is ready for the table
        setTimeout(displayStudents, 50);
    }
})();

// =========================================================
// 2. LOGIN & LOGOUT LOGIC
// =========================================================
function checkPin(role) {
    const inputField = document.getElementById('pinInput');
    const input = inputField.value;
    const adminPin = "1578"; 
    const guestPin = "0000";

    if ((role === 'admin' && input === adminPin) || (role === 'guest' && input === guestPin)) {
        currentUserRole = role;
        
        // ✅ SAVE SESSION: This fixes the "Back Button" issue
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", role);

        document.getElementById('pinOverlay').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
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
    // Clear session and reload to show PIN screen
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("userRole");
    location.reload(); 
}

// =========================================================
// 3. STUDENT MANAGEMENT (CRUD)
// =========================================================
function saveStudent() {
    let name = document.getElementById("name").value.trim();
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
        document.getElementById("studentFormDetails").open = false; 
    }

    localStorage.setItem("students", JSON.stringify(students));
    resetForm();
    displayStudents();
    showToast("✅ Student Saved!");
}

function displayStudents() {
    const tbody = document.getElementById("studentList");
    if(!tbody) return; // Guard clause in case we run too early

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

    students.forEach((s) => {
        const nameMatch = (s.name || "").toLowerCase().includes(search);
        const rollMatch = (s.roll || "").toString().toLowerCase().includes(search);
        const noteMatch = (s.notes || "").toLowerCase().includes(search);
        const phoneMatch = (s.phone || "").toString().includes(search);
        const guardianMatch = (s.guardian || "").toLowerCase().includes(search);

        const matchesSearch = nameMatch || rollMatch || noteMatch || phoneMatch || guardianMatch;
        const matchesFilter = filter === "" || s.studentClass === filter;

        if (matchesSearch && matchesFilter) {
            const actions = (currentUserRole === 'admin') ? 
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
    ["name", "roll", "class", "guardian", "phone", "notes"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("editIndex").value = "";
    document.getElementById("submitBtn").innerText = "Add Student";
}

function setSort(criteria) {
    currentSort = criteria;
    displayStudents();
}

// =========================================================
// 4. UTILITIES (Toast, Stats, Theme)
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
    let html = `<div class="stat-card"><span class="stat-label">Total</span><span class="stat-value">${students.length}</span></div>`;
    Object.keys(counts).forEach(cls => { 
        html += `<div class="stat-card"><span class="stat-label">Class ${cls}</span><span class="stat-value">${counts[cls]}</span></div>`; 
    });
    const dashboard = document.getElementById("statsDashboard");
    if(dashboard) dashboard.innerHTML = html;
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
// 5. EXPORT & BACKUP (Corrected)
// =========================================================
function exportToCSV() {
    let students = JSON.parse(localStorage.getItem("students")) || [];
    let attendanceData = JSON.parse(localStorage.getItem("attendance_records")) || {};
    let resultsData = JSON.parse(localStorage.getItem("results_data")) || {};

    // 🛑 LIMITED TO 3 SUBJECTS AS REQUESTED
    const subjects = ['Math', 'English', 'Science'];
    const standardExams = ['MidTerm', 'Final']; 

    let header = "Name,Roll,Class,Guardian,Phone,Total Present,Total Absent,Notes";
    subjects.forEach(sub => {
        standardExams.forEach(ex => header += `,${sub} (${ex})`);
    });
    let csv = header + "\n";

    students.forEach(s => {
        // Attendance
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
