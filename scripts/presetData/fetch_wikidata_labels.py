# Wikidata（CC0。クレジット表記不要）から、駅の中国語（簡体字）・韓国語の表記を取得し、
# scripts/presetData/wikidata/labels.json に保存するスクリプト（7.54節）。
# 対象は wikidata/stations.json（fetch_wikidata.py で取得）にある駅の項目。
# 生成スクリプト（build_presets.py）は、座標の差し替えと同じ規則で駅に対応づけた項目の表記を使う。
# 簡体字の表記が無い項目のために、中国語版 Wikipedia の記事名を中国語版 Wikipedia の字体変換で簡体字（zh-cn）にしたものも保存する。
# 使い方: python scripts/presetData/fetch_wikidata_labels.py
#   Wikidata の問い合わせ窓口は回数制限があるため、項目をまとめて少ない回数で問い合わせ、間隔をあけて送る。
import csv, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
STATIONS = os.path.join(HERE, 'wikidata', 'stations.json')
OUT = os.path.join(HERE, 'wikidata', 'labels.json')
STATION_DB = os.path.join(HERE, '..', '..', 'public', 'csv', 'presetLines', 'stationDB.csv')
ENDPOINT = 'https://query.wikidata.org/sparql'
USER_AGENT = 'trainLCD-preset-builder/0.1 (station preset data for a train LCD simulator)'
# 問い合わせの間隔（秒）と、1回にまとめる項目数
QUERY_INTERVAL = 65
BATCH = 2500
# 取得する言語。中国語は簡体字の表記だけを使う（zh-hans → zh-cn → zh-sg → zh-my の順に優先）
LANGS = ['zh-hans', 'zh-cn', 'zh-sg', 'zh-my', 'ko']

# 中国語版 Wikipedia の記事名（Wikidata のサイトリンク）
SITELINK_QUERY = '''SELECT ?s ?title WHERE {
  VALUES ?s { %s }
  ?article schema:about ?s ; schema:isPartOf <https://zh.wikipedia.org/> ; schema:name ?title .
}'''
ZHWIKI_API = 'https://zh.wikipedia.org/w/api.php'
# 中国語版 Wikipedia への問い合わせの間隔（秒）と、1回にまとめる記事数（API の上限は50）
ZHWIKI_INTERVAL = 1.0
ZHWIKI_BATCH = 50

# stations.json に無い駅名の項目を、日本語名（「○○駅」）で探す（分類は問わない）。
# 新宿・銀座など、鉄道駅（Q55488）に直接分類されていない駅の項目を補う。表記を探すためだけに使う
EXTRA_QUERY = '''SELECT ?s ?ja ?c WHERE {
  VALUES ?ja { %s }
  ?s rdfs:label ?ja ; wdt:P17 wd:Q17 ; wdt:P625 ?c .
}'''

QUERY = '''SELECT ?s ?l (LANG(?l) AS ?lang) WHERE {
  VALUES ?s { %s }
  ?s rdfs:label ?l .
  FILTER(LANG(?l) IN (%s))
}'''

def run_query(query):
    # 項目の一覧が長くなるため POST で送る
    data = urllib.parse.urlencode({'query': query}).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=data, headers={
        'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded'})
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

def fetch_variant_titles(titles):
    # 記事名 → 簡体字（zh-cn）の記事名。中国語版 Wikipedia の字体変換（varianttitles）を使う
    result = {}
    for n in range(0, len(titles), ZHWIKI_BATCH):
        batch = titles[n:n + ZHWIKI_BATCH]
        params = {'action': 'query', 'format': 'json', 'formatversion': '2', 'prop': 'info',
                  'inprop': 'varianttitles', 'titles': '|'.join(batch)}
        req = urllib.request.Request(ZHWIKI_API + '?' + urllib.parse.urlencode(params), headers={'User-Agent': USER_AGENT})
        for attempt in range(6):
            try:
                with urllib.request.urlopen(req, timeout=60) as res:
                    data = json.load(res)
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < 5:
                    time.sleep(int(e.headers.get('Retry-After') or 30))
                    continue
                raise
        # 正規化された記事名（normalized）を元の記事名に戻して対応づける
        back = {x['to']: x['from'] for x in data['query'].get('normalized', [])}
        for page in data['query'].get('pages', []):
            cn = page.get('varianttitles', {}).get('zh-cn')
            if cn: result[back.get(page['title'], page['title'])] = cn
        if (n // ZHWIKI_BATCH) % 20 == 0:
            print(f'  中国語版 Wikipedia: {n + len(batch)} / {len(titles)} 件', flush=True)
        time.sleep(ZHWIKI_INTERVAL)
    return result

def match_name(name):
    # 照合用の駅名: 表記の揺れ（ヶ/ケ、驒/騨）をそろえる（build_presets.py と同じ規則）
    return name.replace('ヶ', 'ケ').replace('驒', '騨')

def fetch_extra_items(known_names):
    # 駅プリセットの駅名のうち stations.json に無いものを、日本語名で探して項目（qid・駅名・座標）を返す
    names = sorted({row['駅名'] for row in csv.DictReader(open(STATION_DB, encoding='utf-8'))})
    missing = [n for n in names if match_name(n) not in known_names]
    labels = set()
    for n in missing:
        for v in {n, n.replace('ケ', 'ヶ'), n.replace('ヶ', 'ケ'), n.replace('騨', '驒')}:
            labels.add(f'"{v}駅"@ja')
    print(f'stations.json に無い {len(missing)} 駅名の項目を探しています…', flush=True)
    items = {}
    for r in run_query(EXTRA_QUERY % ' '.join(sorted(labels))):
        m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', r['c']['value'])
        if not m: continue
        qid = r['s']['value'].rsplit('/', 1)[-1]
        items[qid] = {'qid': qid, 'name': re.sub(r'駅$', '', r['ja']['value']),
                      'lat': round(float(m.group(2)), 6), 'lon': round(float(m.group(1)), 6)}
    print(f'  {len(items)} 項目', flush=True)
    return sorted(items.values(), key=lambda w: (w['name'], w['qid']))

def main():
    wd_stations = json.load(open(STATIONS, encoding='utf-8'))['stations']
    extra_items = fetch_extra_items({match_name(s['name']) for s in wd_stations})
    qids = sorted({s['qid'] for s in wd_stations} | {w['qid'] for w in extra_items})
    labels = {}  # qid → {lang: label}
    batches = [qids[i:i + BATCH] for i in range(0, len(qids), BATCH)]
    for n, batch in enumerate(batches):
        time.sleep(QUERY_INTERVAL)
        print(f'{n + 1}/{len(batches)} 回目: {len(batch)} 項目の表記を取得しています…', flush=True)
        values = ' '.join(f'wd:{q}' for q in batch)
        langs = ', '.join(f'"{l}"' for l in LANGS)
        for r in run_query(QUERY % (values, langs)):
            qid = r['s']['value'].rsplit('/', 1)[-1]
            labels.setdefault(qid, {})[r['lang']['value']] = r['l']['value']
    # 簡体字の表記が無い項目は、中国語版 Wikipedia の記事名を簡体字に変換したものを使えるようにする（zhwiki-cn）
    need = [q for q in qids if not any(l in labels.get(q, {}) for l in LANGS if l.startswith('zh'))]
    sitelinks = {}
    for n in range(0, len(need), BATCH):
        time.sleep(QUERY_INTERVAL)
        batch = need[n:n + BATCH]
        print(f'中国語版 Wikipedia の記事名を取得しています… {n + len(batch)} / {len(need)} 項目', flush=True)
        for r in run_query(SITELINK_QUERY % ' '.join(f'wd:{q}' for q in batch)):
            sitelinks[r['s']['value'].rsplit('/', 1)[-1]] = r['title']['value']
    print(f'記事名を簡体字に変換しています…（{len(sitelinks)} 件）', flush=True)
    variants = fetch_variant_titles(sorted(set(sitelinks.values())))
    for q, title in sitelinks.items():
        if title in variants: labels.setdefault(q, {})['zhwiki-cn'] = variants[title]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as fp:
        json.dump({
            '_source': 'Wikidata (https://www.wikidata.org/), CC0。zhwiki-cn は中国語版 Wikipedia の記事名（字体変換で簡体字にしたもの）',
            '_fetched': time.strftime('%Y-%m-%d'),
            # stations.json に無く、表記を探すために追加で見つけた項目（座標の差し替えには使わない）
            'extra_items': extra_items,
            'labels': dict(sorted(labels.items())),
        }, fp, ensure_ascii=False, indent=0)
    print(f'{len(labels)} 項目の表記を保存しました: {OUT}', flush=True)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
