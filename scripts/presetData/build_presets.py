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
    (range(51, 64), 'JR東海', 'I_JR_central', 'N_JR_central'),
    (range(64, 133), 'JR西日本', 'I_JR_west', 'N_JR_west'),
    # 東京メトロ（133〜143）と都営地下鉄（144〜147）は同一事業者「東京地下鉄」として扱う（7.37節）
    (range(133, 148), '東京地下鉄', 'I_tokyo_subway', 'N_tokyo_subway'),
    # 根岸線（7.38節で京浜東北線から分割し末尾に追加）
    (range(148, 149), 'JR東日本', 'I_JR_east', 'N_JR_east'),
    # JR九州・JR四国（7.45節）。路線アイコンは事業者のプリセットがないため路線カラーの四角
    (range(149, 179), 'JR九州', 'I_mono_color', 'N_JR_kyusyu'),
    (range(179, 190), 'JR四国', 'I_mono_color', 'N_JR_shikoku'),
    # JR東日本の関東以外の路線・JR北海道（7.47節）。JR東日本は路線記号のない路線が I_mono_color になる（lineDB の出力時）
    (range(190, 226), 'JR東日本', 'I_JR_east', 'N_JR_east'),
    (range(226, 245), 'JR北海道', 'I_mono_color', 'N_JR_hokkaido'),
    # 新幹線（7.48節）。路線ごとに運営会社が違う。路線アイコンはすべて路線カラーの四角
    (range(245, 246), 'JR東海', 'I_mono_color', 'N_JR_central'),     # 東海道新幹線
    (range(246, 247), 'JR西日本', 'I_mono_color', 'N_JR_west'),      # 山陽新幹線
    (range(247, 249), 'JR九州', 'I_mono_color', 'N_JR_kyusyu'),      # 九州新幹線・西九州新幹線
    (range(249, 253), 'JR東日本', 'I_mono_color', 'N_JR_east'),      # 東北・上越（ガーラ湯沢支線を含む）・北陸（東京〜上越妙高）
    (range(253, 254), 'JR西日本', 'I_mono_color', 'N_JR_west'),      # 北陸新幹線（上越妙高〜敦賀）
    (range(254, 256), 'JR東日本', 'I_mono_color', 'N_JR_east'),      # 山形新幹線・秋田新幹線
    (range(256, 257), 'JR北海道', 'I_mono_color', 'N_JR_hokkaido'),  # 北海道新幹線
]

# 駅ごとのナンバリングアイコン（7.47節）: 駅の識別キー → プリセット名。stationDB.csv の「ナンバリングアイコン」列に出力し、
# 「路線図から追加」では路線のナンバリングアイコンより優先して使う
STATION_NUM_ICON = {
    'JR北海道:札幌': 'N_sapporo',  # 札幌駅は記号なしの「01」
}
def company(no):
    for rg, op, icon, num in COMPANIES:
        if no in rg: return op, icon, num
    raise KeyError(no)
ALL_NOS = [n for rg, *_ in COMPANIES for n in rg]

# 路線の事業者種別（新幹線・JR在来線・私鉄。7.43節）。
# 元データの路線に "operatorType" があればその値、なければ事業者名が JR で始まれば JR在来線、それ以外は私鉄
OPERATOR_TYPES = ('新幹線', 'JR在来線', '私鉄')
def operator_type(l):
    t = l.get('operatorType') or ('JR在来線' if company(l['no'])[0].startswith('JR') else '私鉄')
    if t not in OPERATOR_TYPES: raise ValueError(f'路線 {l["no"]} の operatorType が不正: {t}')
    return t

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
    (204, '根岸'): '根岸@福島',           # 只見線（根岸線の根岸とは別。7.47節）
    (205, '大沢'): '大沢@山形',           # 山形線（上越線の大沢〔新潟〕とは別）
    (206, '大久保'): '大久保@秋田',       # 奥羽本線（中央・総武線各駅停車の大久保とは別）
}
def load_groups(filename):
    path = os.path.join(HERE, 'sources', filename)
    return json.load(open(path, encoding='utf-8'))['groups'] if os.path.exists(path) else []

# 共同使用駅: 各グループの「事業者:駅名」を、グループ先頭の駅の識別キーに読み替える
SHARED_ALIAS = {}
for group in load_groups('shared_stations.json'):
    for k in group[1:]: SHARED_ALIAS[k] = group[0]

def base_key(l, s):
    # 共同使用駅の読み替え前の識別キー: 「事業者:駅名」（同一事業者内の同名の別駅は区別用の名前）
    return f"{company(l['no'])[0]}:{DISTINCT.get((l['no'], s['name']), s['name'])}"

# 近接する同名駅（事業者が違い、駅名が同じで、互いに 1km 以内）も共同使用駅として自動的にまとめる（7.35節・7.37節）。
# 先に登録された駅（路線ID の小さい路線の駅）を代表にするため、既存の駅ID は変わらない
SAME_NAME_MERGE_KM = 1.0
def _normalize(name):
    return name.replace('ヶ', 'ケ')
_first = {}   # 読み替え前のキー → (駅名, 座標, 事業者)（路線ID 順で最初に現れた値）
for l in lines:
    for s in l['stations']:
        k = base_key(l, s)
        if k not in _first: _first[k] = (s['name'], s, company(l['no'])[0])
_by_name = {}
for k, (name, pos, op) in _first.items():
    _by_name.setdefault(_normalize(name), []).append(k)
far_same_name = []   # まとめなかった同名駅（1km 超・3km 以内）の報告用
for name, keys in _by_name.items():
    for i, k in enumerate(keys):
        if k in SHARED_ALIAS: continue
        for rep in keys[:i]:
            rep_root = SHARED_ALIAS.get(rep, rep)
            if _first[rep][2] == _first[k][2]: continue   # 同じ事業者の同名駅は DISTINCT で扱う
            d = dist_km(_first[rep][1], _first[k][1])
            if d <= SAME_NAME_MERGE_KM:
                SHARED_ALIAS[k] = rep_root
                break
            if d <= 3: far_same_name.append((rep, k, round(d, 2)))

def skey(l, s):
    # 駅の識別キー: 「事業者:駅名」。共同使用駅（設定ファイル・近接する同名駅）は代表の駅のキー
    key = base_key(l, s)
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

# ---- 駅ID の固定（7.38節） ----
# 駅の識別キー → 駅ID の対応表（station_ids.json）にある駅はその駅ID を使い、
# 新しい駅には既存の最大の駅ID の次から順に振って対応表に追加する（路線の分割・並べ替えで駅ID が変わらないようにする）
STATION_IDS_PATH = os.path.join(HERE, 'station_ids.json')
station_ids = json.load(open(STATION_IDS_PATH, encoding='utf-8'))['ids'] if os.path.exists(STATION_IDS_PATH) else {}
next_id = max(station_ids.values(), default=-1) + 1
new_station_keys = []
for key in order:
    if key not in station_ids:
        station_ids[key] = next_id
        next_id += 1
        new_station_keys.append(key)
    stations[key]['id'] = station_ids[key]
# 出力は駅ID の順（どの路線からも使われなくなった駅は出力しないが、対応表には残して駅ID を再利用しない）
order.sort(key=lambda k: stations[k]['id'])
with open(STATION_IDS_PATH, 'w', encoding='utf-8') as fp:
    json.dump({'_comment': '駅の識別キー（共同使用駅の読み替え後の「事業者:駅名」）→ 駅ID。生成スクリプトが自動で追記する。手で編集しない',
               'ids': dict(sorted(station_ids.items(), key=lambda kv: kv[1]))}, fp, ensure_ascii=False, indent=1)

# ---- Wikidata による座標の差し替え（7.36節） ----
# wikidata/stations.json（fetch_wikidata.py で取得。CC0）から、駅名・事業者・今の座標との距離で1件を選んで座標を差し替える
WIKIDATA_PATH = os.path.join(HERE, 'wikidata', 'stations.json')
# このデータの事業者名 → Wikidata の事業者の日本語名
# （1つの事業者が Wikidata 上の複数の事業者にあたる場合は配列で書く）
OPERATOR_WD_NAME = {'JR東日本': '東日本旅客鉄道', 'JR東海': '東海旅客鉄道', 'JR西日本': '西日本旅客鉄道',
                    'JR九州': '九州旅客鉄道', 'JR四国': '四国旅客鉄道', 'JR北海道': '北海道旅客鉄道',
                    '東京地下鉄': ['東京地下鉄', '東京都交通局']}
# 選んだ候補が今の座標からこれ以上離れていれば、同名の別駅との取り違えとみなして差し替えない（km）。
# 事業者が一致した候補は取り違えの可能性が低いため、許容範囲を広げる
WIKIDATA_MAX_SHIFT_KM = 10
# 座標が誤っていると確認した Wikidata の項目（QID）。使わずに元データの座標を残す
WIKIDATA_EXCLUDE = {
    'Q5359644',  # 大野城駅（JR九州）: 隣の春日駅とほぼ同じ座標になっている（7.45節）
}
WIKIDATA_MAX_SHIFT_SAME_OPERATOR_KM = 30
def match_name(name):
    # 照合用の駅名: 表記の揺れ（ヶ/ケ、驒/騨）をそろえる
    return name.replace('ヶ', 'ケ').replace('驒', '騨')
def local_detour(pa, pb, pc):
    # 前後の駅を直接結ぶ距離に対する、途中の駅を経由する距離の比（大きいほど遠回り）
    ac = dist_km(pa, pc)
    return (dist_km(pa, pb) + dist_km(pb, pc)) / ac if ac > 0.5 else 1.0
wikidata_report = None
matched_qid = {}   # 駅の識別キー → 対応づけた Wikidata の項目（中国語・韓国語の表記に使う。7.54節）
# 同じ駅名で近く（LABEL_NEAR_KM 以内）にある Wikidata の項目からも表記を探す。
# 事業者ごとに分かれた項目に表記が無い場合や、座標が別の駅と重なっていて座標の差し替えには使わない項目も、表記には使う
LABEL_NEAR_KM = 2.0
if os.path.exists(WIKIDATA_PATH):
    wd_all = [w for w in json.load(open(WIKIDATA_PATH, encoding='utf-8'))['stations'] if not w['closed']]
    # 別の名前の駅とまったく同じ座標になっている項目は、座標の誤り（コピーなど）の可能性が高いため使わない
    names_at = {}
    for w in wd_all: names_at.setdefault((w['lat'], w['lon']), set()).add(match_name(w['name']))
    wd_by_name, suspicious = {}, []
    for w in wd_all:
        # 座標が誤っていると確認した項目も使わない（WIKIDATA_EXCLUDE）
        if w['qid'] in WIKIDATA_EXCLUDE:
            suspicious.append(w['label'])
            continue
        if len(names_at[(w['lat'], w['lon'])]) > 1:
            suspicious.append(w['label'])
            continue
        wd_by_name.setdefault(match_name(w['name']), []).append(w)
    # 駅の識別キー → その駅を通る路線の事業者（Wikidata の名前）
    key_operators = {}
    for l in lines:
        for s in l['stations']:
            op = company(l['no'])[0]
            wd_names = OPERATOR_WD_NAME.get(op, op)
            key_operators.setdefault(skey(l, s), set()).update(wd_names if isinstance(wd_names, list) else [wd_names])
    original = {key: (st['lat'], st['lon']) for key, st in stations.items()}
    shifted, not_found, too_far = {}, [], []
    for key, st in stations.items():
        cands = wd_by_name.get(match_name(st['name']), [])
        if not cands:
            not_found.append(key)
            continue
        # 事業者が一致する候補があればそれに絞り、今の座標に最も近いものを選ぶ
        same_op = [w for w in cands if set(w['operators']) & key_operators[key]]
        best = min(same_op or cands, key=lambda w: dist_km(st, w))
        d = dist_km(st, best)
        if d >= (WIKIDATA_MAX_SHIFT_SAME_OPERATOR_KM if same_op else WIKIDATA_MAX_SHIFT_KM):
            too_far.append((key, round(d, 1)))
            continue
        # 中国語・韓国語の表記（7.54節）にも、この駅に対応づけた項目を使う
        matched_qid[key] = best['qid']
        st['lat'], st['lon'] = best['lat'], best['lon']
        shifted[key] = d
    # 差し替えた結果、前後の駅との間で大きな遠回りになる駅は、差し替えを取り消して元の座標に戻す
    neighbors = {}
    for l in lines:
        ks = [skey(l, s) for s in l['stations']]
        for i in range(1, len(ks) - 1):
            neighbors.setdefault(ks[i], []).append((ks[i - 1], ks[i + 1]))
    reverted = []
    for key in list(shifted):
        st = stations[key]
        orig = dict(lat=original[key][0], lon=original[key][1])
        for ka, kc in neighbors.get(key, []):
            pa, pc = stations[ka], stations[kc]
            if local_detour(pa, st, pc) > 1.8 and local_detour(pa, orig, pc) <= 1.8:
                st['lat'], st['lon'] = orig['lat'], orig['lon']
                reverted.append(key)
                del shifted[key]
                break
    ds = sorted(shifted.values())
    wikidata_report = (
        f'Wikidata の座標で差し替え: {len(ds)} / {len(stations)} 駅'
        + (f'（移動量 中央値 {ds[len(ds) // 2]:.2f}km・最大 {ds[-1]:.1f}km）' if ds else '')
        + f'\n  見つからない駅 {len(not_found)} 件: {not_found}'
        + f'\n  離れすぎていて差し替えなかった駅 {len(too_far)} 件: {too_far}'
        + f'\n  差し替えると遠回りになるため元に戻した駅 {len(reverted)} 件: {reverted}'
        + f'\n  座標が別の駅と重複していて使わなかった Wikidata の項目 {len(suspicious)} 件'
    )

# 路線ごとのチェック: ナンバリング形式・隣駅との距離・駅の重複。
# 距離は最終的な座標（Wikidata で差し替えた後の値）で調べる
for l in lines:
    sts = l['stations']
    sym = l.get('symbol', '')
    for s in sts:
        n = s.get('number', '')
        # 駅ごとのナンバリングアイコンを指定した駅（札幌の「01」など）は形式・記号を調べない（7.47節）
        if skey(l, s) in STATION_NUM_ICON: continue
        # 枝番（例: U 02-1、G 11-1）と記号のない番号（例: 大糸線の 42）は正しい形式として扱う
        if n and not re.fullmatch(r'([A-Z][A-Za-z]? )?\d{2}(-\d+)?', n):
            warnings.append(f'ナンバリング形式: {l["name"]} {s["name"]} {n!r}')
        # JR北海道は駅ごとに番号が1つだけで、分岐駅では優先されるルートの記号になるため、路線の記号との一致は調べない
        if n and sym and company(l['no'])[0] != 'JR北海道' and not n.startswith(sym + ' '):
            warnings.append(f'記号不一致: {l["name"]} {s["name"]} {n} (symbol={sym})')
    names = [s['name'] for s in sts]
    # 環状線（先頭と末尾が同じ駅）と6の字の路線（末尾の駅が途中にも現れる）は、末尾の駅の重複を除いて調べる
    ring = len(names) > 2 and names[-1] in names[:-1]
    body = names[:-1] if ring else names
    for nm in {x for x in body if body.count(x) > 1}:
        warnings.append(f'路線内で駅が重複: {l["name"]} {nm}')
    pos = [stations[skey(l, s)] for s in sts]  # 最終的な座標
    for (a, b), (pa, pb) in zip(zip(sts, sts[1:]), zip(pos, pos[1:])):
        d = dist_km(pa, pb)
        # 新幹線は駅間が長いのが普通のため、離れすぎのチェックはしない（近すぎるチェックのみ。7.48節）
        if (d > 12 and operator_type(l) != '新幹線') or d < 0.2:
            warnings.append(f'隣駅距離 {d:.1f}km: {l["name"]} {a["name"]}→{b["name"]}')
    # 折り返し（ジグザグ）の検出: 前後の駅を直接結ぶより大きく遠回りしている駅は座標の誤りの可能性が高い
    for (a, b, c), (pa, pb, pc) in zip(zip(sts, sts[1:], sts[2:]), zip(pos, pos[1:], pos[2:])):
        ac = dist_km(pa, pc)
        if ac > 0.5 and dist_km(pa, pb) + dist_km(pb, pc) > 1.8 * ac:
            warnings.append(f'遠回り {dist_km(pa, pb) + dist_km(pb, pc):.1f}km/{ac:.1f}km: {l["name"]} {a["name"]}→{b["name"]}→{c["name"]}')

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
    # 共同使用駅の読み替え後に重複を除く（同じ駅にまとまった駅どうしはエッジを作らない）
    keys = list(dict.fromkeys(SHARED_ALIAS.get(k, k) for k in group))
    if len(keys) < 2: continue
    unknown = [k for k in keys if k not in stations]
    if unknown:
        warnings.append(f'乗換グループに存在しない駅: {unknown}')
        continue
    pts = [stations[k] for k in keys]
    o = shortest_path_order(pts)
    for a, b in zip(o, o[1:]):
        ia, ib = stations[keys[a]]['id'], stations[keys[b]]['id']
        transfer_edges.append((min(ia, ib), max(ia, ib)))

# ---- 中国語・韓国語・副駅名（7.54節） ----
# 中国語・韓国語: wikidata/labels.json（fetch_wikidata_labels.py で取得。CC0）の、駅に対応づけた項目の表記。
#   中国語は簡体字の表記だけを使い、無ければ空。韓国語は無ければかなから変換して作る
# 副駅名: sources/sub_names.json（「事業者:駅名」→ 副駅名）。共同使用駅は代表の駅のキーに読み替える
from kana_to_hangul import kana_to_hangul
LABELS_PATH = os.path.join(HERE, 'wikidata', 'labels.json')
wd_labels = json.load(open(LABELS_PATH, encoding='utf-8'))['labels'] if os.path.exists(LABELS_PATH) else {}
# 簡体字の表記の優先順。無ければ中国語版 Wikipedia の記事名を簡体字に変換したもの（zhwiki-cn）を使う
ZH_LANGS = ('zh-hans', 'zh-cn', 'zh-sg', 'zh-my', 'zhwiki-cn')
def clean_label(label, suffixes):
    # 括弧の注記（「大久保站 (东京都)」など）と末尾の「车站」「站」「역」を除く（長いものから順に試す）
    name = re.sub(r'\s*[（(][^）)]*[）)]\s*$', '', label).strip()
    for suffix in suffixes:
        if name.endswith(suffix) and len(name) > len(suffix): return name[:-len(suffix)].strip()
    return name
_wd_label_items = {}   # 照合用の駅名 → 廃止されていない Wikidata の項目
if os.path.exists(WIKIDATA_PATH):
    for w in json.load(open(WIKIDATA_PATH, encoding='utf-8'))['stations']:
        if not w['closed'] and w['qid'] not in WIKIDATA_EXCLUDE:
            _wd_label_items.setdefault(match_name(w['name']), []).append(w)
# stations.json に無く、fetch_wikidata_labels.py が日本語名で追加で見つけた項目（新宿・銀座など）も表記に使う
for w in (json.load(open(LABELS_PATH, encoding='utf-8')).get('extra_items', []) if os.path.exists(LABELS_PATH) else []):
    if w['qid'] not in WIKIDATA_EXCLUDE: _wd_label_items.setdefault(match_name(w['name']), []).append(w)
def find_label(key, langs):
    # 対応づけた項目 → 近くの同名の項目（近い順）の順に、langs の表記を探す
    st = stations[key]
    near = sorted((w for w in _wd_label_items.get(match_name(st['name']), []) if dist_km(st, w) < LABEL_NEAR_KM),
                  key=lambda w: dist_km(st, w))
    for qid in [matched_qid.get(key, '')] + [w['qid'] for w in near]:
        labels = wd_labels.get(qid, {})
        for l in langs:
            if l in labels: return labels[l]
    return None
SUB_NAMES_PATH = os.path.join(HERE, 'sources', 'sub_names.json')
sub_names = {}
if os.path.exists(SUB_NAMES_PATH):
    for k, v in json.load(open(SUB_NAMES_PATH, encoding='utf-8')).items():
        if not k.startswith('_'): sub_names[SHARED_ALIAS.get(k, k)] = v
ko_from_wikidata = 0
for key, st in stations.items():
    zh = find_label(key, ZH_LANGS)
    st['zh'] = clean_label(zh, ('车站', '站')) if zh else ''
    ko = find_label(key, ('ko',))
    if ko:
        st['ko'] = clean_label(ko, ('역',))
        ko_from_wikidata += 1
    else:
        st['ko'] = kana_to_hangul(st['kana'])
    st['subName'] = sub_names.get(key, '')
    for k in ('zh', 'ko', 'subName'):
        if re.search(r'[,"\n]', st[k]):
            warnings.append(f'CSVに使えない文字のため空にした: {key} {k}={st[k]!r}')
            st[k] = ''
unknown_sub = [k for k in sub_names if k not in stations]
if unknown_sub: warnings.append(f'副駅名の駅が見つからない: {unknown_sub}')
labels_report = (f'中国語: {sum(1 for k in order if stations[k]["zh"])} / {len(order)} 駅（無し {sum(1 for k in order if not stations[k]["zh"])} 駅）'
                 f'、韓国語: Wikidata {ko_from_wikidata} 駅・かなから変換 {len(stations) - ko_from_wikidata} 駅'
                 f'、副駅名: {sum(1 for k in order if stations[k]["subName"])} 駅')

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

write('stationDB.csv', '駅ID,駅名,駅名かな,駅名英語,緯度,経度,ナンバリングアイコン,中国語,韓国語,副駅名',
      [(stations[n]['id'], stations[n]['name'], stations[n]['kana'], stations[n]['eng'], f'{stations[n]["lat"]:.4f}', f'{stations[n]["lon"]:.4f}', STATION_NUM_ICON.get(n, ''),
        stations[n]['zh'], stations[n]['ko'], stations[n]['subName']) for n in order])
write('lineDB.csv', '路線ID,事業者,路線名,路線名かな,路線名英語,路線カラー,路線記号,路線アイコン,ナンバリングアイコン,事業者種別',
      # 路線記号のない路線は、路線アイコンを路線カラーの四角（I_mono_color）にする（7.32節）
      [(l['no'], company(l['no'])[0], l['name'], l['kana'], l['eng'], l['color'], l.get('symbol', ''), company(l['no'])[1] if l.get('symbol', '') else 'I_mono_color', company(l['no'])[2], operator_type(l)) for l in lines])
write('lineConnectDB.csv', '路線ID,駅ID,駅ナンバリング',
      [(l['no'], stations[skey(l, s)]['id'], s.get('number', '')) for l in lines for s in l['stations']])
write('transferDB.csv', '駅ID1,駅ID2', transfer_edges)

print(f'路線 {len(lines)} / 駅 {len(order)} / 路線接続 {sum(len(l["stations"]) for l in lines)}')
for l in lines: print(f'  {l["no"]:2d} {l["name"]}: {len(l["stations"])}駅 {l["stations"][0]["name"]}→{l["stations"][-1]["name"]}')
if wikidata_report: print(wikidata_report)
print(labels_report)
print(f'近接する同名駅として自動でまとめた駅: {sum(1 for k in SHARED_ALIAS if k not in {x for g in load_groups("shared_stations.json") for x in g})} 件')
if far_same_name: print(f'1km より離れていてまとめなかった同名駅（3km 以内）: {far_same_name}')
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
    if name == 'stationDB.csv':
        # 駅は座標（緯度・経度）の変更と、それ以外（駅ID・駅名など）の変更を分けて報告する
        other = [i for i in changed if old[i].split(',')[:4] != new[i].split(',')[:4]]
        print(f'{name}: 既存 {len(old)} 行 / 新 {len(new)} 行 / 座標の変更 {len(changed) - len(other)} 件 / 座標以外の変更 {len(other)} 件'
              + (f' 例: {old[other[0]]} -> {new[other[0]]}' if other else ''))
        continue
    print(f'{name}: 既存 {len(old)} 行 / 新 {len(new)} 行 / 既存行の変更 {len(changed)} 件' + (f' 例: {old[changed[0]]} -> {new[changed[0]]}' if changed else ''))
