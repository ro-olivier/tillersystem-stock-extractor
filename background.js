chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'fetchWithToken') {
    fetch(request.url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${request.token}`
      }
    })
    .then(res => res.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => sendResponse({ success: false, error: err.toString() }));
    return true;
  }


  if (request.type === "GET_STORE_ID") {
    chrome.cookies.get(
      { url: request.url, name: request.cookie_name },
      function(cookie) {
        sendResponse(cookie ? cookie.value : null );
      }
    );
    return true;
  }
});