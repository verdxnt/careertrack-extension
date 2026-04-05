function isJobEmail(subject, snippet) {
    const keywords = [
        "application received",
        "thank you for applying",
        "we received your application",
        "thanks for applying",
        "your application to",
        "application confirmation",
        "successfully applied",
        "application submitted"
    ];
    const combined = (subject + " " + snippet).toLowerCase();
    return keywords.some((keyword) => combined.includes(keyword));
}

function extractDetails(headers) {
    const getHeader = (name) => {
        const header = headers.find((h) => h.name === name);
        return header ? header.value : "Unknown";
    };
    const from = getHeader("From");
    const subject = getHeader("Subject");
    const date = getHeader("Date");
    const company = extractCompany(from);
    return { company, subject, date, from };
}

function extractCompany(fromField) {
    const match = fromField.match(/@([\w.-]+)\./);
    if (match) {
        const domain = match[1];
        return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return "Unknown";
}

function addRowToTable(details) {
    const table = document.getElementById("applicationsTable");
    const row = table.insertRow();
    row.insertCell(0).textContent = details.company;
    row.insertCell(1).textContent = details.subject;
    row.insertCell(2).textContent = details.date;
    row.insertCell(3).textContent = details.from;
}

function setStatus(text) {
    document.getElementById("statusText").textContent = text;
}

function formatDateForGmail(dateString) {
    return dateString.replace(/-/g, "/");
}

function fetchEmails(token, query, pageToken = null) {
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(query)}`;

    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }

    return fetch(url, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then((response) => response.json());
}

function processEmail(token, messageId) {
    return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then((response) => response.json())
    .then((emailData) => {
        const headers = emailData.payload.headers;
        const snippet = emailData.snippet;

        const subjectHeader = headers.find((h) => h.name === "Subject");
        const subjectText = subjectHeader ? subjectHeader.value : "";

        if (isJobEmail(subjectText, snippet)) {
            console.log("✅ Job email found:", subjectText);
            const details = extractDetails(headers);
            addRowToTable(details);
            return true;
        } else {
            console.log("❌ Skipped:", subjectText);
            return false;
        }
    });
}

function scanAllPages(token, query, pageToken = null, totalFound = 0) {
    setStatus("Scanning... found " + totalFound + " applications so far");

    fetchEmails(token, query, pageToken)
    .then((data) => {
        if (!data.messages || data.messages.length === 0) {
            setStatus("Done! Found " + totalFound + " job applications.");
            return;
        }

        let processed = 0;
        let foundThisPage = 0;

        data.messages.forEach((message) => {
            processEmail(token, message.id).then((wasJobEmail) => {
                if (wasJobEmail) foundThisPage++;
                processed++;

                if (processed === data.messages.length) {
                    const newTotal = totalFound + foundThisPage;

                    if (data.nextPageToken) {
                        scanAllPages(token, query, data.nextPageToken, newTotal);
                    } else {
                        setStatus("Done! Found " + newTotal + " job applications.");
                    }
                }
            });
        });
    });
}

document.getElementById("ScanButton").addEventListener("click", () => {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (!startDate || !endDate) {
        setStatus("Please select both a start and end date.");
        return;
    }

    const formattedStart = formatDateForGmail(startDate);
    const formattedEnd = formatDateForGmail(endDate);

    const query = `application after:${formattedStart} before:${formattedEnd}`;

    const table = document.getElementById("applicationsTable");
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }

    setStatus("Starting scan...");

    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
            setStatus("Auth failed: " + chrome.runtime.lastError.message);
            return;
        }
        scanAllPages(token, query);
    });
});