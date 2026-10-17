# Wikidata（CC0。クレジット表記不要）から日本の鉄道駅の座標を取得し、
# scripts/presetData/wikidata/stations.json に保存するスクリプト（7.36節）。
# 生成スクリプト（build_presets.py）はこのファイルを読んで駅の座標を差し替える。
# 使い方: python scripts/presetData/fetch_wikidata.py
#   Wikidata の問い合わせ窓口は回数制限があるため、問い合わせは2回（まとめて取得＋不足分の補完）に抑え、
#   間隔をあけて送る。制限（HTTP 429）にかかった場合は待ってから再試行する。
import csv, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'wikidata', 'stations.json')
STATION_DB = os.path.join(HERE, '..', '..', 'public', 'csv', 'presetLines', 'stationDB.csv')
ENDPOINT = 'https://query.wikidata.org/sparql'
USER_AGENT = 'trainLCD-preset-builder/0.1 (station preset data for a train LCD simulator)'
# 問い合わせの間隔（秒）。窓口の回数制限に合わせる
QUERY_INTERVAL = 65

# 取得する値: 項目・日本語名・座標・事業者の日本語名（複数は | 区切り）・廃止日の有無
SELECT = '''SELECT ?s ?ja ?c (GROUP_CONCAT(DISTINCT ?opLabel; separator="|") AS ?ops) (SAMPLE(?closed) AS ?closedAt) WHERE {
  %s
  OPTIONAL { ?s wdt:P137 ?op . ?op rdfs:label ?opLabel FILTER(LANG(?opLabel) = "ja") }
  OPTIONAL { ?s wdt:P576 ?closed }
}
GROUP BY ?s ?ja ?c'''

# 1回目: 日本（Q17）にあり「鉄道駅」（Q55488）に直接分類され、座標（P625）を持つ項目をまとめて取得する
MAIN_PATTERN = '''?s wdt:P31 wd:Q55488 ; wdt:P17 wd:Q17 ; wdt:P625 ?c .
  OPTIONAL { ?s rdfs:label ?ja FILTER(LANG(?ja) = "ja") }'''

# 2回目: 1回目で見つからなかった駅名を、日本語名（「○○駅」）で探して補う（分類は問わない）
SUPPLEMENT_PATTERN = '''VALUES ?ja { %s }
  ?s rdfs:label ?ja ; wdt:P17 wd:Q17 ; wdt:P625 ?c .'''

def run_query(query):
    url = ENDPOINT + '?' + urllib.parse.urlencode({'query': query})
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json'})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as res:
                return json.load(res)['results']['bindings']
        except urllib.error.HTTPError as e:
            # 回数制限にかかった場合は、指示された時間（なければ70秒）待って再試行する
            if e.code == 429 and attempt < 5:
                wait = int(e.headers.get('Retry-After') or 70)
                print(f'回数制限のため {wait} 秒待って再試行します（{attempt + 1}/5）', flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError('Wikidata への問い合わせに失敗しました')

def normalize_name(label):
    # 「新宿駅」「大久保駅 (東京都)」などから駅名部分（新宿・大久保）を取り出す
    name = re.sub(r'\s*[（(][^）)]*[）)]\s*$', '', label)
    return re.sub(r'駅$', '', name)

def match_name(name):
    # 照合用の駅名: 表記の揺れ（ヶ/ケ、驒/騨）をそろえる（build_presets.py と同じ規則）
    return name.replace('ヶ', 'ケ').replace('驒', '騨')

def to_station(r):
    label = r.get('ja', {}).get('value')
    m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', r['c']['value'])
    if not label or not m: return None
    return {
        'qid': r['s']['value'].rsplit('/', 1)[-1],
        'label': label,
        'name': normalize_name(label),
        'lat': round(float(m.group(2)), 6),
        'lon': round(float(m.group(1)), 6),
        'operators': [o for o in r.get('ops', {}).get('value', '').split('|') if o],
        'closed': 'closedAt' in r,
    }

def main():
    print('1回目: 鉄道駅をまとめて取得しています…', flush=True)
    stations = {}
    for r in run_query(SELECT % MAIN_PATTERN):
        st = to_station(r)
        if st: stations[st['qid']] = st
    print(f'  {len(stations)} 件', flush=True)

    # 駅プリセットにある駅名のうち、1回目で見つからなかったものを2回目で探す
    found = {match_name(s['name']) for s in stations.values()}
    names = sorted({row['駅名'] for row in csv.DictReader(open(STATION_DB, encoding='utf-8'))})
    missing = [n for n in names if match_name(n) not in found]
    if missing:
        # 表記の揺れ（ヶ/ケ、驒/騨）の両方の形で探す
        labels = set()
        for n in missing:
            for v in {n, n.replace('ケ', 'ヶ'), n.replace('ヶ', 'ケ'), n.replace('騨', '驒')}:
                labels.add(f'"{v}駅"@ja')
        print(f'2回目: 見つからなかった {len(missing)} 駅名を駅名で探しています…（{QUERY_INTERVAL} 秒待ってから送信）', flush=True)
        time.sleep(QUERY_INTERVAL)
        added = 0
        for r in run_query(SELECT % (SUPPLEMENT_PATTERN % ' '.join(sorted(labels)))):
            st = to_station(r)
            if st and st['qid'] not in stations:
                stations[st['qid']] = st
                added += 1
        print(f'  {added} 件を追加', flush=True)

    result = sorted(stations.values(), key=lambda s: (s['name'], s['qid']))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fp:
        json.dump({
            '_source': 'Wikidata (https://www.wikidata.org/), CC0',
            '_fetched': time.strftime('%Y-%m-%d'),
            'stations': result,
        }, fp, ensure_ascii=False, indent=0)
    print(f'{len(result)} 駅を保存しました: {OUT}', flush=True)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
