type presetIndexType = {
    key: string,
    name: string,
    // 種類を選ぶポップアップの大項目（タブ。7.78節）
    category: string
}

// 種類を選ぶポップアップの大項目（タブの並び順。7.78節）
const iconCategories: string[] = ["JR", "私鉄", "地下鉄", "汎用"]
const numberCategories: string[] = ["JR", "私鉄", "地下鉄", "汎用"]

// 選択の一覧に出る順（7.41節）。事業者ごとのプリセットを事業者順に並べ、そのあとに汎用のものを並べる
const iconIndexes: presetIndexType[] = [
    {key: "I_JR_east", name: "JR東日本", category: "JR" },
    {key: "I_JR_west", name: "JR西日本", category: "JR" },
    {key: "I_JR_central", name: "JR東海", category: "JR" },
    {key: "I_tokyo_subway", name: "東京地下鉄", category: "地下鉄" },
    {key: "I_tokyu", name: "東急", category: "私鉄" },
    // 以下は事業者によらない汎用のプリセット
    {key: "I_mono_color", name: "単色", category: "汎用" },
    {key: "I_train_normal1", name: "地上路線汎用１", category: "汎用" },
    {key: "I_train_normal2", name: "地上路線汎用２", category: "汎用" },
    {key: "I_train_subway1", name: "地下路線汎用", category: "汎用" },
    // 新幹線（7.79節。絵柄と色は固定）
    {key: "I_shinkansen-front1", name: "新幹線1", category: "汎用" },
    {key: "I_shinkansen-front2", name: "新幹線2", category: "汎用" },
    {key: "I_shinkansen-side", name: "新幹線3", category: "汎用" },
]

// 選択の一覧に出る順（7.41節）。JR各社 → 札幌駅 → 東京地下鉄 → 東急 → 汎用（丸形汎用。7.62節）
const numberIndexes: presetIndexType[] = [
    {key: "N_JR_east", name: "JR東日本", category: "JR" },
    {key: "N_JR_west", name: "JR西日本", category: "JR" },
    {key: "N_JR_central", name: "JR東海", category: "JR" },
    {key: "N_JR_hokkaido", name: "JR北海道", category: "JR" },
    {key: "N_JR_shikoku", name: "JR四国", category: "JR" },
    {key: "N_JR_kyusyu", name: "JR九州", category: "JR" },
    // 札幌駅は記号欄がなく番号のみ（JR北海道の札幌駅用のため大項目は JR）
    {key: "N_sapporo", name: "札幌駅", category: "JR" },
    {key: "N_tokyo_subway", name: "東京地下鉄", category: "地下鉄" },
    {key: "N_tokyu", name: "東急", category: "私鉄" },
    // 以下は事業者によらない汎用のプリセット（7.62節。私鉄の駅プリセットで使う）
    {key: "N_round_normal", name: "丸形汎用", category: "汎用" },
]

export type { presetIndexType }
export { iconIndexes, numberIndexes, iconCategories, numberCategories }
