const form = document.getElementById("submission-form");
const statusBox = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  statusBox.textContent = "Uploading certificate…";
  statusBox.className = "status";

  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Submission failed");
    }

    statusBox.textContent = `Submission saved. ID: ${data.submissionId}`;
    statusBox.classList.add("success");
    form.reset();
  } catch (error) {
    statusBox.textContent = error.message;
    statusBox.classList.add("error");
  }
});

// Check verification status by phone number
const checkForm = document.getElementById("check-form");
const checkResult = document.getElementById("check-result");

checkForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = document.getElementById("check_phone").value.trim();
  checkResult.innerHTML = "<p>Searching...</p>";

  try {
    const response = await fetch(`/api/status/${encodeURIComponent(phone)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to check status");
    }

    if (!data.data || data.data.length === 0) {
      checkResult.innerHTML = `<p class="muted">No submissions found for this phone number.</p>`;
      return;
    }

    checkResult.innerHTML = data.data
      .map((record) => {
        const statusClass =
          record.status === "VERIFIED"
            ? "verified"
            : record.status === "REJECTED"
              ? "rejected"
              : "pending";

        return `
          <div class="status-card">
            <div class="status-header">
              <span class="tag ${statusClass}">${record.status}</span>
              <span class="muted">Submitted: ${new Date(record.created_at).toLocaleDateString()}</span>
            </div>
            <p><strong>Name:</strong> ${record.full_name}</p>
            <p><strong>Civil ID:</strong> ${record.civil_id}</p>
            ${record.notes ? `<p><strong>Reason/Notes:</strong> ${record.notes}</p>` : ""}
          </div>
        `;
      })
      .join("");
  } catch (error) {
    checkResult.innerHTML = `<p class="error">${error.message}</p>`;
  }
});
