"""Build src/data/cities.json: every IANA time zone with Chinese/English city and
country names (CLDR), coordinates (tzdb zone.tab), plus well-known cities that
are not zone exemplars (Beijing, San Francisco, ...).

Usage: python3 scripts/build_cities.py src/data/cities.json
"""
import json
import re
import sys
import urllib.request

CLDR = "https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json"
TZDB = "https://raw.githubusercontent.com/eggert/tz/main"

# Cities that are not zone exemplars, or whose zone is named after another city.
# (zh, en, tz, country code, lat, lon, popularity, extra search keywords)
EXTRA = [
    ("北京", "Beijing", "Asia/Shanghai", "CN", 39.90, 116.40, 2, "peking"),
    ("深圳", "Shenzhen", "Asia/Shanghai", "CN", 22.54, 114.06, 1, ""),
    ("广州", "Guangzhou", "Asia/Shanghai", "CN", 23.13, 113.26, 1, ""),
    ("杭州", "Hangzhou", "Asia/Shanghai", "CN", 30.27, 120.16, 1, ""),
    ("成都", "Chengdu", "Asia/Shanghai", "CN", 30.57, 104.07, 1, ""),
    ("重庆", "Chongqing", "Asia/Shanghai", "CN", 29.56, 106.55, 1, ""),
    ("武汉", "Wuhan", "Asia/Shanghai", "CN", 30.59, 114.31, 1, ""),
    ("西安", "Xi'an", "Asia/Shanghai", "CN", 34.34, 108.94, 1, "xian"),
    ("南京", "Nanjing", "Asia/Shanghai", "CN", 32.06, 118.80, 1, ""),
    ("天津", "Tianjin", "Asia/Shanghai", "CN", 39.13, 117.20, 0, ""),
    ("苏州", "Suzhou", "Asia/Shanghai", "CN", 31.30, 120.58, 0, ""),
    ("厦门", "Xiamen", "Asia/Shanghai", "CN", 24.48, 118.09, 0, ""),
    ("青岛", "Qingdao", "Asia/Shanghai", "CN", 36.07, 120.38, 0, ""),
    ("长沙", "Changsha", "Asia/Shanghai", "CN", 28.23, 112.94, 0, ""),
    ("哈尔滨", "Harbin", "Asia/Shanghai", "CN", 45.80, 126.53, 0, ""),
    ("昆明", "Kunming", "Asia/Shanghai", "CN", 25.04, 102.71, 0, ""),
    ("华盛顿", "Washington, D.C.", "America/New_York", "US", 38.90, -77.04, 2, "dc"),
    ("波士顿", "Boston", "America/New_York", "US", 42.36, -71.06, 1, ""),
    ("费城", "Philadelphia", "America/New_York", "US", 39.95, -75.17, 0, ""),
    ("亚特兰大", "Atlanta", "America/New_York", "US", 33.75, -84.39, 0, ""),
    ("迈阿密", "Miami", "America/New_York", "US", 25.76, -80.19, 1, ""),
    ("旧金山", "San Francisco", "America/Los_Angeles", "US", 37.77, -122.42, 2, "三藩市 sf"),
    ("圣何塞", "San Jose", "America/Los_Angeles", "US", 37.34, -121.89, 1, "硅谷 silicon valley"),
    ("西雅图", "Seattle", "America/Los_Angeles", "US", 47.61, -122.33, 2, ""),
    ("圣迭戈", "San Diego", "America/Los_Angeles", "US", 32.72, -117.16, 0, "圣地亚哥"),
    ("拉斯维加斯", "Las Vegas", "America/Los_Angeles", "US", 36.17, -115.14, 1, ""),
    ("波特兰", "Portland", "America/Los_Angeles", "US", 45.52, -122.68, 0, ""),
    ("休斯敦", "Houston", "America/Chicago", "US", 29.76, -95.37, 1, "休斯顿"),
    ("达拉斯", "Dallas", "America/Chicago", "US", 32.78, -96.80, 1, ""),
    ("奥斯汀", "Austin", "America/Chicago", "US", 30.27, -97.74, 0, ""),
    ("盐湖城", "Salt Lake City", "America/Denver", "US", 40.76, -111.89, 0, ""),
    ("渥太华", "Ottawa", "America/Toronto", "CA", 45.42, -75.70, 0, ""),
    ("蒙特利尔", "Montreal", "America/Toronto", "CA", 45.50, -73.57, 1, "montréal"),
    ("卡尔加里", "Calgary", "America/Edmonton", "CA", 51.05, -114.07, 0, ""),
    ("曼彻斯特", "Manchester", "Europe/London", "GB", 53.48, -2.24, 0, ""),
    ("爱丁堡", "Edinburgh", "Europe/London", "GB", 55.95, -3.19, 0, ""),
    ("剑桥", "Cambridge", "Europe/London", "GB", 52.21, 0.12, 0, ""),
    ("牛津", "Oxford", "Europe/London", "GB", 51.75, -1.26, 0, ""),
    ("慕尼黑", "Munich", "Europe/Berlin", "DE", 48.14, 11.58, 1, "münchen"),
    ("法兰克福", "Frankfurt", "Europe/Berlin", "DE", 50.11, 8.68, 1, ""),
    ("汉堡", "Hamburg", "Europe/Berlin", "DE", 53.55, 9.99, 0, ""),
    ("米兰", "Milan", "Europe/Rome", "IT", 45.46, 9.19, 1, "milano"),
    ("威尼斯", "Venice", "Europe/Rome", "IT", 45.44, 12.32, 0, ""),
    ("佛罗伦萨", "Florence", "Europe/Rome", "IT", 43.77, 11.26, 0, ""),
    ("巴塞罗那", "Barcelona", "Europe/Madrid", "ES", 41.39, 2.17, 1, ""),
    ("日内瓦", "Geneva", "Europe/Zurich", "CH", 46.20, 6.14, 0, ""),
    ("里昂", "Lyon", "Europe/Paris", "FR", 45.76, 4.84, 0, ""),
    ("尼斯", "Nice", "Europe/Paris", "FR", 43.70, 7.27, 0, ""),
    ("圣彼得堡", "Saint Petersburg", "Europe/Moscow", "RU", 59.93, 30.36, 0, ""),
    ("大阪", "Osaka", "Asia/Tokyo", "JP", 34.69, 135.50, 1, ""),
    ("京都", "Kyoto", "Asia/Tokyo", "JP", 35.01, 135.77, 0, ""),
    ("札幌", "Sapporo", "Asia/Tokyo", "JP", 43.06, 141.35, 0, ""),
    ("福冈", "Fukuoka", "Asia/Tokyo", "JP", 33.59, 130.40, 0, ""),
    ("釜山", "Busan", "Asia/Seoul", "KR", 35.18, 129.08, 0, ""),
    ("孟买", "Mumbai", "Asia/Kolkata", "IN", 19.08, 72.88, 1, "bombay"),
    ("新德里", "New Delhi", "Asia/Kolkata", "IN", 28.61, 77.21, 1, "delhi"),
    ("班加罗尔", "Bengaluru", "Asia/Kolkata", "IN", 12.97, 77.59, 0, "bangalore"),
    ("河内", "Hanoi", "Asia/Ho_Chi_Minh", "VN", 21.03, 105.85, 0, ""),
    ("清迈", "Chiang Mai", "Asia/Bangkok", "TH", 18.79, 98.98, 0, ""),
    ("普吉", "Phuket", "Asia/Bangkok", "TH", 7.88, 98.39, 0, ""),
    ("巴厘岛", "Bali", "Asia/Makassar", "ID", -8.34, 115.09, 0, "denpasar"),
    ("槟城", "Penang", "Asia/Kuala_Lumpur", "MY", 5.41, 100.33, 0, ""),
    ("阿布扎比", "Abu Dhabi", "Asia/Dubai", "AE", 24.45, 54.38, 0, ""),
    ("特拉维夫", "Tel Aviv", "Asia/Jerusalem", "IL", 32.09, 34.78, 0, ""),
    ("伊斯兰堡", "Islamabad", "Asia/Karachi", "PK", 33.68, 73.05, 0, ""),
    ("堪培拉", "Canberra", "Australia/Sydney", "AU", -35.28, 149.13, 0, ""),
    ("黄金海岸", "Gold Coast", "Australia/Brisbane", "AU", -28.02, 153.40, 0, ""),
    ("惠灵顿", "Wellington", "Pacific/Auckland", "NZ", -41.29, 174.78, 0, ""),
    ("皇后镇", "Queenstown", "Pacific/Auckland", "NZ", -45.03, 168.66, 0, ""),
    ("基督城", "Christchurch", "Pacific/Auckland", "NZ", -43.53, 172.64, 0, ""),
    ("里约热内卢", "Rio de Janeiro", "America/Sao_Paulo", "BR", -22.91, -43.17, 1, "rio"),
    ("巴西利亚", "Brasília", "America/Sao_Paulo", "BR", -15.79, -47.88, 0, "brasilia"),
    ("开普敦", "Cape Town", "Africa/Johannesburg", "ZA", -33.92, 18.42, 0, ""),
]

# Zone exemplars people look for most; they float to the top of the list.
POPULAR = {
    "America/New_York": 2, "America/Los_Angeles": 2, "America/Chicago": 1, "America/Denver": 1,
    "America/Phoenix": 0, "America/Anchorage": 0, "Pacific/Honolulu": 1, "America/Toronto": 2,
    "America/Vancouver": 2, "America/Mexico_City": 1, "America/Sao_Paulo": 1,
    "America/Argentina/Buenos_Aires": 1, "Europe/London": 2, "Europe/Paris": 2, "Europe/Berlin": 2,
    "Europe/Madrid": 1, "Europe/Rome": 1, "Europe/Amsterdam": 1, "Europe/Zurich": 1,
    "Europe/Moscow": 1, "Europe/Istanbul": 1, "Asia/Dubai": 2, "Asia/Kolkata": 1,
    "Asia/Bangkok": 1, "Asia/Singapore": 2, "Asia/Kuala_Lumpur": 1, "Asia/Jakarta": 1,
    "Asia/Manila": 1, "Asia/Ho_Chi_Minh": 1, "Asia/Hong_Kong": 2, "Asia/Macau": 1,
    "Asia/Taipei": 2, "Asia/Shanghai": 1, "Asia/Seoul": 2, "Asia/Tokyo": 2,
    "Australia/Sydney": 2, "Australia/Melbourne": 1, "Australia/Brisbane": 1, "Australia/Perth": 1,
    "Pacific/Auckland": 1, "Africa/Cairo": 1, "Africa/Johannesburg": 1, "Africa/Nairobi": 0,
    "Africa/Lagos": 0,
}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "world-time"}), timeout=60) as r:
        return r.read().decode("utf-8")


def exemplars(locale):
    data = json.loads(fetch(f"{CLDR}/cldr-dates-full/main/{locale}/timeZoneNames.json"))
    zones = data["main"][locale]["dates"]["timeZoneNames"]["zone"]
    out = {}

    def walk(node, path):
        if "exemplarCity" in node:
            out["/".join(path)] = node["exemplarCity"]
        for k, v in node.items():
            if isinstance(v, dict) and k not in ("long", "short"):
                walk(v, path + [k])

    walk(zones, [])
    return out


def territories(locale):
    data = json.loads(fetch(f"{CLDR}/cldr-localenames-full/main/{locale}/territories.json"))
    names = data["main"][locale]["localeDisplayNames"]["territories"]
    # prefer short forms such as "香港" over "中国香港特别行政区"
    return {k: names.get(k + "-alt-short", v) for k, v in names.items() if "-alt-" not in k}


def same_city_ids():
    """CLDR groups ids that name the same place (Asia/Calcutta = Asia/Kolkata).
    tzdb 'backward' links also merge different places (Indian/Mahe -> Asia/Dubai), so it is not used."""
    data = json.loads(fetch(f"{CLDR}/cldr-bcp47/bcp47/timezone.json"))
    groups = {}
    for v in data["keyword"]["u"]["tz"].values():
        if isinstance(v, dict) and "_alias" in v:
            ids = v["_alias"].split()
            for i in ids:
                groups[i] = ids
    return groups


def coord(s):
    m = re.fullmatch(r"([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?", s)
    sign_a, da, ma, sa, sign_o, do, mo, so = m.groups()
    lat = int(da) + int(ma) / 60 + int(sa or 0) / 3600
    lon = int(do) + int(mo) / 60 + int(so or 0) / 3600
    return round(lat if sign_a == "+" else -lat, 3), round(lon if sign_o == "+" else -lon, 3)


def main(out_path):
    zh, en = exemplars("zh"), exemplars("en")
    tzh, ten = territories("zh"), territories("en")
    groups = same_city_ids()

    def name(table, tz):
        for k in [tz] + groups.get(tz, []):
            if k in table:
                return table[k]
        return None

    cities = []
    for line in fetch(f"{TZDB}/zone.tab").splitlines():
        if not line or line.startswith("#"):
            continue
        cc, co, tz = line.split("\t")[:3]
        lat, lon = coord(co)
        en_name = name(en, tz) or tz.split("/")[-1].replace("_", " ")
        cities.append({
            "id": tz, "zh": name(zh, tz) or en_name, "en": en_name, "tz": tz,
            "cc": cc, "cn": tzh.get(cc, cc), "ce": ten.get(cc, cc),
            "lat": lat, "lon": lon, "p": POPULAR.get(tz, -1) + 1,
        })
    zone_ids = {c["tz"] for c in cities}
    for zh_name, en_name, tz, cc, lat, lon, pop, kw in EXTRA:
        assert tz in zone_ids, tz
        city = {
            "id": tz + "#" + re.sub(r"[^a-z]+", "-", en_name.lower()).strip("-"),
            "zh": zh_name, "en": en_name, "tz": tz, "cc": cc, "cn": tzh.get(cc, cc), "ce": ten.get(cc, cc),
            "lat": lat, "lon": lon, "p": pop + 1,
        }
        if kw:
            city["kw"] = kw
        cities.append(city)
    cities.append({"id": "UTC", "zh": "协调世界时", "en": "UTC", "tz": "UTC", "cc": "", "cn": "", "ce": "",
                   "lat": 51.478, "lon": 0.0, "p": 2, "kw": "gmt 格林尼治 世界标准时间"})
    cities.sort(key=lambda c: (-c["p"], c["en"]))
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cities, f, ensure_ascii=False, separators=(",", ":"))
    print(len(cities), "cities written to", out_path)


if __name__ == "__main__":
    main(sys.argv[1])
