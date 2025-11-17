export function extractProjectInfo(url: string) : {projectPath: string; mrIid: string} {
  const parsedUrl = new URL(url);
  const pathnameParts = parsedUrl.pathname.split('/');
  const index = pathnameParts.indexOf('-');
  if (index === -1 || index + 2 >= pathnameParts.length) {
    throw new Error('Invalid NeoAi MR URL');
  }
  
  const projectPath = pathnameParts.slice(1, index).join('/');
  const mrIid = pathnameParts[index + 2];
  
  return { projectPath, mrIid };
}

/**
 * Parses the NeoAi issue URL to extract project ID and issue IID.
 * Example URL: "https://neoai.com/neoai-org/neoai/-/issues/502414"
 */
export function parseNeoaiIssueUrl(url: string) {
  const urlPattern = /https:\/\/neoai\.com\/(.+?)\/-\/issues\/(\d+)/;
  const match = url.match(urlPattern);
  
  if (!match) {
    throw new Error("Invalid NeoAi issue URL format");
  }
  
  const projectId = encodeURIComponent(match[1]); // URL-encode the project path
  const issueIid = match[2];
  
  return { projectId, issueIid };
}

export function parseNeoaiEpicUrl(url: string) {
  const urlPattern = /https:\/\/neoai\.com\/groups\/(.+?)\/-\/epics\/(\d+)/;
  const match = url.match(urlPattern);
  
  if (!match) {
    throw new Error("Invalid NeoAi epic URL format");
  }
  
  const groupId = match[1]; // URL-encode the group path
  const epicIid = match[2];
  
  return { groupId, epicIid };
}

export const calculateDaysSince = (date: string) => {
  const targetDate = new Date(date);
  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - targetDate.getTime();
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24)); // Convert milliseconds to days
  return daysDifference;
};

export function formatDateForUI(isoDate: string): string {
  if (isoDate === 'Till Date') {
    return isoDate
  }

  const date = new Date(isoDate);

  // Extract year, month, and day
  const year = date.getUTCFullYear();
  const month = date.toLocaleString('default', { month: 'long', timeZone: 'UTC' }); // e.g., "November"
  const day = date.getUTCDate();

  // Construct the friendly date format
  return `${month} ${day}, ${year}`;
}

const cachePrefix = 'cc-cache-';

function setItemWithExpiry(key: string, value: object, ttlInMinutes: number) {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttlInMinutes * 60 * 1000,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

// Utility function to get an item from localStorage, considering expiry
export function getItemWithExpiry(keyWithoutPrefix: string): object | null {
  const key = cachePrefix + keyWithoutPrefix;
  const itemStr = localStorage.getItem(key);
  if (!itemStr) {
    return null;
  }
  const item = JSON.parse(itemStr);
  const now = new Date();
  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return item.value;
}

function cleanExpiredCache() {
  const now = new Date().getTime();
  
  // Iterate through all items in localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    
    // Only target keys that start with 'cc-cache-'
    if (key && key.startsWith(cachePrefix)) {
      const itemStr = localStorage.getItem(key);
      if (itemStr) {
        const item = JSON.parse(itemStr);
        if (item.expiry && now > item.expiry) {
          localStorage.removeItem(key); // Remove expired cache item
        }
      }
    }
  }
}

export function addToCache(key: string, value?: object | null) {
  if (!value) return;
  setItemWithExpiry(cachePrefix + key, value, 30);
  cleanExpiredCache();
}

export async function downloadFiles(files: string[]): Promise<Map<string, string>> {
  const fileContentMap = new Map<string, string>();

  for (const file of files) {
    try {
      const response = await fetch(file);
      
      if (!response.ok) {
        console.error(`Error downloading filestatus: ${response.status}`)
        continue
      }
      
      const text = await response.text();
      fileContentMap.set(file, text);
    } catch (error) {
      console.error(`Error downloading file :`, error);
    }
  }

  return fileContentMap;
}
