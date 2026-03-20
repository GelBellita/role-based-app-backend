const API = 'http://localhost:3000';
let currentUser = null;

const STORAGE_KEY = "ipt_demo_v1";
window.db = {
  accounts:    [],
  departments: [],
  employees:   [],
  requests:    []
};

/* STORAGE*/

function getDefaultAccounts() {
  return [
    { firstName: "Admin", lastName: "Bellita",  username: "admin", email: "admin@gmail.com", role: "admin", verified: true },
    { firstName: "Alice", lastName: "Smith", username: "alice", email: "alice@gmail.com",  role: "user",  verified: true }
  ];
}

function getDefaultDepartments() {
  return [
    { id: "dept-1", name: "Engineering", desc: "Software and hardware engineering" },
    { id: "dept-2", name: "HR",          desc: "Human Resources" }
  ];
}

function loadFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) throw "empty";
    window.db = {
      accounts:    saved.accounts    && saved.accounts.length    ? saved.accounts    : getDefaultAccounts(),
      departments: saved.departments && saved.departments.length ? saved.departments : getDefaultDepartments(),
      employees:   saved.employees   || [],
      requests:    saved.requests    || []
    };
  } catch {
    window.db = {
      accounts:    getDefaultAccounts(),
      departments: getDefaultDepartments(),
      employees:   [],
      requests:    []
    };
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

/* AUTH */

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getDisplayEmail(usernameOrEmail) {
  if (!usernameOrEmail) return "";
  if (usernameOrEmail.includes("@")) return usernameOrEmail;
  const acc = window.db.accounts.find(function(a) {
    return a.username === usernameOrEmail;
  });
  if (acc && acc.email) return acc.email;

  return usernameOrEmail + "@gmail.com";
}

/* POP UP MESSAGE TOAST */

function showToast(message, type = "success") {
  const toastEl  = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");
  toastEl.className = `toast align-items-center text-white border-0 bg-${type}`;
  toastMsg.innerText = message;
  new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

/* ROUTING */

const privatePages = ["#/profile", "#/requests"];
const adminPages   = ["#/accounts", "#/departments", "#/employees"];

function navigateTo(hash) { window.location.hash = hash; }

function handleRouting() {
  const hash = window.location.hash || "#/";
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

  if (privatePages.includes(hash) && !currentUser) return navigateTo("#/login");
  if (adminPages.includes(hash)) {
    if (!currentUser)                 return navigateTo("#/login");
    if (currentUser.role !== "admin") return navigateTo("#/");
  }

  switch (hash) {
    case "#/register":
      showPage("register-page");
      break;
    case "#/login":
      showPage("login-page");
      const justVerified = sessionStorage.getItem("just_verified");
      if (justVerified) {
        document.getElementById("verified-alert").style.display = "block";
        sessionStorage.removeItem("just_verified");
      } else {
        document.getElementById("verified-alert").style.display = "none";
      }
      break;
    case "#/verify-email":
      showPage("verify-email-page");
      document.getElementById("verify-email-text").innerText =
        sessionStorage.getItem("unverified_email") || "";
      break;
    case "#/profile":
      showPage("profile-page");
      renderProfile();
      break;
    case "#/accounts":
      showPage("accounts-page");
      renderAccountsList();
      break;
    case "#/departments":
      showPage("departments-page");
      renderDepartmentsList();
      break;
    case "#/employees":
      showPage("employees-page");
      renderEmployeesTable();
      break;
    case "#/requests":
      showPage("requests-page");
      renderRequestsList();
      resetReqForm();
      break;
    default:
      showPage("home-page");
  }
}

function showPage(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

window.addEventListener("hashchange", handleRouting);

/* AUTH STATE */

function setAuthState(isAuth, user = null) {
  const body = document.body;
  if (isAuth) {
    currentUser = user;
    body.classList.remove("not-authenticated");
    body.classList.add("authenticated");
  
    var navAcc = window.db.accounts.find(function(a) {
      return a.username === user.username || a.email === user.username || a.email === getDisplayEmail(user.username);
    });
    var effectiveRole = (navAcc && navAcc.role) ? navAcc.role : user.role;
   
    currentUser.role = effectiveRole;

    if (effectiveRole === "admin") {
      body.classList.add("is-admin");
    } else {
      body.classList.remove("is-admin");
    }
    var navName = (navAcc && (navAcc.firstName || navAcc.lastName))
      ? (navAcc.firstName + " " + navAcc.lastName).trim()
      : user.username;
    document.getElementById("nav-username").innerText = navName;
  } else {
    currentUser = null;
    body.classList.remove("authenticated", "is-admin");
    body.classList.add("not-authenticated");
  }
}

function logout() {
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("currentUser");
  setAuthState(false);
  showToast("Logged out successfully.", "secondary");
  navigateTo("#/");
}

/* REGISTER  (calls /api/register)*/

document.getElementById("reg-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const first    = document.getElementById("reg-first").value.trim();
  const last     = document.getElementById("reg-last").value.trim();
  const username = document.getElementById("reg-email").value.trim();
  const pw       = document.getElementById("reg-pw").value;
  const err      = document.getElementById("reg-error");
  err.innerText  = "";

  if (pw.length < 6) { err.innerText = "Password must be at least 6 characters."; return; }

  try {
    const response = await fetch(`${API}/api/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password: pw })
    });

    const data = await response.json();

    if (response.ok) {
      
      window.db.accounts.push({
        firstName: first,
        lastName:  last,
        username:  username,
        email:     username,
        role:      "user",
        verified:  false
      });
      saveToStorage();
      sessionStorage.setItem("unverified_email", username);
      showToast("Account created! Please verify your email.");
      navigateTo("#/verify-email");
    } else {
      err.innerText = data.error || "Registration failed.";
    }
  } catch {
    err.innerText = "Network error. Is the backend running?";
  }
});

/* VERIFY */

function fakeVerify() {
  const username = sessionStorage.getItem("unverified_email");
  const acc = window.db.accounts.find(a => a.username === username || a.email === username);
  if (acc) {
    acc.verified = true;
    saveToStorage();
  }
  sessionStorage.setItem("just_verified", "1");
  sessionStorage.removeItem("unverified_email");
  navigateTo("#/login");
}

/* LOGIN  (calls /api/login)*/

async function login(usernameOrEmail, password) {
  
  const localAcc = window.db.accounts.find(function(a) {
    return a.email === usernameOrEmail || a.username === usernameOrEmail;
  });
  const username = (localAcc && localAcc.username) ? localAcc.username : usernameOrEmail;

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      sessionStorage.setItem('authToken', data.token);
      // Merge backend user with local account data 
      var merged = Object.assign({}, data.user);
      var localMatch = window.db.accounts.find(function(a) {
        return a.username === data.user.username || a.email === data.user.username || a.email === getDisplayEmail(data.user.username);
      });
      if (localMatch) {
        merged.role      = localMatch.role;
        merged.firstName = localMatch.firstName;
        merged.lastName  = localMatch.lastName;
        merged.email     = localMatch.email || data.user.username;
      }
      sessionStorage.setItem('currentUser', JSON.stringify(merged));
      setAuthState(true, merged);
      // Get full name for welcome popup
      var toastAcc = window.db.accounts.find(function(a) {
        return a.username === data.user.username || a.email === data.user.username || a.email === getDisplayEmail(data.user.username);
      });
      var toastName = (toastAcc && (toastAcc.firstName || toastAcc.lastName))
        ? (toastAcc.firstName + " " + toastAcc.lastName).trim()
        : data.user.username;
      showToast("Welcome back, " + toastName + "!");
      navigateTo("#/profile");
    } else {
      alert('Login failed: ' + data.error);
    }
  } catch (err) {
    alert('Network error');
  }
}

document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pw").value;
  document.getElementById("login-error").innerText = "";
  login(username, password);
});

/*PROFILE  (calls /api/profile) */

async function renderProfile() {
  const infoDiv = document.getElementById("profile-info");

  try {
    const res  = await fetch('http://localhost:3000/api/profile', {
      headers: { ...getAuthHeader(), 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (res.ok) {
      const u = data.user;
      
      const localAcc = window.db.accounts.find(function(a) {
        return a.username === u.username || a.email === u.username || a.email === getDisplayEmail(u.username);
      });
      const fullName = (localAcc && (localAcc.firstName || localAcc.lastName))
        ? (localAcc.firstName + " " + localAcc.lastName).trim()
        : u.username;
      const displayRole = (localAcc && localAcc.role) ? localAcc.role : u.role;
      const displayEmail = (localAcc && localAcc.email) ? localAcc.email : getDisplayEmail(u.username);
      infoDiv.innerHTML = `
        <table class="table table-borderless mb-0">
          <tr><td class="text-muted" style="width:60px">Name</td><td>${fullName}</td></tr>
          <tr><td class="text-muted">Email</td><td>${displayEmail}</td></tr>
          <tr><td class="text-muted">Role</td><td>
            <span class="badge ${displayRole === 'admin' ? 'bg-danger' : 'bg-primary'}">${displayRole}</span>
          </td></tr>
        </table>`;
    } else {
      infoDiv.innerHTML = `<p class="text-danger">Could not load profile. Please log in again.</p>`;
    }
  } catch {
    infoDiv.innerHTML = `<p class="text-danger">Network error loading profile.</p>`;
  }
}

function openEditProfile() {
  var localAcc = window.db.accounts.find(function(a) {
    return a.username === currentUser.username || a.email === currentUser.username || a.email === getDisplayEmail(currentUser.username);
  });
  document.getElementById("edit-profile-form").style.display = "block";
  document.getElementById("edit-first").value  = (localAcc && localAcc.firstName) ? localAcc.firstName : "";
  document.getElementById("edit-last").value   = (localAcc && localAcc.lastName)  ? localAcc.lastName  : "";
  document.getElementById("edit-email").value  = (localAcc && localAcc.email)     ? localAcc.email     : getDisplayEmail(currentUser.username);
  document.getElementById("edit-profile-error").innerText = "";
}

function closeEditProfile() {
  document.getElementById("edit-profile-form").style.display = "none";
}

document.getElementById("edit-profile-el").addEventListener("submit", function (e) {
  e.preventDefault();
  const first = document.getElementById("edit-first").value.trim();
  const last  = document.getElementById("edit-last").value.trim();
  const email = document.getElementById("edit-email").value.trim();
  // Update local accounts 
  var localAcc = window.db.accounts.find(function(a) {
    return a.username === currentUser.username || a.email === currentUser.username || a.email === getDisplayEmail(currentUser.username);
  });
  if (localAcc) {
    localAcc.firstName = first;
    localAcc.lastName  = last;
    localAcc.email     = email;
    saveToStorage();
  }
  // Update navbar with new name
  var newName = (first + " " + last).trim() || currentUser.username;
  document.getElementById("nav-username").innerText = newName;
  renderProfile();
  closeEditProfile();
  showToast("Profile updated!");
});

/* ACCOUNTS */

function renderAccountsList() {
  const tbody = document.getElementById("acc-list");
  tbody.innerHTML = "";

  if (!window.db.accounts || !window.db.accounts.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No accounts found.</td></tr>`;
    return;
  }

  window.db.accounts.forEach(function(a, i) {
    tbody.innerHTML += `
      <tr>
        <td>${a.firstName} ${a.lastName}</td>
        <td>${a.email || a.username}</td>
        <td><span class="badge ${a.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">${a.role}</span></td>
        <td>${a.verified ? "✅" : "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1"  onclick="editAcc(${i})">Edit</button>
          <button class="btn btn-sm btn-outline-warning me-1"  onclick="resetPw(${i})">Reset PW</button>
          <button class="btn btn-sm btn-outline-danger"        onclick="deleteAcc(${i})">Delete</button>
        </td>
      </tr>`;
  });
}

function openAccForm(data, idx) {
  if (data === undefined) data = null;
  if (idx === undefined)  idx  = -1;

  document.getElementById("acc-form").style.display        = "block";
  document.getElementById("acc-form-title").innerText      = idx >= 0 ? "Edit Account" : "Add Account";
  document.getElementById("acc-idx").value                 = idx;
  document.getElementById("acc-first").value               = (data && data.firstName) ? data.firstName : "";
  document.getElementById("acc-last").value                = (data && data.lastName)  ? data.lastName  : "";
  document.getElementById("acc-email").value               = (data && (data.email || data.username)) ? (data.email || data.username) : "";
  document.getElementById("acc-pw").value                  = "";
  document.getElementById("acc-role").value                = (data && data.role) ? data.role : "user";
  document.getElementById("acc-verified").checked          = (data && data.verified) ? true : false;
  document.getElementById("acc-error").innerText           = "";

  const pwField = document.getElementById("acc-pw");
  if (idx >= 0) {
    pwField.removeAttribute("required");
    pwField.placeholder = "New password (leave blank to keep)";
  } else {
    pwField.setAttribute("required", "");
    pwField.placeholder = "Password (min 6)";
  }
}

function closeAccForm() {
  document.getElementById("acc-form").style.display = "none";
}

document.getElementById("acc-form-el").addEventListener("submit", async function (e) {
  e.preventDefault();

  const idx      = parseInt(document.getElementById("acc-idx").value);
  const first    = document.getElementById("acc-first").value.trim();
  const last     = document.getElementById("acc-last").value.trim();
  const email    = document.getElementById("acc-email").value.trim();
  const pw       = document.getElementById("acc-pw").value;
  const role     = document.getElementById("acc-role").value;
  const verified = document.getElementById("acc-verified").checked;
  const err      = document.getElementById("acc-error");
  err.innerText  = "";

  
  var taken = false;
  for (var j = 0; j < window.db.accounts.length; j++) {
    var a = window.db.accounts[j];
    if ((a.email === email || a.username === email) && j !== idx) {
      taken = true;
      break;
    }
  }
  if (taken) { err.innerText = "Email already in use."; return; }

  if (idx >= 0) {
    // ---- EDIT ----
    var acc = window.db.accounts[idx];
    acc.firstName = first;
    acc.lastName  = last;
    acc.email     = email;
    acc.username  = acc.username || email;
    acc.role      = role;
    acc.verified  = verified;
    if (pw) {
      if (pw.length < 6) { err.innerText = "Password must be at least 6 chars."; return; }
      acc.password = pw;
    }
    saveToStorage();
    closeAccForm();
    renderAccountsList();
    showToast("Account updated.");

  } else {
    // ---- ADD ----
    if (pw.length < 6) { err.innerText = "Password must be at least 6 chars."; return; }

    try {
      const response = await fetch(`${API}/api/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: email, password: pw })
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409) {
        err.innerText = "Backend error: " + (data.error || "unknown");
        return;
      }
    } catch {
      err.innerText = "Network error. Is the backend running?";
      return;
    }

    window.db.accounts.push({
      firstName: first,
      lastName:  last,
      username:  email,
      email:     email,
      role:      role,
      verified:  verified
    });

    saveToStorage();
    closeAccForm();
    renderAccountsList();
    showToast("Account added.");
  }
});

function editAcc(i) {
  openAccForm(window.db.accounts[i], i);
}

function resetPw(i) {
  const pw = prompt("New password (min 6 chars):");
  if (pw === null) return;
  if (pw.length < 6) { alert("Too short."); return; }
  window.db.accounts[i].password = pw;
  saveToStorage();
  showToast("Password updated.");
}

function deleteAcc(i) {
  if (window.db.accounts[i].username === currentUser?.username) {
    alert("Can't delete your own account."); return;
  }
  if (!confirm("Delete " + (window.db.accounts[i].email || window.db.accounts[i].username) + "?")) return;
  window.db.accounts.splice(i, 1);
  saveToStorage();
  renderAccountsList();
  showToast("Account deleted.", "danger");
}

/* DEPARTMENTS */

function renderDepartmentsList() {
  const tbody = document.getElementById("dept-list");
  tbody.innerHTML = "";
  window.db.departments.forEach(function(d, i) {
    tbody.innerHTML += `
      <tr>
        <td>${d.name}</td>
        <td>${d.desc || "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editDept(${i})">Edit</button>
          <button class="btn btn-sm btn-outline-danger"       onclick="deleteDept(${i})">Delete</button>
        </td>
      </tr>`;
  });
}

function openDeptForm(data, idx) {
  if (data === undefined) data = null;
  if (idx === undefined)  idx  = -1;
  document.getElementById("dept-form").style.display   = "block";
  document.getElementById("dept-form-title").innerText = idx >= 0 ? "Edit Department" : "Add Department";
  document.getElementById("dept-idx").value            = idx;
  document.getElementById("dept-name").value           = (data && data.name) ? data.name : "";
  document.getElementById("dept-desc").value           = (data && data.desc) ? data.desc : "";
}

function closeDeptForm() {
  document.getElementById("dept-form").style.display = "none";
}

document.getElementById("dept-form-el").addEventListener("submit", function (e) {
  e.preventDefault();
  const idx  = parseInt(document.getElementById("dept-idx").value);
  const name = document.getElementById("dept-name").value.trim();
  const desc = document.getElementById("dept-desc").value.trim();

  if (idx >= 0) {
    window.db.departments[idx].name = name;
    window.db.departments[idx].desc = desc;
  } else {
    window.db.departments.push({ id: "dept-" + Date.now(), name: name, desc: desc });
  }

  saveToStorage();
  closeDeptForm();
  renderDepartmentsList();
  showToast("Department saved.");
});

function editDept(i) { openDeptForm(window.db.departments[i], i); }

function deleteDept(i) {
  if (!confirm('Delete "' + window.db.departments[i].name + '"?')) return;
  window.db.departments.splice(i, 1);
  saveToStorage();
  renderDepartmentsList();
  showToast("Department deleted.", "danger");
}

/* EMPLOYEES */

function renderEmployeesTable() {
  const tbody = document.getElementById("emp-list");
  tbody.innerHTML = "";
  window.db.employees.forEach(function(emp, i) {
    const dept = window.db.departments.find(function(d) { return d.id === emp.deptId; });
    tbody.innerHTML += `
      <tr>
        <td>${emp.empId}</td>
        <td>${emp.email}</td>
        <td>${emp.position}</td>
        <td>${dept ? dept.name : "—"}</td>
        <td>${emp.hireDate || "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmp(${i})">Edit</button>
          <button class="btn btn-sm btn-outline-danger"       onclick="deleteEmp(${i})">Delete</button>
        </td>
      </tr>`;
  });
}

function fillDeptDropdown(selected) {
  if (!selected) selected = "";
  const sel = document.getElementById("emp-dept");
  sel.innerHTML = '<option value="">Select Department</option>';
  window.db.departments.forEach(function(d) {
    sel.innerHTML += '<option value="' + d.id + '"' + (d.id === selected ? ' selected' : '') + '>' + d.name + '</option>';
  });
}

function openEmpForm(data, idx) {
  if (data === undefined) data = null;
  if (idx === undefined)  idx  = -1;
  document.getElementById("emp-form").style.display   = "block";
  document.getElementById("emp-form-title").innerText = idx >= 0 ? "Edit Employee" : "Add Employee";
  document.getElementById("emp-idx").value            = idx;
  document.getElementById("emp-id").value             = (data && data.empId)    ? data.empId    : "";
  document.getElementById("emp-email").value          = (data && data.email)    ? data.email    : "";
  document.getElementById("emp-position").value       = (data && data.position) ? data.position : "";
  document.getElementById("emp-hire").value           = (data && data.hireDate) ? data.hireDate : "";
  document.getElementById("emp-error").innerText      = "";
  fillDeptDropdown((data && data.deptId) ? data.deptId : "");
}

function closeEmpForm() {
  document.getElementById("emp-form").style.display = "none";
}

document.getElementById("emp-form-el").addEventListener("submit", function (e) {
  e.preventDefault();

  const idx      = parseInt(document.getElementById("emp-idx").value);
  const empId    = document.getElementById("emp-id").value.trim();
  const email    = document.getElementById("emp-email").value.trim();
  const position = document.getElementById("emp-position").value.trim();
  const deptId   = document.getElementById("emp-dept").value;
  const hireDate = document.getElementById("emp-hire").value;
  const err      = document.getElementById("emp-error");
  err.innerText  = "";

  // Validate: email must match an existing account
  const matchedAcc = window.db.accounts.find(function(a) {
    return a.email === email || a.username === email;
  });
  if (!matchedAcc) { err.innerText = "No account found with that email."; return; }
  if (!deptId)     { err.innerText = "Pick a department."; return; }

  // Link to user ID and dept ID
  const entry = {
    empId:    empId,
    email:    matchedAcc.email || matchedAcc.username,
    userId:   matchedAcc.username,
    position: position,
    deptId:   deptId,
    hireDate: hireDate
  };

  if (idx >= 0) {
    window.db.employees[idx] = Object.assign(window.db.employees[idx], entry);
  } else {
    window.db.employees.push(entry);
  }

  saveToStorage();
  closeEmpForm();
  renderEmployeesTable();
  showToast("Employee saved.");
});

function editEmp(i) { openEmpForm(window.db.employees[i], i); }

function deleteEmp(i) {
  if (!confirm("Remove this employee?")) return;
  window.db.employees.splice(i, 1);
  saveToStorage();
  renderEmployeesTable();
  showToast("Employee removed.", "danger");
}

/* REQUESTS */

function resetReqForm() {
  document.getElementById("req-items").innerHTML = "";
  document.getElementById("req-error").innerText = "";
  addItem();
}

function addItem() {
  const row = document.createElement("div");
  row.className = "d-flex gap-2 mb-2 item-row";
  row.innerHTML =
    '<input type="text"   class="form-control" placeholder="Item name" />' +
    '<input type="number" class="form-control" style="max-width:100px" placeholder="Qty" min="1" value="1" />' +
    '<button type="button" class="btn btn-outline-danger btn-sm" onclick="this.closest(\'.item-row\').remove()">×</button>';
  document.getElementById("req-items").appendChild(row);
}

function submitReq() {
  const type = document.getElementById("req-type").value;
  const err  = document.getElementById("req-error");
  const rows = document.querySelectorAll(".item-row");

  const items = [];
  rows.forEach(function(row) {
    const inputs = row.querySelectorAll("input");
    const name = inputs[0].value.trim();
    if (name) items.push({ name: name, qty: inputs[1].value });
  });

  if (!items.length) { err.innerText = "Add at least one item."; return; }
  err.innerText = "";

  window.db.requests.push({
    id:            "req-" + Date.now(),
    type:          type,
    items:         items,
    status:        "Pending",
    date:          new Date().toLocaleDateString(),
    employeeEmail: currentUser.email || getDisplayEmail(currentUser.username)
  });

  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById("req-popup")).hide();
  renderRequestsList();
  resetReqForm();
  showToast("Request submitted!");
}

function renderRequestsList() {
  const tbody = document.getElementById("req-list");
  const isAdmin = currentUser && currentUser.role === "admin";

  // admin Employee 
  const thead = document.getElementById("req-thead");
  if (thead) {
    thead.innerHTML = isAdmin
      ? "<th>Employee</th><th>Date</th><th>Type</th><th>Items</th><th>Status</th><th>Actions</th>"
      : "<th>Date</th><th>Type</th><th>Items</th><th>Status</th><th>Actions</th>";
  }

  // Admin sees all requests; user sees only their own
  const currentEmail = currentUser ? (currentUser.email || getDisplayEmail(currentUser.username)) : "";
  const list = isAdmin
    ? window.db.requests
    : window.db.requests.filter(function(r) { return r.employeeEmail === currentEmail; });

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="' + (isAdmin ? 6 : 5) + '" class="text-center text-muted py-4">No requests yet.</td></tr>';
    return;
  }

  list.forEach(function(r, idx) {
    const color   = r.status === "Approved" ? "bg-success"
                  : r.status === "Rejected" ? "bg-danger"
                  : "bg-warning text-dark";
    const summary = r.items.map(function(i) { return i.name + " (×" + i.qty + ")"; }).join(", ")
    const realIdx = window.db.requests.indexOf(r);
    const adminActions = r.status === "Pending"
      ? `<button class="btn btn-sm btn-success me-1" onclick="approveReq(${realIdx})">Approve</button>
         <button class="btn btn-sm btn-danger"       onclick="rejectReq(${realIdx})">Reject</button>`
      : `<span class="text-muted fst-italic small">${r.status}</span>`;
    const userActions = `<button class="btn btn-sm btn-outline-danger" onclick="deleteReq(${realIdx})">Delete</button>`;
    tbody.innerHTML += `
      <tr>
        ${isAdmin ? `<td><small>${r.employeeEmail}</small></td>` : ""}
        <td>${r.date}</td>
        <td>${r.type}</td>
        <td><small>${summary}</small></td>
        <td><span class="badge ${color}">${r.status}</span></td>
        <td>${isAdmin ? adminActions : userActions}</td>
      </tr>`;
  });
}


function approveReq(idx) {
  window.db.requests[idx].status = "Approved";
  saveToStorage();
  renderRequestsList();
  showToast("Request approved.", "success");
}

function rejectReq(idx) {
  window.db.requests[idx].status = "Rejected";
  saveToStorage();
  renderRequestsList();
  showToast("Request rejected.", "danger");
}

function deleteReq(idx) {
  if (!confirm("Delete this request?")) return;
  window.db.requests.splice(idx, 1);
  saveToStorage();
  renderRequestsList();
  showToast("Request deleted.", "danger");
}

/* INIT */

(function() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.accounts || (parsed.accounts[0] && parsed.accounts[0].email && parsed.accounts[0].email.includes("@example.com"))) {
        
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
})();

loadFromStorage();

// Restore session from sessionStorage on page reload
const savedToken = sessionStorage.getItem("authToken");
const savedUser  = sessionStorage.getItem("currentUser");

if (savedToken && savedUser) {
  try {
    var user = JSON.parse(savedUser);
    // Re-merge with local db in case role/name changed since last login
    var localMatch = window.db.accounts.find(function(a) {
      return a.username === user.username || a.email === user.username || a.email === getDisplayEmail(user.username);
    });
    if (localMatch) {
      user.role      = localMatch.role;
      user.firstName = localMatch.firstName;
      user.lastName  = localMatch.lastName;
      user.email     = localMatch.email || user.username;
    }
    setAuthState(true, user);
  } catch {
    sessionStorage.clear();
  }
}

handleRouting();