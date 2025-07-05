function getAccessTokenFromLocalStorage() {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    if (
      key.startsWith("CognitoIdentityServiceProvider.") &&
      key.endsWith(".accessToken")
    ) {
      const token = localStorage.getItem(key);
      if (token) return token;
    }
  }

  console.error("[SumUp TillerSystem Stock Extractor] ❌ Cannot extract the Access Token from LocalStorage.");
  return null;
}

(function () {
  try {
    const token = getAccessTokenFromLocalStorage();
    window.dispatchEvent(new CustomEvent('AccessTokenFromPage', {
      detail: token
    }));
  } catch (e) {
    window.dispatchEvent(new CustomEvent('AccessTokenFromPage', {
      detail: null
    }));
  }
})();
