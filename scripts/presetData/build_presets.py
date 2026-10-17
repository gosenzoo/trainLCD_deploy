# 駅プリセットの元データ（sources/*.json）を統合し、駅プリセットのCSV 3種
# （public/csv/presetLines/ の stationDB.csv・lineDB.csv・lineConnectDB.csv）を生成するスクリプト。
# 使い方: python scripts/presetData/build_presets.py [出力ディレクトリ]
#   出力ディレクトリを省略すると public/csv/presetLines/ に上書きする。
#   生成前に既存のCSVを読み込み、既存行が変わっていないか（追加のみか）を最後に報告する。
import itertools, json, glob, math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'public', 'csv', 'presetLines')
# 路線番号の範囲ごとの事業者・路線アイコン・ナンバリングアイコン
COMPANIES = [
    (range(0, 51), 'JR東日本', 'I_JR_east', 'N_JR_east'),
    (range(51, 64), 'JR東海', 'I_mono_color', 'N_JR_central'),
    (range(64, 133), 'JR西日本', 'I_JR_west', 'N_JR_west'),
]
def company(no):
    for rg, op, icon, num in COMPANIES:
        if no in rg: return op, icon, num
    raise KeyError(no)
ALL_NOS = [n for rg, *_ in COMPANIES for n in rg]

def dist_km(a, b):
    # 簡易な距離（km）。駅間距離のチェック用
    lat = math.radians((a['lat'] + b['lat']) / 2)
    dx = (a['lon'] - b['lon']) * 111.32 * math.cos(lat)
    dy = (a['lat'] - b['lat']) * 110.57
    return math.hypot(dx, dy)

lines = []
for f in sorted(glob.glob(os.path.join(HERE, 'sources', '*.json'))):
    with open(f, encoding='utf-8') as fp:
        # 路線データ以外の設定ファイル（共同使用駅・乗換グループ）は読み飛ばす
        lines += json.load(fp).get('lines', [])
lines.sort(key=lambda l: l['no'])

# ---- 手動の補正（ユーザー指定・グループ間の不一致の解消） ----
by_name = {l['name']: l for l in lines}
# 総武線快速を成田空港まで延ばす（ユーザー指定）。駅の値は総武線・成田線のデータから引く
def find_station(name):
    for l in lines:
        for s in l['stations']:
            if s['name'] == name: return s
    raise KeyError(name)
SOBU_RAPID_EXT = [('東千葉', 'JO 29'), ('都賀', 'JO 30'), ('四街道', 'JO 31'), ('物井', 'JO 32'),
                  ('佐倉', 'JO 33'), ('酒々井', 'JO 34'), ('成田', 'JO 35'), ('空港第2ビル', 'JO 36'), ('成田空港', 'JO 37')]
rapid = by_name['総武線快速']['stations']
assert rapid[-1]['name'] == '千葉'
for nm, num in SOBU_RAPID_EXT:
    rapid.append(dict(find_station(nm), number=num))
# 京葉線の支線では西船橋に JE 番号がないため空欄にする（JM 10 は武蔵野線の番号）
for nm in ('京葉線（高谷支線）', '京葉線（二俣支線）'):
    for s in by_name.get(nm, {'stations': []})['stations']:
        if s['name'] == '西船橋': s['number'] = ''
# JR東海のラインカラー: Wikipedia「日本の鉄道ラインカラー一覧」の色1（JR東海のプレスリリース準拠）に揃える
JRC_COLORS = {
    '東海道本線': '#FF7322', '東海道本線（美濃赤坂支線）': '#FF7322', '御殿場線': '#3F743A', '身延線': '#61379D',
    '飯田線': '#65ABDC', '武豊線': '#89522B', '中央本線': '#28709B', '高山本線': '#A61E12',
    '太多線': '#CABA4C', '関西本線': '#36BE90',
}
for nm, col in JRC_COLORS.items():
    if nm in by_name: by_name[nm]['color'] = col
# 同名駅で値が食い違ったものを統一する（全路線に反映）
FIX = {
    '府中本町': {'eng': 'Fuchu-Hommachi'},
    '友部': {'lat': 36.3446, 'lon': 140.3021},
    '糸崎': {'kana': 'いとざき', 'eng': 'Itozaki'},
    '伯耆大山': {'eng': 'Hoki-Daisen', 'lat': 35.4425, 'lon': 133.3900},
    # 作成グループ間で座標が食い違った駅（両候補とも位置がずれていたため明示的に指定する）
    '久宝寺': {'lat': 34.6236, 'lon': 135.5867},
    '新加美': {'lat': 34.6200, 'lon': 135.5680},
    '猪谷': {'lat': 36.4440, 'lon': 137.2420},
    '備中神代': {'lat': 35.0000, 'lon': 133.4390},
    '備後落合': {'lat': 34.9800, 'lon': 133.0800},
    '塩町': {'lat': 34.8150, 'lon': 132.9080},
    '宇部': {'lat': 33.9990, 'lon': 131.2140},
    '幡生': {'lat': 33.9781, 'lon': 130.9268},
}
for l in lines:
    for s in l['stations']:
        if s['name'] in FIX: s.update(FIX[s['name']])

warnings = []
nos = [l['no'] for l in lines]
missing = sorted(set(ALL_NOS) - set(nos))
if missing: warnings.append(f'欠けている路線番号: {missing}')
dups = sorted({n for n in nos if nos.count(n) > 1})
if dups: warnings.append(f'重複した路線番号: {dups}')

# ---- 駅の区別（7.35節） ----
# 駅は「事業者:駅名」で区別する（事業者が違えば駅名が同じでも別の駅）。
# 同じ事業者で同名の別の駅は DISTINCT で区別し、共同使用駅は shared_stations.json で同じ駅にまとめる。
# 同名でも別の駅（同じ事業者内の、離れた場所にある別の駅）の区別: (路線番号, 駅名) → 駅名に付ける区別用の名前
# （事業者が違う同名の駅は自動的に別の駅になるが、既存の指定は残しておく）
DISTINCT = {
    (58, '富田'): '富田@三重',            # 関西本線（両毛線の富田とは別）
    (67, '大久保'): '大久保@兵庫',        # JR神戸線（中央・総武線各駅停車の大久保とは別）
    (77, '柏原'): '柏原@兵庫',            # JR宝塚線（東海道本線の柏原〔滋賀〕とは別）
    (78, '柏原'): '柏原@兵庫',            # 福知山線
    (87, '柏原'): '柏原@大阪',            # 大和路線
    (80, '野崎'): '野崎@大阪',            # 学研都市線（宇都宮線の野崎とは別）
    (81, '滝'): '滝@兵庫',                # 加古川線（烏山線の滝とは別）
    (87, '三郷'): '三郷@奈良',            # 大和路線（武蔵野線の三郷とは別）
    (92, '橋本'): '橋本@和歌山',          # 和歌山線（横浜線・相模線の橋本とは別）
    (116, '上道'): '上道@鳥取',           # 境線（山陽線の上道〔岡山〕とは別）
    (118, '横川'): '横川@広島',           # 山陽線（信越線の横川とは別）
    (119, '横川'): '横川@広島',
    (121, '横川'): '横川@広島',           # 可部線
    (123, '下松'): '下松@山口',           # 山陽線（阪和線の下松とは別）
    (123, '戸田'): '戸田@山口',           # 山陽線（埼京線の戸田とは別）
}
def load_groups(filename):
    path = os.path.join(HERE, 'sources', filename)
    return json.load(open(path, encoding='utf-8'))['groups'] if os.path.exists(path) else []

# 共同使用駅: 各グループの「事業者:駅名」を、グループ先頭の駅の識別キーに読み替える
SHARED_ALIAS = {}
for group in load_groups('shared_stations.json'):
    for k in group[1:]: SHARED_ALIAS[k] = group[0]

def skey(l, s):
    # 駅の識別キー: 「事業者:駅名」（同一事業者内の同名の別駅は区別用の名前）。共同使用駅は代表の駅のキー
    key = f"{company(l['no'])[0]}:{DISTINCT.get((l['no'], s['name']), s['name'])}"
    return SHARED_ALIAS.get(key, key)

# 同じ駅なのに路線（作成グループ）ごとに座標が数km ずれている場合は、
# 前後の駅とのつながりが最も自然になる（隣駅までの距離の合計が最小になる）候補に揃える
def unify_coordinates():
    occ = {}
    for l in lines:
        for i, s in enumerate(l['stations']):
            occ.setdefault(skey(l, s), []).append((l, i))
    for key, lst in occ.items():
        cands = {(s['lat'], s['lon']) for l, i in lst for s in [l['stations'][i]]}
        if len(cands) < 2: continue
        pts = [dict(lat=a, lon=b) for a, b in cands]
        if max(dist_km(a, b) for a in pts for b in pts) < 1.5: continue
        def cost(p):
            c = 0
            for l, i in lst:
                sts = l['stations']
                for j in (i - 1, i + 1):
                    if 0 <= j < len(sts) and skey(l, sts[j]) != key: c += dist_km(p, sts[j])
            return c
        best = min(pts, key=cost)
        for l, i in lst:
            l['stations'][i]['lat'], l['stations'][i]['lon'] = best['lat'], best['lon']
        print(f'  座標を統一: {key} -> {best["lat"]:.4f},{best["lon"]:.4f}（候補 {len(pts)} 件）')

unify_coordinates()

# 駅名をキーに駅IDを振る（初出順）。同名駅の値が食い違う場合は最初の値を採用して警告する
stations = {}   # name -> dict(id, name, kana, eng, lat, lon, src)
order = []
for l in lines:
    for s in l['stations']:
        for k in ('name', 'kana', 'eng'):
            v = s.get(k, '')
            if re.search(r'[,"\n]', v): warnings.append(f'CSVに使えない文字: {l["name"]} {k}={v!r}')
        if skey(l, s) not in stations:
            stations[skey(l, s)] = dict(id=len(order), **{k: s[k] for k in ('name', 'kana', 'eng', 'lat', 'lon')}, src=l['name'])
            order.append(skey(l, s))
        else:
            st = stations[skey(l, s)]
            d = dist_km(st, s)
            if d > 1.5:
                warnings.append(f'同名駅の座標差 {d:.1f}km: {s["name"]} ({st["src"]} / {l["name"]})')
            if st['kana'] != s['kana']:
                warnings.append(f'同名駅のかな不一致: {s["name"]} {st["kana"]} / {s["kana"]} ({l["name"]})')
            if st['eng'] != s['eng']:
                warnings.append(f'同名駅の英語名不一致: {s["name"]} {st["eng"]} / {s["eng"]} ({l["name"]})')

# 路線ごとのチェック: ナンバリング形式・隣駅との距離・駅の重複
for l in lines:
    sts = l['stations']
    sym = l.get('symbol', '')
    for s in sts:
        n = s.get('number', '')
        if n and not re.fullmatch(r'[A-Z]{1,2} \d{2}', n):
            warnings.append(f'ナンバリング形式: {l["name"]} {s["name"]} {n!r}')
        if n and sym and not n.startswith(sym + ' '):
            warnings.append(f'記号不一致: {l["name"]} {s["name"]} {n} (symbol={sym})')
    names = [s['name'] for s in sts]
    ring = len(names) > 2 and names[0] == names[-1]
    body = names[:-1] if ring else names
    for nm in {x for x in body if body.count(x) > 1}:
        warnings.append(f'路線内で駅が重複: {l["name"]} {nm}')
    for a, b in zip(sts, sts[1:]):
        d = dist_km(a, b)
        if d > 12 or d < 0.2:
            warnings.append(f'隣駅距離 {d:.1f}km: {l["name"]} {a["name"]}→{b["name"]}')
    # 折り返し（ジグザグ）の検出: 前後の駅を直接結ぶより大きく遠回りしている駅は座標の誤りの可能性が高い
    for a, b, c in zip(sts, sts[1:], sts[2:]):
        ac = dist_km(a, c)
        if ac > 0.5 and dist_km(a, b) + dist_km(b, c) > 1.8 * ac:
            warnings.append(f'遠回り {dist_km(a, b) + dist_km(b, c):.1f}km/{ac:.1f}km: {l["name"]} {a["name"]}→{b["name"]}→{c["name"]}')

# ---- 乗換エッジ（7.35節） ----
# 乗換グループごとに、グループ内の全駅を距離の合計が最短になる1本の道（パス）でつなぐ。ループは作らない
def shortest_path_order(pts):
    n = len(pts)
    if n <= 2: return list(range(n))
    D = [[dist_km(pts[i], pts[j]) for j in range(n)] for i in range(n)]
    length = lambda o: sum(D[o[i]][o[i + 1]] for i in range(n - 1))
    if n <= 8:
        # 駅数が少なければ全通りを調べる（向きが逆なだけの順番は同じ道なので片方だけ調べる）
        best = min((p for p in itertools.permutations(range(n)) if p[0] < p[-1]), key=length)
        return list(best)
    # 駅数が多い場合: 各駅を始点に近い駅から順につなぎ、2-opt（区間の反転）で改善した中で最短のもの
    best = None
    for start in range(n):
        o, rest = [start], set(range(n)) - {start}
        while rest:
            nxt = min(rest, key=lambda j: D[o[-1]][j]); o.append(nxt); rest.remove(nxt)
        improved = True
        while improved:
            improved = False
            for i in range(n - 1):
                for j in range(i + 2, n + 1):
                    cand = o[:i + 1] + o[i + 1:j][::-1] + o[j:]
                    if length(cand) < length(o) - 1e-9: o, improved = cand, True
        if best is None or length(o) < length(best): best = o
    return best

transfer_edges = []
for group in load_groups('transfer_groups.json'):
    keys = [SHARED_ALIAS.get(k, k) for k in group]
    unknown = [k for k in keys if k not in stations]
    if unknown:
        warnings.append(f'乗換グループに存在しない駅: {unknown}')
        continue
    pts = [stations[k] for k in keys]
    o = shortest_path_order(pts)
    for a, b in zip(o, o[1:]):
        ia, ib = stations[keys[a]]['id'], stations[keys[b]]['id']
        transfer_edges.append((min(ia, ib), max(ia, ib)))

os.makedirs(OUT, exist_ok=True)
# 既存データとの比較用に、上書き前のCSVを読み込んでおく
CSV_NAMES = ('stationDB.csv', 'lineDB.csv', 'lineConnectDB.csv', 'transferDB.csv')
def read_lines(name):
    path = os.path.join(OUT, name)
    return open(path, encoding='utf-8').read().splitlines() if os.path.exists(path) else None
previous = {name: read_lines(name) for name in CSV_NAMES}
def write(name, header, rows):
    # 改行コードはOS標準にする（Windows では git の改行変換と揃えるため CRLF になる）
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as fp:
        fp.write(header + '\n')
        for r in rows: fp.write(','.join(str(x) for x in r) + '\n')

write('stationDB.csv', '駅ID,駅名,駅名かな,駅名英語,緯度,経度',
      [(stations[n]['id'], stations[n]['name'], stations[n]['kana'], stations[n]['eng'], f'{stations[n]["lat"]:.4f}', f'{stations[n]["lon"]:.4f}') for n in order])
write('lineDB.csv', '路線ID,事業者,路線名,路線名かな,路線名英語,路線カラー,路線記号,路線アイコン,ナンバリングアイコン',
      # 路線記号のない路線は、路線アイコンを路線カラーの四角（I_mono_color）にする（7.32節）
      [(l['no'], company(l['no'])[0], l['name'], l['kana'], l['eng'], l['color'], l.get('symbol', ''), company(l['no'])[1] if l.get('symbol', '') else 'I_mono_color', company(l['no'])[2]) for l in lines])
write('lineConnectDB.csv', '路線ID,駅ID,駅ナンバリング',
      [(l['no'], stations[skey(l, s)]['id'], s.get('number', '')) for l in lines for s in l['stations']])
write('transferDB.csv', '駅ID1,駅ID2', transfer_edges)

print(f'路線 {len(lines)} / 駅 {len(order)} / 路線接続 {sum(len(l["stations"]) for l in lines)}')
for l in lines: print(f'  {l["no"]:2d} {l["name"]}: {len(l["stations"])}駅 {l["stations"][0]["name"]}→{l["stations"][-1]["name"]}')
print(f'警告 {len(warnings)} 件')
for w in warnings: print('  ' + w)

# 既存データとの比較: 上書き前のCSVの行が変わっていないか確認する（追加のみであること）
for name in CSV_NAMES:
    old = previous[name]
    if old is None:
        print(f'{name}: 新規作成')
        continue
    new = read_lines(name)
    changed = [i for i, (a, b) in enumerate(zip(old, new)) if a != b]
    print(f'{name}: 既存 {len(old)} 行 / 新 {len(new)} 行 / 既存行の変更 {len(changed)} 件' + (f' 例: {old[changed[0]]} -> {new[changed[0]]}' if changed else ''))
