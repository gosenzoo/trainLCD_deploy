import React, { useEffect, useState } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import "../type"

// 駅設定の「座標設定」タブ（7.51節）。Google マップのクリックで、最後に選んだ駅の座標を設定する

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

// 最初に表示する位置（東京駅付近）。モジュール定数にして参照を固定し、再描画のたびに地図が戻らないようにする
const initialCenter = {
  lat: 35.681236,
  lng: 139.767125,
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

// 駅を切り替えたときのズーム（駅が分かる程度）
const STATION_ZOOM = 15;

// Google Maps の APIキー（next.config.mjs の env でブラウザ側に渡す）
const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

type mapComponentProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[]
}

// 座標が正しいとき（緯度・経度とも数値で範囲内）だけ位置を返す。片方でも不正なら null（ピンを出さない）
const toValidPosition = (coordinate: [number | null, number | null] | undefined): google.maps.LatLngLiteral | null => {
    const [lat, lng] = coordinate ?? [null, null];
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
}

// APIキーが無いときは地図を読み込まない（useLoadScript を呼ばないよう、読み込み側を別コンポーネントにする）
const MapComponent: React.FC<mapComponentProps> = (props) => {
  if (!apiKey) return <div>Google Maps の APIキーが設定されていません</div>;
  return <StationCoordinateMap {...props} />;
};

const StationCoordinateMap: React.FC<mapComponentProps> = ({setting, setSetting, selectedIndexes}) => {
  // Google Maps APIのロード状態を管理
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 対象の駅: 駅一覧で最後に選んだ駅（selectedIndexes は 1-based）
  const targetIndex = selectedIndexes.length > 0 ? selectedIndexes[selectedIndexes.length - 1] - 1 : -1;
  const targetStation = targetIndex >= 0 ? setting.stationList[targetIndex] : undefined;
  const position = toValidPosition(targetStation?.coordinate);

  // 対象の駅を切り替えたとき、座標が正しければその位置へ地図を移す（座標がなければ地図は動かさない）。
  // クリックで座標を設定したときは動かさないよう、駅の切り替え（targetIndex）だけを見る
  useEffect(() => {
    if (!map || !position) return;
    map.panTo(position);
    map.setZoom(STATION_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, targetIndex]);

  // 地図がクリックされた時に、対象の駅の座標をその位置にする（ピンも移る）
  const onMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !targetStation) return;
    const _setting: settingType = structuredClone(setting)
    _setting.stationList[targetIndex].coordinate = [event.latLng.lat(), event.latLng.lng()]
    setSetting(_setting)
  };

  if (loadError) return <div>地図を読み込めませんでした</div>;
  if (!isLoaded) return <div>地図を読み込み中</div>;

  return (
    <div>
      {/* 駅を選んでいないときはグレーアウトしてクリックを受け付けない */}
      <div className={targetStation ? '' : 'form-disabled'}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={initialCenter}
          options={options}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          onClick={onMapClick}
        >
          {/* ピンは駅に設定された座標の位置に常に1本。座標が不正なら出さない */}
          {position && <Marker position={position} />}
        </GoogleMap>
      </div>
      {/* 地図の下: 対象の駅名と現在の緯度・経度 */}
      <div style={{ marginTop: '6px' }}>
        {targetStation
          ? <>{targetStation.name || '（駅名なし）'}　緯度: {targetStation.coordinate?.[0] ?? '未設定'} / 経度: {targetStation.coordinate?.[1] ?? '未設定'}</>
          : '駅一覧から駅を選んでください'}
      </div>
    </div>
  );
};

export default MapComponent;
