// Утилита для управления запросами к Jikan API с rate limiting и кэшированием

// Кэш для хранения уже загруженных данных
const cache = new Map();

// Очередь запросов
const requestQueue = [];
let isProcessing = false;

// Лимиты Jikan API: 3 запроса в секунду, 60 запросов в минуту
const REQUESTS_PER_SECOND = 3;
const MIN_DELAY_MS = 1000 / REQUESTS_PER_SECOND; // ~333ms между запросами

/**
 * Обработка очереди запросов с rate limiting
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  
  while (requestQueue.length > 0) {
    const { url, resolve, reject } = requestQueue.shift();
    
    try {
      // Проверяем кэш
      if (cache.has(url)) {
        const cachedData = cache.get(url);
        // Кэш действителен 5 минут
        if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
          resolve(cachedData.data);
          continue;
        } else {
          cache.delete(url);
        }
      }
      
      // Делаем запрос
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Превышен лимит - ждем дольше и повторяем (максимум 2 попытки)
        console.warn(`Rate limit exceeded for ${url}, waiting before retry...`);
        
        // Читаем заголовок Retry-After, если он есть
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000; // По умолчанию 5 секунд
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Повторяем запрос один раз
        const retryResponse = await fetch(url);
        if (retryResponse.status === 429) {
          // Если снова 429, возвращаем ошибку
          throw new Error('Rate limit exceeded. Please wait a moment and refresh the page.');
        } else if (!retryResponse.ok) {
          throw new Error(`API error: ${retryResponse.status} ${retryResponse.statusText}`);
        }
        const retryData = await retryResponse.json();
        cache.set(url, { data: retryData, timestamp: Date.now() });
        resolve(retryData);
      } else if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      } else {
        const data = await response.json();
        cache.set(url, { data, timestamp: Date.now() });
        resolve(data);
      }
      
      // Задержка между запросами
      if (requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS));
      }
    } catch (error) {
      reject(error);
    }
  }
  
  isProcessing = false;
}

/**
 * Запрос к Jikan API с rate limiting и кэшированием
 * @param {string} animeId - ID аниме
 * @returns {Promise} Promise с данными аниме
 */
export function fetchAnimeFull(animeId) {
  const url = `https://api.jikan.moe/v4/anime/${animeId}/full`;
  
  return new Promise((resolve, reject) => {
    // Проверяем кэш синхронно
    if (cache.has(url)) {
      const cachedData = cache.get(url);
      if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
        resolve(cachedData.data);
        return;
      } else {
        cache.delete(url);
      }
    }
    
    // Добавляем в очередь
    requestQueue.push({ url, resolve, reject });
    
    // Запускаем обработку очереди
    processQueue();
  });
}

/**
 * Очистка кэша (опционально)
 */
export function clearCache() {
  cache.clear();
}

