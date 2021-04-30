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

var gmarkers = [];  

// 現在地の取得(getCurrentPosition)
const getCurrentPosition = () => {
  if ('geolocation' in navigator) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
};
// End of getCurrentPosition

// データの取得(fetchDistanceMatrix)
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



// 地図を描画する(initMap)
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
marker.myname = name;
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


// スクリプトを実行する
  google.maps.event.addDomListener(window, 'load', initMap);





/*

var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 8
  });

  var controlLists = document.createElement('div');
  'ABC'.split('').forEach(function(chr){
  
    var markers=[
      addMarker(chr),
      addMarker(chr),
      addMarker(chr),
    ];
    
    var controlList = document.createElement('input');
    controlList.type = 'checkbox';
    controlList.addEventListener('click',function(e){
      if (this.checked) {
        markers.forEach(function(marker){
          marker.setOpacity(1.0);
        })
      } else {
        markers.forEach(function(marker){
          marker.setOpacity(0.2);
        });
      }
    });
    controlLists.appendChild(controlList);
    
  });
  
  function setControl(controlDiv, map) {

    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

	controlLists.style.padding = '15px';
    controlUI.appendChild(controlLists);


  }
  
  var controlDiv = document.createElement('div');
  var control = new setControl(controlDiv, map);
  controlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(controlDiv);

  
  function addMarker(chr){
    return new google.maps.Marker({
      position: {lat: -34.397 + Math.random() -.5, lng: 150.644 + Math.random() -.5},
      label: chr,
      opacity: 0.2,
      map: map
    });
  }
  
}

*/
