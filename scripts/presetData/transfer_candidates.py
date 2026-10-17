# 共同使用駅・乗換グループの候補を一覧にするスクリプト（7.35節・7.37節）。
# 生成済みの CSV（public/csv/presetLines/）を読み、事業者の違う駅どうしで
# 「駅名が同じ」または「互いに近い（既定 400m 以内）」組を見つけ、つながる駅をまとめて候補として表示する。
# 結果は確認用で、shared_stations.json・transfer_groups.json への登録は人が判断して行う。
# 使い方: python scripts/presetData/transfer_candidates.py [距離(m)] [事業者名 ...]
#   事業者名を指定した場合は、その事業者の駅を含む候補だけを表示する
import csv, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(HERE, '..', '..', 'public', 'csv', 'presetLines')

def dist_m(a, b):
    lat = math.radians((a[0] + b[0]) / 2)
    return math.hypot((a[1] - b[1]) * 111320 * math.cos(lat), (a[0] - b[0]) * 110570)

def main():
    max_m = float(sys.argv[1]) if len(sys.argv) > 1 else 400
    focus = set(sys.argv[2:])
    read = lambda name: list(csv.DictReader(open(os.path.join(CSV_DIR, name), encoding='utf-8')))
    stations = {r['駅ID']: r for r in read('stationDB.csv')}
    line_op = {r['路線ID']: r['事業者'] for r in read('lineDB.csv')}
    line_name = {r['路線ID']: r['路線名'] for r in read('lineDB.csv')}
    # 駅ID → その駅を通る路線の事業者・路線名
    ops, lines_at = {}, {}
    for r in read('lineConnectDB.csv'):
        ops.setdefault(r['駅ID'], set()).add(line_op[r['路線ID']])
        lines_at.setdefault(r['駅ID'], []).append(line_name[r['路線ID']])
    existing = {(min(r['駅ID1'], r['駅ID2']), max(r['駅ID1'], r['駅ID2'])) for r in read('transferDB.csv')}
    pos = {i: (float(s['緯度']), float(s['経度'])) for i, s in stations.items()}
    ids = list(stations)
    # 事業者の重なりがない（別の事業者の）駅どうしの組で、同名または近いもの
    parent = {i: i for i in ids}
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    pairs = []
    for a_i, a in enumerate(ids):
        for b in ids[a_i + 1:]:
            if ops[a] & ops[b]: continue
            d = dist_m(pos[a], pos[b])
            same_name = stations[a]['駅名'] == stations[b]['駅名']
            if d <= max_m or (same_name and d <= 3000):
                pairs.append((a, b, d, same_name))
                parent[find(a)] = find(b)
    groups = {}
    for a, b, d, same in pairs:
        groups.setdefault(find(a), set()).update([a, b])
    out = []
    for members in groups.values():
        if focus and not any(ops[m] & focus for m in members): continue
        out.append(sorted(members, key=lambda m: (sorted(ops[m]), stations[m]['駅名'])))
    out.sort(key=lambda g: (pos[g[0]][0], pos[g[0]][1]))
    sys.stdout.reconfigure(encoding='utf-8')
    for g in out:
        print(' / '.join(f"{'・'.join(sorted(ops[m]))}:{stations[m]['駅名']}[{m}]" for m in g))
        for a, b, d, same in pairs:
            if a in g and b in g:
                mark = '（同名）' if same else ''
                print(f"    {stations[a]['駅名']} - {stations[b]['駅名']} {d:.0f}m{mark}")
    print(f'候補 {len(out)} 組（距離 {max_m:.0f}m 以内、または同名で 3km 以内）')

if __name__ == '__main__':
    main()
