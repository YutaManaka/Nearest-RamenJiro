var gmarkers = [];  

// 1.現在地の取得(getCurrentPosition)
const getCurrentPosition = () => {
  if ('geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
};
// End of getCurrentPosition

// 2.データの取得(fetchDistanceMatrix)
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
// End of fetchDistanceMatrix

// 3.地図を描画する(initMap)
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
      labelClass: "labels", // the CSS class for the label
      map,
      name: ramenData[i].name,
      address: ramenData[i].address,
      open: ramenData[i].open,
      close: ramenData[i].close,
      open_info: ramenData[i].open_info
    };
    const marker = new google.maps.Marker(options);
    // 情報ウインドウの生成とクリックイベント関数の登録処理
    setMarkerListener(marker, ramenData[i].name, ramenData[i].address, ramenData[i].open,ramenData[i].close);

    //マーカー情報をグローバル配列に保存
    marker.myopen_info = ramenData[i].open_info;     
    gmarkers.push(marker);
  });

  // 情報ウインドウの生成とクリックイベント関数の登録処理(setMarkerListener)
  function setMarkerListener(marker, name, address, open, close) {
    // 情報ウィンドウの生成
    const infoWindow = new google.maps.InfoWindow({
        content: '<div class="detail_name">'+name+'</div><br>'+
                '<div class="detail_info">'+address+'<br><br>'
                +'【営業時間】'+open+'<br><br>'
                +'【定休日】'+close+'<br></div>',
        maxWidth: 500
    });
    // マーカーのクリックイベントの関数登録
    marker.addListener('click', () => {
        // 情報ウィンドウの表示
        infoWindow.open(map, marker);
    });
    //地図上クリックで情報ウィンドウを非表示
    google.maps.event.addListener(map, "click", function(){
      infoWindow.close();
    });

    //表示カテゴリのマーカーを表示する(show)
    function show(open_info) {
      for (var i = 0; i < gmarkers.length; i++) {
        if (gmarkers[i].myopen_info == open_info) {gmarkers[i].setVisible(true);}
      }
      document.getElementById(open_info+"box").checked = true;
    }
    // End of show

    //非表示カテゴリのマーカーを非表示にする(hide)
    function hide(open_info) {
      for (var i = 0; i < gmarkers.length; i++) {
        if (gmarkers[i].myopen_info == open_info) {gmarkers[i].setVisible(false);}
      }
      document.getElementById(open_info+"box").checked = false;
      infoWindow.close();
    }
    // End of hide

    //チェックボックスのクリック処理(boxclick)
    window.boxclick = function boxclick(box,open_info) {
      if (box.checked) { show(open_info); } else { hide(open_info); }
    }
    //End of boxclick

    //カテゴリ毎のマーカー表示/非表示の初期設定
    show("Weekday");
    show("Sat");
    show("Sun");
  }
  // End of setMarkerListener
};
// End of initMap


// 4.スクリプトを実行する
  google.maps.event.addDomListener(window, 'load', initMap);