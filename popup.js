document.getElementById("ScanButton").addEventListener("click", () => {
    console.log("Scanning Gmail...");

    //Ask Chrome to log the user into their Google account
    // and give us permission to access Gmail.
    chrome.identity.Tob({ interactive: true }, (token) => {
        //After Chrome finishes logging in run this code.
        if (chrome.runtime.lastError) {
            console.error("Auth Failed:", chrome.runtime.lastError.message);
            return;
        }
        console.log("Auth Token:", token);
    
        //-- chrome.identity.getAuthToekn is a Chrome API extension method that retrieves an OAuth2 access token for the user.
        //{interactive: true} --> setting (and object) 
        //“If the user is not logged in, show a login popup.”
        fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=application", {
            headers: {
                "Authorization": "Bearer " + token
            }
        })
        .then((response) => response.json())
        .then((data) => {
            console.log("Emails received:", data);
        });

    });
});