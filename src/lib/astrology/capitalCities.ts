export interface CapitalCityOption {
  id: string;
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export const CAPITAL_CITY_OPTIONS: CapitalCityOption[] = [
  { id: 'moscow', name: 'Москва', country: 'Россия', timezone: 'Europe/Moscow', latitude: 55.7558, longitude: 37.6173 },
  { id: 'washington-dc', name: 'Вашингтон', country: 'США', timezone: 'America/New_York', latitude: 38.9072, longitude: -77.0369 },
  { id: 'london', name: 'Лондон', country: 'Великобритания', timezone: 'Europe/London', latitude: 51.5072, longitude: -0.1276 },
  { id: 'paris', name: 'Париж', country: 'Франция', timezone: 'Europe/Paris', latitude: 48.8566, longitude: 2.3522 },
  { id: 'berlin', name: 'Берлин', country: 'Германия', timezone: 'Europe/Berlin', latitude: 52.52, longitude: 13.405 },
  { id: 'rome', name: 'Рим', country: 'Италия', timezone: 'Europe/Rome', latitude: 41.9028, longitude: 12.4964 },
  { id: 'madrid', name: 'Мадрид', country: 'Испания', timezone: 'Europe/Madrid', latitude: 40.4168, longitude: -3.7038 },
  { id: 'lisbon', name: 'Лиссабон', country: 'Португалия', timezone: 'Europe/Lisbon', latitude: 38.7223, longitude: -9.1393 },
  { id: 'vienna', name: 'Вена', country: 'Австрия', timezone: 'Europe/Vienna', latitude: 48.2082, longitude: 16.3738 },
  { id: 'prague', name: 'Прага', country: 'Чехия', timezone: 'Europe/Prague', latitude: 50.0755, longitude: 14.4378 },
  { id: 'warsaw', name: 'Варшава', country: 'Польша', timezone: 'Europe/Warsaw', latitude: 52.2297, longitude: 21.0122 },
  { id: 'kyiv', name: 'Киев', country: 'Украина', timezone: 'Europe/Kyiv', latitude: 50.4501, longitude: 30.5234 },
  { id: 'minsk', name: 'Минск', country: 'Беларусь', timezone: 'Europe/Minsk', latitude: 53.9006, longitude: 27.559 },
  { id: 'astana', name: 'Астана', country: 'Казахстан', timezone: 'Asia/Almaty', latitude: 51.1694, longitude: 71.4491 },
  { id: 'tbilisi', name: 'Тбилиси', country: 'Грузия', timezone: 'Asia/Tbilisi', latitude: 41.7151, longitude: 44.8271 },
  { id: 'yerevan', name: 'Ереван', country: 'Армения', timezone: 'Asia/Yerevan', latitude: 40.1872, longitude: 44.5152 },
  { id: 'baku', name: 'Баку', country: 'Азербайджан', timezone: 'Asia/Baku', latitude: 40.4093, longitude: 49.8671 },
  { id: 'ankara', name: 'Анкара', country: 'Турция', timezone: 'Europe/Istanbul', latitude: 39.9334, longitude: 32.8597 },
  { id: 'new-delhi', name: 'Нью-Дели', country: 'Индия', timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 },
  { id: 'kathmandu', name: 'Катманду', country: 'Непал', timezone: 'Asia/Kathmandu', latitude: 27.7172, longitude: 85.324 },
  { id: 'colombo', name: 'Коломбо', country: 'Шри-Ланка', timezone: 'Asia/Colombo', latitude: 6.9271, longitude: 79.8612 },
  { id: 'bangkok', name: 'Бангкок', country: 'Таиланд', timezone: 'Asia/Bangkok', latitude: 13.7563, longitude: 100.5018 },
  { id: 'beijing', name: 'Пекин', country: 'Китай', timezone: 'Asia/Shanghai', latitude: 39.9042, longitude: 116.4074 },
  { id: 'tokyo', name: 'Токио', country: 'Япония', timezone: 'Asia/Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { id: 'seoul', name: 'Сеул', country: 'Южная Корея', timezone: 'Asia/Seoul', latitude: 37.5665, longitude: 126.978 },
  { id: 'jakarta', name: 'Джакарта', country: 'Индонезия', timezone: 'Asia/Jakarta', latitude: -6.2088, longitude: 106.8456 },
  { id: 'canberra', name: 'Канберра', country: 'Австралия', timezone: 'Australia/Sydney', latitude: -35.2809, longitude: 149.13 },
  { id: 'wellington', name: 'Веллингтон', country: 'Новая Зеландия', timezone: 'Pacific/Auckland', latitude: -41.2865, longitude: 174.7762 },
  { id: 'ottawa', name: 'Оттава', country: 'Канада', timezone: 'America/Toronto', latitude: 45.4215, longitude: -75.6972 },
  { id: 'mexico-city', name: 'Мехико', country: 'Мексика', timezone: 'America/Mexico_City', latitude: 19.4326, longitude: -99.1332 },
  { id: 'brasilia', name: 'Бразилиа', country: 'Бразилия', timezone: 'America/Sao_Paulo', latitude: -15.7939, longitude: -47.8828 },
  { id: 'buenos-aires', name: 'Буэнос-Айрес', country: 'Аргентина', timezone: 'America/Argentina/Buenos_Aires', latitude: -34.6037, longitude: -58.3816 },
  { id: 'cairo', name: 'Каир', country: 'Египет', timezone: 'Africa/Cairo', latitude: 30.0444, longitude: 31.2357 },
  { id: 'jerusalem', name: 'Иерусалим', country: 'Израиль', timezone: 'Asia/Jerusalem', latitude: 31.7683, longitude: 35.2137 },
  { id: 'tehran', name: 'Тегеран', country: 'Иран', timezone: 'Asia/Tehran', latitude: 35.6892, longitude: 51.389 },
  { id: 'riyadh', name: 'Эр-Рияд', country: 'Саудовская Аравия', timezone: 'Asia/Riyadh', latitude: 24.7136, longitude: 46.6753 },
  { id: 'abu-dhabi', name: 'Абу-Даби', country: 'ОАЭ', timezone: 'Asia/Dubai', latitude: 24.4539, longitude: 54.3773 },
  { id: 'doha', name: 'Доха', country: 'Катар', timezone: 'Asia/Qatar', latitude: 25.2854, longitude: 51.531 },
];

export function getCapitalCityById(cityId: string | undefined) {
  return CAPITAL_CITY_OPTIONS.find((city) => city.id === cityId);
}
