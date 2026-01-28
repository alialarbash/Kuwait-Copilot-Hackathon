const tableBody = document.getElementById("records-table");
const refreshBtn = document.getElementById("refresh-btn");
const detailsCard = document.getElementById("details-card");
const detailsContent = document.getElementById("details-content");
const searchInput = document.getElementById("search-input");
const filterStatus = document.getElementById("filter-status");
const filterUniversity = document.getElementById("filter-university");

// Store all records for client-side filtering
let allRecords = [];

// Chart instances
let statusChart = null;
let timeChart = null;
let universityChart = null;

const STATUS_TAG_CLASS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

const CHART_COLORS = {
  PENDING: "#d97706",
  VERIFIED: "#00a884",
  REJECTED: "#e11d48",
};

async function fetchRecords() {
  tableBody.innerHTML = "<tr><td colspan=7>Loading…</td></tr>";

  try {
    const response = await fetch("/api/records");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load records");
    }

    allRecords = data.data || [];
    populateUniversityFilter(allRecords);
    applyFilters();
    updateStatistics(allRecords);
    renderCharts(allRecords);
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan=7>${error.message}</td></tr>`;
  }
}

// Update statistics cards
function updateStatistics(records) {
  const total = records.length;
  const pending = records.filter((r) => r.status === "PENDING").length;
  const verified = records.filter((r) => r.status === "VERIFIED").length;
  const rejected = records.filter((r) => r.status === "REJECTED").length;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-verified").textContent = verified;
  document.getElementById("stat-rejected").textContent = rejected;
}

// Render all charts
function renderCharts(records) {
  renderStatusChart(records);
  renderTimeChart(records);
  renderUniversityChart(records);
}

// Pie chart for status distribution
function renderStatusChart(records) {
  const pending = records.filter((r) => r.status === "PENDING").length;
  const verified = records.filter((r) => r.status === "VERIFIED").length;
  const rejected = records.filter((r) => r.status === "REJECTED").length;

  const ctx = document.getElementById("statusChart").getContext("2d");

  if (statusChart) {
    statusChart.destroy();
  }

  statusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Verified", "Rejected"],
      datasets: [
        {
          data: [pending, verified, rejected],
          backgroundColor: [
            CHART_COLORS.PENDING,
            CHART_COLORS.VERIFIED,
            CHART_COLORS.REJECTED,
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

// Line chart for submissions over time
function renderTimeChart(records) {
  // Group by date
  const dateGroups = {};
  records.forEach((r) => {
    const date = new Date(r.created_at).toLocaleDateString();
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });

  // Sort dates and get last 14 days
  const sortedDates = Object.keys(dateGroups)
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(-14);

  const ctx = document.getElementById("timeChart").getContext("2d");

  if (timeChart) {
    timeChart.destroy();
  }

  timeChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: "Submissions",
          data: sortedDates.map((d) => dateGroups[d]),
          borderColor: "#0066ff",
          backgroundColor: "rgba(0, 102, 255, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// Bar chart for universities
function renderUniversityChart(records) {
  const uniGroups = {};
  records.forEach((r) => {
    const uni = r.extracted_university || "Unknown";
    uniGroups[uni] = (uniGroups[uni] || 0) + 1;
  });

  const sortedUnis = Object.entries(uniGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const ctx = document.getElementById("universityChart").getContext("2d");

  if (universityChart) {
    universityChart.destroy();
  }

  universityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedUnis.map((u) =>
        u[0].length > 20 ? u[0].substring(0, 20) + "…" : u[0],
      ),
      datasets: [
        {
          label: "Submissions",
          data: sortedUnis.map((u) => u[1]),
          backgroundColor: "#0066ff",
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// Populate university dropdown from records
function populateUniversityFilter(records) {
  const universities = [
    ...new Set(
      records.map((r) => r.extracted_university).filter((u) => u && u !== "—"),
    ),
  ];

  filterUniversity.innerHTML = '<option value="">All Universities</option>';
  universities.forEach((uni) => {
    filterUniversity.innerHTML += `<option value="${uni}">${uni}</option>`;
  });
}

// Apply search and filters
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const statusFilter = filterStatus.value;
  const universityFilter = filterUniversity.value;

  const filtered = allRecords.filter((record) => {
    // Search filter (name, phone, civil_id)
    const matchesSearch =
      !searchTerm ||
      record.full_name.toLowerCase().includes(searchTerm) ||
      record.phone.toLowerCase().includes(searchTerm) ||
      (record.civil_id && record.civil_id.toLowerCase().includes(searchTerm));

    // Status filter
    const matchesStatus = !statusFilter || record.status === statusFilter;

    // University filter
    const matchesUniversity =
      !universityFilter || record.extracted_university === universityFilter;

    return matchesSearch && matchesStatus && matchesUniversity;
  });

  renderTable(filtered);
}

function renderTable(records) {
  if (!records.length) {
    tableBody.innerHTML = "<tr><td colspan=7>No submissions found.</td></tr>";
    return;
  }

  tableBody.innerHTML = records
    .map((record) => {
      const statusClass = STATUS_TAG_CLASS[record.status] || "pending";
      return `
        <tr data-id="${record.id}">
          <td>${record.id}</td>
          <td>${record.full_name}</td>
          <td>${record.phone}</td>
          <td><span class="tag ${statusClass}">${record.status}</span></td>
          <td>${record.extracted_student_id || "—"}</td>
          <td>${record.extracted_university || "—"}</td>
          <td>${new Date(record.created_at).toLocaleString()}</td>
        </tr>
      `;
    })
    .join("");
}

async function showDetails(id) {
  detailsContent.classList.remove("hidden");
  detailsContent.innerHTML = "<p>Loading details…</p>";

  try {
    const response = await fetch(`/api/record/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load details");
    }

    renderDetails(data.data);
  } catch (error) {
    detailsContent.innerHTML = `<p class="muted">${error.message}</p>`;
  }
}

function renderDetails(record) {
  if (!record) {
    detailsContent.innerHTML = "<p class=muted>No details found.</p>";
    return;
  }

  const fileUrl = record.certificate_path
    ? `/uploads/${record.certificate_path}`
    : null;

  detailsContent.innerHTML = `
    <div class="details-grid">
      <div>
        <span>Full Name</span>
        <strong>${record.full_name}</strong>
      </div>
      <div>
        <span>Phone</span>
        <strong>${record.phone}</strong>
      </div>
      <div>
        <span>Civil ID</span>
        <strong>${record.civil_id}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>${record.status}</strong>
      </div>
      <div>
        <span>Extracted Student ID</span>
        <strong>${record.extracted_student_id || "—"}</strong>
      </div>
      <div>
        <span>Extracted University</span>
        <strong>${record.extracted_university || "—"}</strong>
      </div>
    </div>

    <div class="actions">
      <button class="btn primary" data-action="verify" data-id="${record.id}">Mark Verified</button>
      <button class="btn ghost" data-action="reject" data-id="${record.id}">Mark Rejected</button>
    </div>

    <label for="notes">Notes / Reason</label>
    <textarea id="notes" placeholder="Optional notes for the applicant">${
      record.notes || ""
    }</textarea>

    ${
      fileUrl
        ? `<div class="certificate-preview">
            <span>Certificate Preview</span>
            ${renderPreview(fileUrl)}
          </div>`
        : ``
    }

    <div class="ocr-block">
      <span class="muted">OCR Text</span>
      <pre>${(record.ocr_text || "").trim()}</pre>
    </div>
  `;
}

function renderPreview(url) {
  if (url.endsWith(".pdf")) {
    return `<iframe src="${url}" height="300"></iframe>`;
  }
  return `<img src="${url}" alt="Certificate" />`;
}

async function updateStatus(id, status) {
  const notesField = document.getElementById("notes");
  const notes = notesField ? notesField.value : "";

  try {
    const response = await fetch(`/api/record/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to update status");
    }

    await fetchRecords();
    await showDetails(id);
  } catch (error) {
    alert(error.message);
  }
}

tableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-id]");
  if (row) {
    const id = row.getAttribute("data-id");
    showDetails(id);
  }
});

refreshBtn.addEventListener("click", fetchRecords);

// Export buttons
const exportCSVBtn = document.getElementById("export-csv-btn");
const exportExcelBtn = document.getElementById("export-excel-btn");

exportCSVBtn.addEventListener("click", () => {
  window.location.href = "/api/export/csv";
});

exportExcelBtn.addEventListener("click", () => {
  window.location.href = "/api/export/excel";
});

// Search and filter event listeners
searchInput.addEventListener("input", applyFilters);
filterStatus.addEventListener("change", applyFilters);
filterUniversity.addEventListener("change", applyFilters);

detailsContent.addEventListener("click", (event) => {
  const actionBtn = event.target.closest("button[data-action]");
  if (!actionBtn) return;
  const id = actionBtn.getAttribute("data-id");
  const action = actionBtn.getAttribute("data-action");
  updateStatus(id, action === "verify" ? "VERIFIED" : "REJECTED");
});

window.addEventListener("DOMContentLoaded", fetchRecords);
