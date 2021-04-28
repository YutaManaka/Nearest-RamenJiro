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
      map,
      name: ramenData[i].name,
      address: ramenData[i].address,
      open: ramenData[i].open,
      close: ramenData[i].close
    };
    const marker = new google.maps.Marker(options);
// 編集中
    // 情報ウインドウの生成とクリックイベント関数の登録処理
    setMarkerListener(marker, ramenData[i].name, ramenData[i].address, ramenData[i].open,ramenData[i].close);

  });

// 情報ウインドウの生成とクリックイベント関数の登録処理
function setMarkerListener(marker, name, address, open, close) {
  // 情報ウィンドウの生成
  const infoWindow = new google.maps.InfoWindow({
      content: '<div class="detail">'+name+'<br>'
               +'住所：'+address+'<br>'
               +'営業時間：'+open+'<br>'
               +'定休日：'+close+'<br>'
               +'</div>',
      maxWidth: 500
  });
  // マーカーのクリックイベントの関数登録
  marker.addListener('click', () => {
      // 情報ウィンドウの表示
      infoWindow.open(map, marker);
  });
}


// 編集終わり
};



// スクリプトを実行する
  google.maps.event.addDomListener(window, 'load', initMap);


/*セーブ
    // 情報ウインドウの生成とクリックイベント関数の登録処理
    setMarkerListener(marker, ramenData[i].name);

  });

// 情報ウインドウの生成とクリックイベント関数の登録処理
function setMarkerListener(marker, name) {
  // 情報ウィンドウの生成
  var infoWindow = new google.maps.InfoWindow({
      content: name,
      maxWidth: 500
  });
  // マーカーのクリックイベントの関数登録
  google.maps.event.addListener(marker, 'click', function(event) {
      // 情報ウィンドウの表示
      infoWindow.open(map, marker);
  });
}
*/