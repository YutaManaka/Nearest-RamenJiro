const getCurrentPosition = () => {
  if ('geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
};

const fetchDistanceMatrix = async () => {
  // 現在位置情報の取得
  const currentPosition = await getCurrentPosition();

  // ラーメンデータの取得
  const ramenData = await fetch('ramen_data.json').then(response =>
    response.json()
  );

  // 緯度経度の取得
  const {
    coords: { latitude: lat, longitude: lng }
  } = currentPosition;

  // インスタンスの作成
  const service = new google.maps.DistanceMatrixService();

  // ラーメン各店舗の緯度経度の取得
  const destinations = ramenData.map(({ latLng }) => latLng);

  const MAX_LIMITED_DIMENSIONS = 25;
  const arrayChunk = (array, size = 1) => {
    return array.reduce(
      (acc, value, i) => (i % size ? acc : [...acc, array.slice(i, i + size)]),
      []
    );
  };
  const chunkedDestinations = arrayChunk(destinations, MAX_LIMITED_DIMENSIONS);

  const promises = chunkedDestinations.map(destinations => {
    return new Promise((resolve, reject) => {
      const options = {
        origins: [{ lat, lng }], // 出発地
        destinations, // 目的地
        travelMode: 'DRIVING' // 交通手段
      };

      service.getDistanceMatrix(options, (response, status) => {
        if (status === 'OK') {
          const { rows } = response;
          const { elements } = rows[0];
          resolve(elements);
        } else {
          reject(status);
        }
      });
    });
  });

  return Promise.all(promises).then(values => values.flat());
};

const initMap = async () => {
  const currentPosition = await getCurrentPosition();
  const ramenData = await fetch('ramen_data.json').then(response =>
    response.json()
  );
  const distanceMatrix = await fetchDistanceMatrix();
  const {
    coords: { latitude: lat, longitude: lng }
  } = currentPosition;
  const embedElement = document.getElementById('map');
  const options = {
    center: { lat, lng },
    zoom: 12
  };

  // ラーメンデータに距離情報の設定します
  ramenData.map((data, i) => {
    data.distanceMatrix = distanceMatrix[i];
  });

  // ラーメンデータを距離の昇べきの順でソートします
  ramenData.sort((a, b) => {
    return a.distanceMatrix.distance.value - b.distanceMatrix.distance.value;
  });

  // 地図の描画
  const map = new google.maps.Map(embedElement, options);

  // マーカーの作成
  ramenData.map(({ latLng }, i) => {
    const label = (i + 1).toString();
    const options = {
      position: latLng,
      label,
      map
    };
    const marker = new google.maps.Marker(options);
  });
};

google.maps.event.addDomListener(window, 'load', initMap);
