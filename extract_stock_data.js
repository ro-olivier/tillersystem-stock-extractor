function injectSpinnerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
      display: inline-block;
      vertical-align: middle;
      margin-left: 5px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .btn-primary {
      color: #fff;
      background-color: #6ebb9c;
      border-color: #5db390;
      display: inline-block;
      width: 150px;
      transition: .4s;
      transition-property: all;
      transition-timing-function: ease;
      margin-bottom: 0;
      margin-left: 20px;
      font-weight: normal;
      text-align: center;
      vertical-align: middle;
      touch-action: manipulation;
      cursor: pointer;
      background-image: none;
      border: 1px solid transparent;
      white-space: nowrap;
      padding: 6px 12px;
      font-size: 14px;
      line-height: 1.42857143;
      border-radius: 4px;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -ms-touch-action: manipulation;
      user-select: none;
      text-transform: uppercase;
    }

    .btn-primary:hover {
      background-color: #4fa784;
      border-color: #438f71;
    }

    .btn-primary .icon {
      margin-right: 6px;
      vertical-align: middle;
      fill: currentColor;
    }

  `;
  document.head.appendChild(style);
}

function waitForElement(selector, callback) {
  const element = document.querySelector(selector);
  if (element) {
    callback(element);
    return;
  }

  const observer = new MutationObserver((mutations, obs) => {
    const el = document.querySelector(selector);
    if (el) {
      obs.disconnect();
      callback(el);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function updateButton() {
  const button = document.querySelector('.btn-primary')
  button.innerHTML = BUTTON_REDIRECTING_HTML;
  button.disabled = false;
  console.debug('[SumUp TillerSystem Stock Extractor] ✅ Step 1 all done!!');
  const link = document.createElement("a");
  link.href = PRODUCT_PAGE_URL;
  link.click();
}

async function fetchFromBackground(url, token) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'fetchWithToken',
        url,
        token
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (!response || !response.success) {
          reject(response?.error || 'Unknown error');
        } else {
          resolve(response.data);
        }
      }
    );
  });
}

async function fetchData(accessToken) {

  try {
    const data = await fetchFromBackground(
      API_URL + STORE_ID,
      accessToken
    );
    console.debug('[SumUp TillerSystem Stock Extractor] ✅ Got response data:', data.data);
    chrome.storage.local.set({ 'stockData': data.data }, function() {
    console.debug('[SumUp TillerSystem Stock Extractor] ✅ Stock data saved in Local Storage.');
    });
    updateButton();
  } catch (err) {
    console.error('[SumUp TillerSystem Stock Extractor] ❌ Failed to fetch from background:', err);
  }

}

function injectScriptFile(fileName) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(fileName);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

function injectButton() {

  waitForElement(INJECT_DIV_IDENTIFIER, (parentElement) => {
    console.debug('[SumUp TillerSystem Stock Extractor] ✅ Header div is ready:', parentElement);

    const button = document.createElement('a');
    button.classList.add('btn-primary');
    button.innerHTML = BUTTON_INNER_HTML;

    parentElement.appendChild(button);

    button.addEventListener('click', async () => {

      button.innerHTML = BUTTON_WORKING_HTML;
      button.disabled = true;

      injectScriptFile('get_token.js');

      window.addEventListener('AccessTokenFromPage', (event) => {
        const accessToken = event.detail;
        console.debug('[SumUp TillerSystem Stock Extractor] ✅ Access token from page localStorage:', accessToken);

        stockData = fetchData(accessToken);

      });
    });
  });
}


BUTTON_INNER_HTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
           viewBox="0 0 16 16" class="icon">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5V14h14v-3.6a.5.5 0 0 1 1 0V14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1v-3.6a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 10.854a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5a.5.5 0 0 0-1 0v7.793L4.854 6.646a.5.5 0 1 0-.708.708l3.5 3.5z"/>
      </svg>
      Export Data
    `;
BUTTON_WORKING_HTML = '<span class="spinner"></span> Working';
BUTTON_REDIRECTING_HTML = 'Redirecting...';
PRODUCT_PAGE_URL = 'https://app.tillersystems.com/inventory/list/product';
INJECT_DIV_IDENTIFIER = 'div[data-testid="stocks-page_header"]';
API_URL = 'https://internal.api.tiller.systems/stocks/v1/enriched?storeId=';
STOCK_URL = 'https://new.tillersystems.com/products/stocks';
STORE_ID_COOKIE = 'ajs_group_id';

console.debug('[SumUp TillerSystem Stock Extractor] ✅ Content of Step 1 script loaded!');
chrome.runtime.sendMessage({ type: "GET_STORE_ID", url: STOCK_URL, cookie_name: STORE_ID_COOKIE }, function(result) {
  STORE_ID = result
  if (STORE_ID) {
    console.debug('[SumUp TillerSystem Stock Extractor] ✅ Successfully retrieve Store ID from cookies:', STORE_ID);
  } else {
    console.error(`'[SumUp TillerSystem Stock Extractor] ❌ Error when retrieving Store ID from cookies, is the cookie ${STORE_ID_COOKIE} still available?'`);
  }
});

injectSpinnerStyles();
injectButton();