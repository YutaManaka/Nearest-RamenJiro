/*
// Google Maps APIのAPIキーを公開せずにGitHubにpushするため
  // APIキーを読み出す
const myApiKey = gmapapi.API_KEY;

  // テンプレート文字列を用いて、urlにAPIキーを代入
const url = `https://maps.googleapis.com/maps/api/js?key=${myApiKey}&amp;callback=initMap`;

  // script要素をdocument.createElement('script')で作成
const script = document.createElement('script');

  // setAttributeメソッドで、src属性にurlをセットし、async属性とdefer属性をtrueにセット
script.setAttribute('src', url);
script.setAttribute('async', true);
script.setAttribute('defer', true);

  // 生成したscript要素をappendChildメソッドでHTMLのbody要素の最後に追加
document.head.appendChild(script);
*/

// 現在地の取得
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
      icon: {
        fillColor: "#F7E503",                //塗り潰し色
		    fillOpacity: 0.8,                    //塗り潰し透過率
		    path: google.maps.SymbolPath.CIRCLE, //円を指定
		    scale: 16,                           //円のサイズ
		    strokeColor: "#ED200E",              //枠の色
		    strokeWeight: 3.0                    //枠の太さ
      },
      position: latLng,
      label,
      map
    };
    const marker = new google.maps.Marker(options);
  });
};
// スクリプトを実行する
  google.maps.event.addDomListener(window, 'load', initMap);
