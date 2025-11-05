<?php
// 為了不顯示 API KEY 而寫的 jwt.php - PHP 5.6 相容
// 功能：
// 1) 驗證請求來源 host（允許 localhost / 127.0.0.1 任意 port 或正式網域）
// 2) 僅接受 POST（並處理 OPTIONS 預檢）
// 3) 以 server-side 呼叫 jwt API (https://aiep.digiwin.com/dae/api/apilogin)
// 4) 將 upstream 回應與狀態回傳給前端，並處理錯誤

// (1) 基本設定
// $allowed_hosts = array('127.0.0.1', 'localhost', 'www.digiwin.com'); // 開發用，包含任意 port
$allowed_hosts = array('www.digiwin.com.tw', 'www.digiwin.com');
$API_KEY = '629b0437-e722-43bf-8c77-85fgh78912342a';
$upstream_url = 'https://aiep.digiwin.com/dae/api/apilogin';

// (2) 取出 Origin（優先）或 Referer 作為來源參考
$origin_header = '';
if (!empty($_SERVER['HTTP_ORIGIN'])) {
  $origin_header = $_SERVER['HTTP_ORIGIN']; // e.g. http://127.0.0.1:53721
} elseif (!empty($_SERVER['HTTP_REFERER'])) {
  // 取 referer 的 scheme+host+port（若有）
  $origin_header = preg_replace('#^(https?://[^/]+).*$#', '$1', $_SERVER['HTTP_REFERER']);
}

// (3) 解析 host（不含 port）以比對允許清單
$origin_host = '';
if ($origin_header) {
  $parts = parse_url($origin_header);
  if ($parts !== false && isset($parts['host'])) {
    $origin_host = strtolower($parts['host']);
  }
}

// (4) 檢查來源是否在允許清單
if (!in_array($origin_host, $allowed_hosts)) {
  header('HTTP/2 403 Forbidden');
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('Success' => false, 'ErrorMsg' => 'Forbidden: invalid origin', 'origin' => $origin_header));
  exit;
}

// (5) CORS header：只對合法 origin 回傳 Access-Control-Allow-Origin 原樣值（含 port）
if ($origin_header) {
  header('Access-Control-Allow-Origin: ' . $origin_header);
} else {
  // 保險起見，若無 origin header 也拒絕（已在上面判斷過）
  header('HTTP/2 403 Forbidden');
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(array('Success' => false, 'ErrorMsg' => 'No origin header'));
  exit;
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// (6) 預檢請求直接回應 (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  // 可以回 204 或 200
  http_response_code(204);
  exit;
}

// (7) 嚴格要求 POST 方法
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('HTTP/2 405 Method Not Allowed');
  header('Allow: POST, OPTIONS');
  echo json_encode(array('Success' => false, 'ErrorMsg' => 'Only POST method is allowed'));
  exit;
}

// (8) 準備向 upstream 發出請求
$payload = array(
  'system' => 'dae',
  'apiKey' => $API_KEY
);
$payload_json = json_encode($payload);

// 初始化 cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $upstream_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload_json);
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json', 'Content-Length: ' . strlen($payload_json)));
curl_setopt($ch, CURLOPT_TIMEOUT, 15);         // 整體 timeout
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);  // 連線 timeout

// 若你的環境需要，請勿關閉 SSL 驗證；下列為預設安全行為（不用設定 CURLOPT_SSL_VERIFYPEER=false）
// curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

// (9) 執行 cURL 並取得回應、HTTP status
$response = curl_exec($ch);
$curl_errno = curl_errno($ch);
$curl_err = curl_error($ch);
$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// (10) 錯誤處理：cURL 錯誤視為 502 Bad Gateway 回傳
if ($curl_errno) {
  http_response_code(502);
  echo json_encode(array('Success' => false, 'ErrorMsg' => 'cURL error: ' . $curl_err, 'ErrorNo' => $curl_errno));
  exit;
}

// (11) 若 upstream 回傳非 2xx，將 upstream 的原始回應與狀態回傳（方便前端 debug）
if ($http_status < 200 || $http_status >= 300) {
  http_response_code(502);
  // 嘗試解析 upstream 回應為 JSON，若不是則以 raw string 包裝
  $up = json_decode($response, true);
  if ($up === null) {
    echo json_encode(array('Success' => false, 'ErrorMsg' => 'Upstream returned HTTP ' . $http_status, 'RawResponse' => $response));
  } else {
    // 若 upstream 自帶 Success 欄位，直接轉發
    echo json_encode($up);
  }
  exit;
}

// (12) 成功：直接把 upstream 的回應原封不動回傳（假設為 JSON）
echo $response;
exit;