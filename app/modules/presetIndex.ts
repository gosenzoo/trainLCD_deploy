type presetIndexType = {
    key: string,
    name: string
}

const iconIndexes: presetIndexType[] = [
    {key: "I_JR_east", name: "JR東日本" },
    {key: "I_tokyo_subway", name: "東京地下鉄" },
    {key: "I_train_normal1", name: "地上路線汎用１" },
    {key: "I_train_normal2", name: "地上路線汎用２" },
    {key: "I_train_subway1", name: "地下路線汎用" },
]

const numberIndexes: presetIndexType[] = [
    {key: "N_tokyu", name: "東急" },
    {key: "N_JR_east", name: "JR東日本" },
    {key: "N_tokyo_subway", name: "東京地下鉄" },
    {key: "N_JR_west", name: "JR西日本" },
    {key: "N_JR_central", name: "JR東海" },
]

export { iconIndexes, numberIndexes }