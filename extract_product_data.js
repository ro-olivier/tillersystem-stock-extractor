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
  `;
  document.head.appendChild(style);
}

function collectionHas(a, b) {
    for(var i = 0, len = a.length; i < len; i ++) {
        if(a[i] == b) return true;
    }
    return false;
}
function findParentBySelector(elm, selector) {
    var all = document.querySelectorAll(selector);
    var cur = elm.parentNode;
    while(cur && !collectionHas(all, cur)) {
        cur = cur.parentNode;
    }
    return cur;
}

function injectButton() {
  const targetElement = document.querySelector('#newProduct');
  const parentElement = findParentBySelector(targetElement, ".col-md-6")
  const button = document.createElement('a');
  button.classList.add('btn');
  button.classList.add('btn-primary');
  button.disabled = true;
  button.style.marginTop = "10px";
  button.style.width = "200px";
  button.innerHTML = '<span class="spinner"></span> Working...';
  parentElement.appendChild(button);

  return button;
}



function downloadCSV(csvString) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  const formattedDate = `${yyyy}-${mm}-${dd}`;
  const filename = EXTRACT_FILE_PREFIX+`${formattedDate}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();

  URL.revokeObjectURL(url);
}

function extractToCSV(data, keys) {

  const headers = keys || Object.keys(data[0]);

  const csvRows = [
    headers.join(','),
    ...data.map(item =>
      headers.map(h => `"${(item[h] ?? "").toString().replace(/"/g, '""')}"`).join(',')
    )
  ];

  csvString = csvRows.join("\n");
  downloadCSV(csvString);
}

async function fetchAdditionalData(itemId) {
  const url = PRODUCT_URL_PART1 + itemId + PRODUCT_URL_PART2;
  console.debug(url);
  const response = await fetch(url, { credentials: 'include' });
  const htmlText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const description = doc.querySelector(PRODUCT_DESCRIPTION_IDENTIFIER)?.value.trim() ?? '';
  const price = doc.querySelector(PRODUCT_PRICE_IDENTIFIER)?.value.trim() ?? '';
  const cost = doc.querySelector(PRODUCT_COST_IDENTIFIER)?.value.trim() ?? '';
  const TVA = doc.querySelector(PRODUCT_TVA_IDENTIFIER)?.textContent.trim() ?? '';

  return {
    'description': description,
    'price': price,
    'cost': cost,
    'TVA': TVA
  };
}

async function enrichDataWithConcurrency(items, maxConcurrent = MAX_CONCURRENT) {
  const enriched = [];
  let index = 0;

  async function worker() {
    
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      console.debug('[SumUp TillerSystem Stock Extractor] ✅ Enrichment worker initiated for product', item.itemId);
      try {
        const extra = await fetchAdditionalData(item.itemId);
        COUNTER += 1;
        enriched[currentIndex] = { ...item, ...extra };
        button.innerHTML = `<span class="spinner"></span> Working... (${COUNTER} / ${items.length})`;
      } catch (e) {
        console.error(`'[SumUp TillerSystem Stock Extractor] ❌ Failed to fetch for itemId ${item.itemId}:`, e);
        enriched[currentIndex] = { ...item, field1: "", field2: "", field3: "", field4: "" };
      }
    }
  }

  const workers = Array.from({ length: maxConcurrent }, () => worker());
  await Promise.all(workers);
  return enriched;
}


async function start() {

  chrome.storage.local.get('stockData', async function(result) {
    console.debug('[SumUp TillerSystem Stock Extractor] ✅ Retrieved data from Local Storage:', result.stockData);
    const enriched = await enrichDataWithConcurrency(result.stockData);
    button.innerHTML = 'All done!!'
    extractToCSV(enriched);
  });
  
}


PRODUCT_URL_PART1 = 'https://app.tillersystems.com/product/';
PRODUCT_URL_PART2 = '/edit/popin';
EXTRACT_FILE_PREFIX = 'stock_data_';
MAX_CONCURRENT = 5;
PRODUCT_DESCRIPTION_IDENTIFIER = '#product_description';
PRODUCT_PRICE_IDENTIFIER = '#product_price';
PRODUCT_COST_IDENTIFIER = '#product_costPrice';
PRODUCT_TVA_IDENTIFIER = 'select#product_tax option[selected="selected"]';
COUNTER = 0;

console.debug('[SumUp TillerSystem Stock Extractor] ✅ Content of Step 2 script loaded!');

injectSpinnerStyles();
button = injectButton();
start();