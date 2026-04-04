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

document.getElementById("ScanButton").addEventListener("click", () => {
    console.log("Scanning Gmail...");

    chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
            console.error("Auth Failed:", chrome.runtime.lastError.message);
            return;
        }

        fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=application", {
            headers: { "Authorization": "Bearer " + token }
        })
        .then((response) => response.json())
        .then((data) => {
            data.messages.forEach((message) => {
                fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
                    headers: { "Authorization": "Bearer " + token }
                })
                .then((response) => response.json())
                .then((emailData) => {
                    const headers = emailData.payload.headers;
                    const snippet = emailData.snippet;

                    const subject = headers.find((h) => h.name === "Subject");
                    const subjectText = subject ? subject.value : "";

                    if (isJobEmail(subjectText, snippet)) {
                        console.log("✅ Job email found:", subjectText);
                        const details = extractDetails(headers);
                        addRowToTable(details);
                    } else {
                        console.log("❌ Skipped:", subjectText);
                    }
                });
            });
        });
    });
});