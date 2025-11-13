// ...existing code from <script>...</script> in index.html...
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2dwbGF5ZXIiLCJhIjoiY200OXBzcmI1MGR6bzJxcTFrdDJ1MGJyNSJ9.o_VpEScSsAPdt8U8PDB58Q';

const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';
const STREETS_STYLE = 'mapbox://styles/mapbox/streets-v11';

// Mapインスタンスをグローバル(window)にする
window.map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-streets-v12', // サテライトを初期表示
    projection: 'globe',
    zoom: 4,
    center: [138, 36]
});

map.addControl(new mapboxgl.NavigationControl());

// --- ここが重要 ---
// fetchBoundaryData()の呼び出しはDOMContentLoadedではなく、必ず「map.on('style.load', ...)」の中で一度だけ呼ぶ
let boundaryLoaded = false;
map.on('style.load', () => {
    map.setFog({});
    // ラベルレイヤーを非表示にする
    map.getStyle().layers.forEach(layer => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
    });
    // アイコンとレイヤーを再登録
    loadIconsAndAddLayer();
    if (boundaryGeoJson) {
        drawOuterBoundary(boundaryGeoJson);
    }
    
    // おすすめスポットのレイヤーも再初期化
    if (lastRecommendedSpotsGeoJson) {
        try {
            if (!map.getSource('recommended-spots')) {
                map.addSource('recommended-spots', { 
                    type: 'geojson', 
                    data: lastRecommendedSpotsGeoJson 
                });
            }
            
            if (!map.getLayer('recommended-spots-layer')) {
                map.addLayer({
                    id: 'recommended-spots-layer',
                    type: 'symbol',
                    source: 'recommended-spots',
                    layout: {
                        'icon-image': ['get', 'icon'],
                        'icon-size': 0.08, // さらに小さく
                        'icon-allow-overlap': true
                    },
                    paint: {
                        'icon-opacity': 1
                    }
                });
            }
            console.log('✅ Recommended spots layer re-initialized on style load');
        } catch (error) {
            console.error('❌ Failed to re-initialize recommended spots layer:', error);
        }
    }
});

function loadIconsAndAddLayer() {
    const iconFiles = [
        // みんなのおすすめスポット用のアイコンのみ
        { name: 'mayor-icon', url: '市長.png' },
        { name: 'male-icon', url: '男性.png' },
        { name: 'female-icon', url: '女性.png' },
        { name: 'girl-icon', url: '女性.png' }, // 女子は女性アイコンを使用
        { name: 'boy-icon', url: '男性.png' }, // 男子は男性アイコンを使用
        { name: 'grandfather-icon', url: 'おじいちゃん.png' },
        { name: 'grandmother-icon', url: 'おばあちゃん.png' }
    ];
    let loaded = 0;
    iconFiles.forEach(icon => {
        map.loadImage(icon.url, (error, image) => {
            if (error) {
                console.error(`❌ 画像の読み込み失敗: ${icon.url}`, error);
            } else {
                if (!map.hasImage(icon.name)) {
                    try {
                        map.addImage(icon.name, image);
                        console.log(`✅ 画像登録: ${icon.name} (${icon.url})`);
                    } catch (e) {
                        console.error(`❌ addImage失敗: ${icon.name}`, e);
                    }
                } else {
                    console.log(`ℹ️ 既に登録済み: ${icon.name}`);
                }
            }
            loaded++;
            if (loaded === iconFiles.length) {
                // ソースとレイヤーを再追加（おすすめのみ）
                // みんなのおすすめスポットのソースとレイヤーを再追加
                try {
                    if (!map.getSource('recommended-spots')) {
                        map.addSource('recommended-spots', { type: 'geojson', data: lastRecommendedSpotsGeoJson || { type: 'FeatureCollection', features: [] } });
                        console.log('✅ recommended-spotsソース追加');
                    } else {
                        map.getSource('recommended-spots').setData(lastRecommendedSpotsGeoJson || { type: 'FeatureCollection', features: [] });
                        console.log('ℹ️ recommended-spotsソース更新');
                    }
                } catch (e) {
                    console.error('❌ recommended-spotsソース追加/更新失敗', e);
                }
                try {
                    if (!map.getLayer('recommended-spots-layer')) {
                        map.addLayer({
                            id: 'recommended-spots-layer',
                            type: 'symbol',
                            source: 'recommended-spots',
                            layout: {
                                'icon-image': ['get', 'icon'],
                                'icon-size': [
                                    'match',
                                    ['get', 'icon'],
                                    'mayor-icon', 0.13,
                                    'male-icon', 0.13,
                                    'female-icon', 0.13,
                                    'grandfather-icon', 0.13,
                                    'grandmother-icon', 0.13,
                                    0.2
                                ],
                                'icon-allow-overlap': true
                            },
                            paint: {
                                'icon-opacity': 1
                            }
                        });
                        console.log('✅ recommended-spots-layer追加');
                    } else {
                        console.log('ℹ️ recommended-spots-layerは既に存在');
                    }
                } catch (e) {
                    console.error('❌ recommended-spots-layer追加失敗', e);
                }
            }
        });
    });
}

// 高島市以外を雲で隠すアニメーション
function applyFogAnimation() {
    map.setFog({
        range: [0.5, 10],
        color: 'white',
        "horizon-blend": 0.1
    });
    gsap.to(map.getFog(), {
        duration: 2,
        range: [0.1, 2],
        "horizon-blend": 0.8,
        onUpdate: () => {
            map.setFog({
                range: gsap.getProperty(map.getFog(), "range"),
                color: 'white',
                "horizon-blend": gsap.getProperty(map.getFog(), "horizon-blend")
            });
        }
    });
}

function highlightTakasima() {
    map.flyTo({
        center: [135.94635242951762, 35.37786887726864],
        zoom: 10,
        pitch: 45,
        bearing: 0,
        speed: 0.8,
        curve: 1.5
    });
    applyFogAnimation();
}

const sheetNames = ['takasima_map'];
const spreadsheetId = '1AZgfYRfWLtVXH7rx7BeEPmbmdy7EfnGDbAwi6bMSNsU';
const apiKey = 'AIzaSyAj_tQf-bp0v3j6Pl8S7HQVO5I-D5WI0GQ';

// みんなのおすすめスポット用の設定
const recommendedSpotsSpreadsheetId = '1kshDopEBMw-7chK-TyV8_vp9Qhwe25ScoZ-BYmIJnL8';
const recommendedSpotsSheetName = 'おすすめスポット'; // 正しいシート名

// アクセスログ用の設定（Google Apps Script Webhook URLを設定してください）
// 設定方法: https://script.google.com で新しいプロジェクトを作成し、下記のコードを貼り付けてWebアプリとして公開
// const ACCESS_LOG_WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
const ACCESS_LOG_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxth09fruVu66sELAfaqRrkXl9j0vNbtt6omhl3TGAQR1CEk-cE4_3NMYwHPnPM2KYOkw/exec';

let data = {};
let markers = [];
let recommendedSpotsMarkers = [];
let categories = new Set();
let boundaryGeoJson = null;
let lastMarkersGeoJson = null;
let lastRecommendedSpotsGeoJson = null;
let recommendedSpotsVisible = false; // おすすめスポットの表示状態を管理

async function fetchData(sheetName) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        data.values.shift();
        return data.values;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// みんなのおすすめスポットのデータを取得
async function fetchRecommendedSpotsData() {
    console.log('Fetching recommended spots data from', recommendedSpotsSheetName);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${recommendedSpotsSpreadsheetId}/values/${recommendedSpotsSheetName}?key=${apiKey}`;
    console.log('Request URL:', url);

    try {
        // GitHub Pagesでの動作を確実にするため、タイムアウトを設定
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト

        const response = await fetch(url, {
            signal: controller.signal,
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to fetch recommended spots data`);
        }
        const data = await response.json();
        console.log('Fetched recommended spots data:', data);
        
        if (!data.values || data.values.length === 0) {
            console.log('No recommended spots data found');
            return [];
        }
        
        // 参考コードと同じように、ヘッダー行を削除しない
        console.log('Processed recommended spots rows:', data.values);
        return data.values;
    } catch (error) {
        console.error('Error fetching recommended spots data:', error);
        if (error.name === 'AbortError') {
            console.log('Request timed out, using fallback data');
        }
        return [];
    }
}

// 観光カテゴリー定義は廃止

// アイコンを読み込む関数
function loadIcons() {
    const iconFiles = [
        { name: 'mountain-icon', url: 'mountain.png' },
        { name: 'camp-icon', url: 'camp.png' },
        { name: 'kankochi-icon', url: 'kankochi.png' },
        { name: 'event-icon', url: 'event.png' },
        { name: 'shrine-icon', url: 'shrine.png' },
        { name: 'hotel-icon', url: 'hotel.png' },
        { name: 'food-icon', url: 'food.png' }
    ];

    iconFiles.forEach(icon => {
        map.loadImage(icon.url, (error, image) => {
            if (error) {
                console.error(`Error loading icon ${icon.url}:`, error);
                return;
            }
            if (!map.hasImage(icon.name)) {
                map.addImage(icon.name, image);
            }
        });
    });
}

async function init() {
    // 観光（通常マーカー）は廃止

    map.on('load', () => {
        // アイコンを読み込む
        loadIcons();
        
        // 既存の観光マーカー関連のレイヤー・イベントは作成しない

        // クリックでおすすめポップアップを閉じる
        map.on('click', (e) => {
            const recommendedFeatures = map.queryRenderedFeatures(e.point, { layers: ['recommended-spots-layer'] });
            if (recommendedFeatures.length === 0) {
                recommendedSpotsPopup.remove();
                isRecommendedSpotsPopupFixed = false;
            }
        });

        // みんなのおすすめスポット用のポップアップ
        const recommendedSpotsPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
        let isRecommendedSpotsPopupFixed = false;

        map.on('mouseenter', 'recommended-spots-layer', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            if (!isRecommendedSpotsPopupFixed) {
                const features = map.queryRenderedFeatures(e.point, { layers: ['recommended-spots-layer'] });
                if (features.length > 0) {
                    const feature = features[0];
                    const coordinates = feature.geometry.coordinates.slice();
                    const properties = feature.properties;
                    const html = `
                        <div class="popup">
                            <h3>${properties.recommendedPlace}</h3>
                            <p><strong>${properties.nickname}</strong>のおすすめ</p>
                            ${properties.reason ? `<p>${properties.reason}</p>` : ''}
                        </div>
                    `;
                    recommendedSpotsPopup.setLngLat(coordinates).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'recommended-spots-layer', () => {
            map.getCanvas().style.cursor = '';
            if (!isRecommendedSpotsPopupFixed) recommendedSpotsPopup.remove();
        });

        map.on('click', 'recommended-spots-layer', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['recommended-spots-layer'] });
            if (features.length > 0) {
                const feature = features[0];
                const coordinates = feature.geometry.coordinates.slice();
                const properties = feature.properties;
                const html = `
                    <div class="popup">
                        <h3>${properties.recommendedPlace}</h3>
                        <p><strong>${properties.nickname}</strong>のおすすめ</p>
                        ${properties.reason ? `<p>${properties.reason}</p>` : ''}
                    </div>
                `;
                recommendedSpotsPopup.remove();
                recommendedSpotsPopup.setLngLat(coordinates).setHTML(html).addTo(map);
                isRecommendedSpotsPopupFixed = true;
            }
        });

        // カテゴリーフィルター機能を削除 - 思い出マップ用に簡素化
    });
}

// みんなのおすすめスポットの初期化
async function initRecommendedSpots() {
    let points = await fetchRecommendedSpotsData();
    
    // データが取得できない場合はテスト用のダミーデータを使用
    if (!points || points.length === 0) {
        console.log('Using dummy data for testing - API access failed or no data available');
        points = [
            ['2025-01-01', 'けんた', '高島市市役所', '７月２３日麗澤大学と高島市の協定調印式！', '35.353044, 136.035733', '市長'],
            ['2025-01-01', 'テストユーザー', '琵琶湖', '美しい湖の景色', '35.377868, 135.946352', '男性'],
            ['2025-01-01', '地元の方', 'マキノサニービーチ', '夏の海水浴場として人気', '35.416667, 136.016667', '女性'],
            ['2025-01-01', '観光客', '高島市観光案内所', '観光情報が充実', '35.353044, 136.035733', 'おじいちゃん']
        ];
    }

    recommendedSpotsMarkers = [];

    points.forEach((point, index) => {
        // ヘッダー行をスキップ
        if (index === 0) return;
        
        const [timestamp, nickname, recommendedPlace, reason, coordinates, icon, genre] = point;
        
        if (!coordinates || !recommendedPlace) return;
        
        // 緯度経度を解析
        let lat, lon;
        try {
            const coords = coordinates.split(',').map(coord => coord.trim());
            lat = parseFloat(coords[0]);
            lon = parseFloat(coords[1]);
        } catch (e) {
            console.warn('Invalid coordinates format:', coordinates);
            return;
        }
        
        if (isNaN(lat) || isNaN(lon)) return;
        
        // アイコン名を決定
        let iconName = 'mayor-icon'; // デフォルト
        if (icon) {
            switch (icon.trim()) {
                case '市長':
                    iconName = 'mayor-icon';
                    break;
                case '男性':
                    iconName = 'male-icon';
                    break;
                case '女性':
                    iconName = 'female-icon';
                    break;
                case '女子':
                    iconName = 'girl-icon';
                    break;
                case '男子':
                    iconName = 'boy-icon';
                    break;
                case 'おじいちゃん':
                    iconName = 'grandfather-icon';
                    break;
                case 'おばあちゃん':
                    iconName = 'grandmother-icon';
                    break;
            }
        }
        
        recommendedSpotsMarkers.push({
            coordinates: [lon, lat],
            properties: { 
                nickname: nickname || '匿名',
                recommendedPlace: recommendedPlace,
                reason: reason || '',
                icon: iconName,
                genre: genre || '' // G列のジャンル情報
            }
        });
    });

    lastRecommendedSpotsGeoJson = {
        type: 'FeatureCollection',
        features: recommendedSpotsMarkers.map(marker => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: marker.coordinates },
            properties: marker.properties
        }))
    };

        // ソースとレイヤーを追加（初期状態では非表示）
    try {
        if (map.getSource('recommended-spots')) {
            map.getSource('recommended-spots').setData(lastRecommendedSpotsGeoJson);
        } else {
            map.addSource('recommended-spots', { 
                type: 'geojson', 
                data: lastRecommendedSpotsGeoJson 
            });
        }
        
        if (!map.getLayer('recommended-spots-layer')) {
            map.addLayer({
                id: 'recommended-spots-layer',
                type: 'symbol',
                source: 'recommended-spots',
                layout: {
                    'icon-image': ['get', 'icon'],
                    'icon-size': 0.12,
                    'icon-allow-overlap': true
                },
                paint: {
                    'icon-opacity': 1
                }
            });
        }
        console.log('✅ Recommended spots layer initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize recommended spots layer:', error);
    }
}

// 高島市の外枠を描画する関数
function drawOuterBoundary(geojsonData) {
    boundaryGeoJson = geojsonData;
    if (map.getLayer('takasima-outer-boundary')) {
        map.removeLayer('takasima-outer-boundary');
    }
    if (map.getSource('takasima-outer-boundary')) {
        map.removeSource('takasima-outer-boundary');
    }
    map.addSource('takasima-outer-boundary', {
        type: 'geojson',
        data: boundaryGeoJson
    });
    map.addLayer({
        id: 'takasima-outer-boundary',
        type: 'line',
        source: 'takasima-outer-boundary',
        layout: {},
        paint: {
            'line-color': '#FF0000',
            'line-width': 3
        }
    });
}

// 初回ロード時に必ず境界データを取得
fetchBoundaryData();

// GeoJSONファイルを読み込む関数
async function fetchBoundaryData() {
    try {
        const response = await fetch('./map.geojson');
        if (!response.ok) throw new Error('Failed to fetch GeoJSON data');
        const geojsonData = await response.json();
        boundaryGeoJson = geojsonData;
        window.boundaryGeoJson = geojsonData; // どちらでも参照できるように
        drawOuterBoundary(boundaryGeoJson);
    } catch (error) {
        console.error('Error fetching GeoJSON data:', error);
    }
}

// 矢印ボタンのイベントリスナーを削除 - カテゴリーフィルター機能を削除

// 情報ポップアップ機能を削除 - 思い出マップ用に簡素化

// マーカーに飛ぶ関数
window.flyToMarker = function(lon, lat, markerData = null) {
    map.flyTo({
        center: [lon, lat],
        zoom: 15,
        speed: 1.2
    });
    
    // おすすめスポットの場合はポップアップを表示
    if (markerData && markerData.properties && markerData.properties.recommendedPlace) {
        setTimeout(() => {
            const html = `
                <div class="popup">
                    <h3>${markerData.properties.recommendedPlace}</h3>
                    <p><strong>${markerData.properties.nickname}</strong>のおすすめ</p>
                    ${markerData.properties.reason ? `<p>${markerData.properties.reason}</p>` : ''}
                </div>
            `;
            const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: false });
            popup.setLngLat([lon, lat]).setHTML(html).addTo(map);
        }, 1500); // 飛行完了後に表示
    }
};

// ポップアップの閉じるボタンのイベントリスナーを削除 - 情報ポップアップ機能を削除

// ベースマップ切り替え機能を削除 - 航空写真オンリー

// みんなのおすすめスポットのトグル機能を削除 - 思い出マップ用に簡素化

// カテゴリーフィルター機能を削除 - 思い出マップ用に簡素化

// 検索UIの表示・非表示
const searchToggle = document.getElementById('search-toggle');
const searchBox = document.getElementById('search-box');
const searchIconBtn = document.getElementById('search-icon-btn');
const searchCloseBtn = document.getElementById('search-close-btn');
const searchInput = document.getElementById('search-input');
// ラジオボタンに変更
const searchCategories = document.querySelectorAll('input[name="category"]');
const searchResults = document.getElementById('search-results');

// 検索ボックスを開く
searchIconBtn.addEventListener('click', () => {
    searchBox.classList.remove('hidden');
    document.body.classList.add('search-open'); // スマホ対応のクラス追加
    searchInput.focus();
    // 検索ボックスを開いたら最初からすべての思い出を表示
    document.getElementById('category-all').checked = true; // すべてを選択
    searchInput.value = ''; // キーワードをクリア
    doSearch(); // 検索実行してすべて表示
});
// 閉じる
searchCloseBtn.addEventListener('click', () => {
    searchBox.classList.add('hidden');
    document.body.classList.remove('search-open'); // スマホ対応のクラス削除
    searchInput.value = '';
    searchResults.innerHTML = '';
});

// カテゴリマッチング関数
function isCategoryMatch(text, categories) {
    const categoryKeywords = {
        'ROMANCE': ['恋人', 'キス', '手をつなぐ', 'デート', '愛', 'ロマンス', 'カップル', '二人', '一緒', '想い出'],
        'NOSTALGIA': ['子供', '昔', '懐かしい', '幼い', '家族', '学校', '遊び場', '思い出', '懐かし', '古い'],
        'FUN': ['笑', '楽しい', '面白', '冒険', '夏祭り', 'イベント', '祭り', '盛り上が', 'ワクワク', '興奮'],
        'DISCOVERY': ['初めて', '発見', '感動', '驚き', '新しい', '知らなかった', '初体験', '目から鱗', '気づき'],
        'ADVENTURE': ['迷子', '道に迷', 'チャレンジ', '挑戦', '困難', '道なき道', '冒険', '未知', '探検', '踏み出']
    };
    
    for (const category of categories) {
        const keywords = categoryKeywords[category] || [];
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return true;
            }
        }
    }
    return false;
}

// 検索処理
function doSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedCategory = document.querySelector('input[name="category"]:checked');
    const categoryValue = selectedCategory ? selectedCategory.value : '';

    console.log('検索実行:', { keyword, categoryValue, selectedCategory });

    let filtered = recommendedSpotsMarkers;

    // カテゴリで絞り込み（空文字はすべて）
    if (categoryValue) {
        console.log('カテゴリフィルタ適用:', categoryValue);
        filtered = filtered.filter(m => {
            const reason = m.properties.reason || '';
            const place = m.properties.recommendedPlace || '';
            const text = (reason + ' ' + place).toLowerCase();
            
            if (categoryValue === 'その他') {
                // その他: どのカテゴリにも該当しないもの
                return !isCategoryMatch(text, ['ROMANCE', 'NOSTALGIA', 'FUN', 'DISCOVERY', 'ADVENTURE']);
            } else {
                // 指定されたカテゴリと一致
                return isCategoryMatch(text, [categoryValue]);
            }
        });
        console.log('フィルタ後件数:', filtered.length);
    }

    // キーワードで絞り込み
        if (keyword) {
            filtered = filtered.filter(m =>
                (m.properties.recommendedPlace && m.properties.recommendedPlace.toLowerCase().includes(keyword)) ||
                (m.properties.nickname && m.properties.nickname.toLowerCase().includes(keyword)) ||
                (m.properties.reason && m.properties.reason.toLowerCase().includes(keyword))
            );
        }

        // 結果表示
        searchResults.innerHTML = '';
        if (filtered.length === 0) {
            searchResults.innerHTML = '<div style="color:#888;padding:8px;">該当なし</div>';
            return;
        }
        filtered.forEach(marker => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<strong>${marker.properties.recommendedPlace}</strong><br><span style="font-size:12px;color:#666;">${marker.properties.nickname}${marker.properties.reason ? ' / ' + marker.properties.reason : ''}</span>`;
            div.onclick = () => {
                flyToMarker(marker.coordinates[0], marker.coordinates[1], marker);
            searchBox.classList.add('hidden');
        };
        searchResults.appendChild(div);
    });
}

// 「みんなのおすすめ一覧」ボタンのイベント
// recommendedListBtn.onclick = () => {
//     // 一覧表示
//     searchCategory.value = '__recommended__';
//     searchInput.value = '';
//     doSearch();
//     searchBox.classList.remove('hidden');
// };

// 入力イベント
searchInput.addEventListener('input', doSearch);

// アクセスログを記録する関数
async function logAccess() {
    if (!ACCESS_LOG_WEBHOOK_URL) {
        console.log('ℹ️ アクセスログ機能は無効です（ACCESS_LOG_WEBHOOK_URLが設定されていません）');
        return;
    }
    
    try {
        // アクセス情報を収集
        const accessData = {
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ja-JP'),
            time: new Date().toLocaleTimeString('ja-JP'),
            url: window.location.href,
            referrer: document.referrer || '直接アクセス',
            userAgent: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        // Google Apps Script Webhookに送信
        const response = await fetch(ACCESS_LOG_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors', // CORSエラーを回避
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(accessData)
        });
        
        console.log('✅ アクセスログを記録しました:', accessData);
    } catch (error) {
        console.error('❌ アクセスログの記録に失敗:', error);
        // エラーは無視（ログ記録の失敗でサイトの動作を妨げない）
    }
}

// インフォメーションボタンの動作
document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('info-button');
    const infoPopup = document.getElementById('info-popup');
    const infoCloseBtn = document.getElementById('info-popup-close');
    
    if (infoButton && infoPopup && infoCloseBtn) {
        infoButton.addEventListener('click', () => {
            infoPopup.classList.toggle('hidden');
        });
        
        infoCloseBtn.addEventListener('click', () => {
            infoPopup.classList.add('hidden');
        });
        
        // ポップアップ外をクリックで閉じる
        infoPopup.addEventListener('click', (e) => {
            if (e.target === infoPopup) {
                infoPopup.classList.add('hidden');
            }
        });
    }
    
    // 検索ボックス外をクリックで閉じる（スマホ対応）
    document.addEventListener('click', (e) => {
        if (!searchBox.classList.contains('hidden') && 
            !searchBox.contains(e.target) && 
            !searchIconBtn.contains(e.target)) {
            searchBox.classList.add('hidden');
            document.body.classList.remove('search-open');
            searchInput.value = '';
            searchResults.innerHTML = '';
        }
    });
});

// 自作かるたのデータを読み込んで表示
async function loadKarutaData() {
    const karutaGrid = document.getElementById('karuta-grid');
    if (!karutaGrid) return;
    
    // ローディング表示
    karutaGrid.innerHTML = `
        <div style="text-align: center; padding: 60px 40px; color: #667eea; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 20px; margin: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px; animation: bounce 2s ease-in-out infinite;">🎴</div>
            <div style="font-size: 18px; font-weight: 700; margin-bottom: 20px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">自作かるたを読み込み中...</div>
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 20px;">
                <div style="width: 12px; height: 12px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;"></div>
                <div style="width: 12px; height: 12px; background: linear-gradient(135deg, #764ba2, #f093fb); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite 0.2s;"></div>
                <div style="width: 12px; height: 12px; background: linear-gradient(135deg, #f093fb, #667eea); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite 0.4s;"></div>
            </div>
        </div>
    `;
    
    try {
        // karuta_imagesフォルダ内の画像ファイルを取得
        console.log('🔍 画像ファイル検索開始...');
        const imageFiles = await getKarutaImages();
        console.log('📋 検索結果:', imageFiles);
        
        if (imageFiles.length === 0) {
            console.log('❌ 画像ファイルが見つかりませんでした');
            karutaGrid.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #888;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📁</div>
                    <div>かるた画像が見つかりません</div>
                    <div style="font-size: 12px; margin-top: 10px; color: #aaa;">
                        karuta_imagesフォルダを確認してください
                    </div>
                </div>
            `;
            return;
        }
        
        karutaGrid.innerHTML = '';
        
        imageFiles.forEach((imageFile, index) => {
            const card = document.createElement('div');
            card.className = 'karuta-card';
            
            // ファイル名からタイトルを生成
            let title = imageFile.replace(/\.[^/.]+$/, ""); // 拡張子を除去
            
            // ファイル名を読みやすく変換
            title = formatFileName(title);
            
            // 画像パスを正しく設定
            const imagePath = `./karuta_images/${imageFile}`;
            console.log(`🖼️ 画像パス: ${imagePath}`);
            
            card.innerHTML = `
                <div class="karuta-image-container">
                    <img src="${imagePath}" alt="${title}のかるた" class="karuta-image" 
                         onload="console.log('✅ 画像読み込み成功:', '${imagePath}')"
                         onerror="console.error('❌ 画像読み込み失敗:', '${imagePath}'); this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding:20px;color:#888;text-align:center;\\'>画像が見つかりません<br><small>${imagePath}</small></div>'">
                </div>
                <div class="karuta-title">${title}のかるた</div>
            `;
            
            karutaGrid.appendChild(card);
        });
        
        console.log(`✅ 自作かるた ${imageFiles.length} 件を表示しました`);
        
    } catch (error) {
        console.error('❌ 自作かるたの読み込みに失敗:', error);
        karutaGrid.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff4444;">読み込みに失敗しました</div>';
    }
}

// karuta_imagesフォルダ内の画像ファイルを取得する関数
async function getKarutaImages() {
    console.log('🔍 karuta_imagesフォルダ内の画像を検索中...');
    
    // 既知のファイル名を直接指定（実際のファイルに基づく）
    const knownFiles = [
        'keitaro.jpg'
    ];
    
    const existingImages = [];
    
    // 既知のファイルの存在を確認
    for (const fileName of knownFiles) {
        try {
            const response = await fetch(`./karuta_images/${fileName}`, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(2000) // 2秒でタイムアウト
            });
            
            if (response.ok) {
                existingImages.push(fileName);
                console.log(`✅ 画像ファイル発見: ${fileName}`);
            } else {
                console.log(`❌ ファイルが見つかりません: ${fileName} (${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ファイルアクセスエラー: ${fileName}`, error.message);
        }
    }
    
    console.log(`📊 合計 ${existingImages.length} 個の画像ファイルが見つかりました`);
    
    return existingImages;
}

// ファイル名を読みやすく変換する関数
function formatFileName(fileName) {
    // アンダースコア、ハイフン、ドットをスペースに変換
    let formatted = fileName.replace(/[_.-]/g, ' ');
    
    // 数字の前後にスペースを追加
    formatted = formatted.replace(/(\d+)/g, ' $1 ');
    
    // 複数のスペースを1つに統一
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // 先頭を大文字に
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    
    // よくある略語を展開
    const expansions = {
        'img': 'Image',
        'pic': 'Picture',
        'photo': 'Photo',
        'card': 'Card',
        'karuta': 'かるた',
        'test': 'Test',
        'sample': 'Sample',
        'new': 'New',
        'temp': 'Temp',
        'backup': 'Backup',
        'copy': 'Copy',
        'main': 'Main',
        'sub': 'Sub',
        'extra': 'Extra',
        'special': 'Special',
        'unique': 'Unique',
        'original': 'Original',
        'first': 'First',
        'second': 'Second',
        'third': 'Third',
        'last': 'Last',
        'final': 'Final',
        'begin': 'Begin',
        'start': 'Start',
        'end': 'End',
        'finish': 'Finish',
        'complete': 'Complete'
    };
    
    for (const [abbr, full] of Object.entries(expansions)) {
        formatted = formatted.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    }
    
    // 空の場合はデフォルト名を返す
    return formatted || 'Unknown';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting initialization');
    
    // ラジオボタンの変更イベントを設定
    const searchCategories = document.querySelectorAll('input[name="category"]');
    console.log('ラジオボタン数:', searchCategories.length);
    
    searchCategories.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log('ラジオボタン変更:', e.target.value);
            doSearch();
        });
    });
    
    // 自作かるたボタンのイベント
    const karutaButton = document.getElementById('karuta-button');
    const karutaPopup = document.getElementById('karuta-popup');
    const karutaCloseBtn = document.getElementById('karuta-close-btn');
    
    if (karutaButton && karutaPopup && karutaCloseBtn) {
        karutaButton.addEventListener('click', async () => {
            karutaPopup.classList.remove('hidden');
            await loadKarutaData();
        });
        
        karutaCloseBtn.addEventListener('click', () => {
            karutaPopup.classList.add('hidden');
        });
        
        // ポップアップ外をクリックで閉じる
        karutaPopup.addEventListener('click', (e) => {
            if (e.target === karutaPopup) {
                karutaPopup.classList.add('hidden');
            }
        });
    }
    
    // アクセスログを記録（非同期で実行、エラーは無視）
    logAccess().catch(() => {});
    
    // 初期化を順次実行
    init().then(() => {
        console.log('Main init completed');
        // メインの初期化が完了してから、おすすめスポットを初期化
        return initRecommendedSpots();
    }).then(() => {
        console.log('Recommended spots init completed');
        // トグルスイッチ機能を削除 - 思い出マップ用に簡素化
        // 両方の初期化が完了してから高島市に移動
        setTimeout(highlightTakasima, 2000);
    }).catch(error => {
        console.error('Initialization error:', error);
        // エラーが発生しても高島市への移動を実行
        setTimeout(highlightTakasima, 2000);
    });
});
