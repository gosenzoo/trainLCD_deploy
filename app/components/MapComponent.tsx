import React, { useState, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '250px',
};

const center = {
  lat: 35.6895, // 東京の緯度
  lng: 139.6917, // 東京の経度
};

const options = {
  disableDefaultUI: true,
  zoomControl: true,
};

interface MarkerPosition {
  lat: number;
  lng: number;
}

type mapComponentProps = {
    setting: settingType,
    setSetting: React.Dispatch<React.SetStateAction<settingType>>,
    selectedIndexes: number[]
}

const MapComponent: React.FC<mapComponentProps> = ({setting, setSetting, selectedIndexes}) => {
  // Google Maps APIのロード状態を管理
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyC6qXVztGuf28olzeqC0ntgjiDIYPH8NVU', // ここにGoogle Maps APIキーを設定
  });

  // マーカーの位置を保持するステート
  const [marker, setMarker] = useState<MarkerPosition | null>(null);

  // 地図がクリックされた時にマーカーをセットする
  const onMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
        setMarker({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
        });

        if(selectedIndexes.length <= 0){
            return
        }

        const _setting: settingType = structuredClone(setting)
        console.log(selectedIndexes)
        _setting.stationList[selectedIndexes[selectedIndexes.length-1] - 1].coordinate = [event.latLng.lat(), event.latLng.lng()]
        setSetting(_setting)
    }
  };

  if (loadError) return <div>エラー: マップを読み込めませんでした</div>;
  if (!isLoaded) return <div>読み込み中...</div>;

  return (
    <div>
        {selectedIndexes}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={10}
        center={center}
        options={options}
        onClick={onMapClick}
      >
        {marker && <Marker position={{ lat: marker.lat, lng: marker.lng }} />}
      </GoogleMap>
    </div>
  );
};

export default MapComponent;
