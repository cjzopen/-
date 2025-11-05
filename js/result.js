const urlParams = new URLSearchParams(window.location.search);
const evalCode = urlParams.get('EvalCode') || "20240618IPC001";
const customerID = urlParams.get('CustomerID');

if(!customerID) {
  Swal.fire('缺少參數', '未提供必要參數', 'warning');
}

async function getJWT() {
  const apiKey = "629b0437-e722-43bf-8c77-85fgh78912342a";
  const res = await fetch('https://aiep.digiwin.com/dae/api/apilogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: "dae", apiKey })
  });
  const data = await res.json();
  if(data.Success) return data.Data;
  else throw new Error("JWT 取得失敗");
}

async function sendEvalMail() {
  const token = await getJWT();
  const payload = { EvalCode: evalCode, CustomerID: parseInt(customerID) };
  const res = await fetch('https://aiep.digiwin.com/dae/api/Eval/SendEvalMail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const result = await res.json();
  if(result.Success) Swal.fire('成功', result.Data.message, 'success');
  else Swal.fire('錯誤', result.ErrorMsg || '讀取失敗', 'error');
}

// 測試假資料，實際可改為 API 回傳結果
const chartData = {
  labels: ["L1","L2","L3","L4","L5"],
  datasets: [{
    label: "選項數量",
    data: [1,2,3,4,5],
    backgroundColor: "#005bbb"
  }]
};

window.addEventListener('load', () => {
  const ctx = document.getElementById('resultChart').getContext('2d');
  new Chart(ctx, { type: 'bar', data: chartData, options: { responsive:true } });
  const ul = document.getElementById('optionList');
  const options = ["大幅下滑","下滑","沒變","上升","大幅上升"];
  options.forEach((opt,i) => {
    const li = document.createElement('li');
    li.textContent = `L${i+1}: ${opt}`;
    ul.appendChild(li);
  });
  if(customerID) sendEvalMail();
});
