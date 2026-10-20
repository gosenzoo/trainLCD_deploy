type presetIndexType = {
    key: string,
    name: string
}

// 選択の一覧に出る順（7.41節）。事業者ごとのプリセットを事業者順に並べ、そのあとに汎用のものを並べる
const iconIndexes: presetIndexType[] = [
    {key: "I_JR_east", name: "JR東日本" },
    {key: "I_JR_west", name: "JR西日本" },
    {key: "I_JR_central", name: "JR東海" },
    {key: "I_tokyo_subway", name: "東京地下鉄" },
    {key: "I_tokyu", name: "東急" },
    // 以下は事業者によらない汎用のプリセット
    {key: "I_mono_color", name: "単色" },
    {key: "I_train_normal1", name: "地上路線汎用１" },
    {key: "I_train_normal2", name: "地上路線汎用２" },
    {key: "I_train_subway1", name: "地下路線汎用" },
]

// 選択の一覧に出る順（7.41節）。JR各社 → 札幌駅 → 東京地下鉄 → 東急 → 汎用（丸形汎用。7.62節）
const numberIndexes: presetIndexType[] = [
    {key: "N_JR_east", name: "JR東日本" },
    {key: "N_JR_west", name: "JR西日本" },
    {key: "N_JR_central", name: "JR東海" },
    {key: "N_JR_hokkaido", name: "JR北海道" },
    {key: "N_JR_shikoku", name: "JR四国" },
    {key: "N_JR_kyusyu", name: "JR九州" },
    // 札幌駅は記号欄がなく番号のみ
    {key: "N_sapporo", name: "札幌駅" },
    {key: "N_tokyo_subway", name: "東京地下鉄" },
    {key: "N_tokyu", name: "東急" },
    // 以下は事業者によらない汎用のプリセット（7.62節。私鉄の駅プリセットで使う）
    {key: "N_round_normal", name: "丸形汎用" },
]

export { iconIndexes, numberIndexes }