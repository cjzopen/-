// const evalCode = '20240618IPC001'; // 測試用
const evalCode = '20251114T001';
let jwtToken = '';
// evalData 可能會是 API 回傳的物件（含 normalQues 與 evalQues），
// 也可能直接是一個題目陣列。用物件初始化並用 helper 處理兼容性。
let evalData = {};
let customerID = null;

document.addEventListener('DOMContentLoaded', () => {
  getJwt().then(() => loadQuestions());
  document.getElementById('survey-form').addEventListener('submit', handleSubmit);
});

// 取得JWT
// async function getJwt() {
//   const res = await fetch(jwtApiUrl, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({})
//   });
//   const data = await res.json();
//   if (data.Success) jwtToken = data.Data;
// }
async function getJwt() {
  const res = await fetch('https://www.digiwin.com/tw/dsc/diagnosis/tariff/jwt_test.php', { method: 'POST' });
  const data = await res.json();
  // console.log(data);
  if (data.Success) jwtToken = data.Data;
}

// 取得問卷題目
async function loadQuestions() {
  const res = await fetch('https://aiep.digiwin.com/dae/api/Eval/GetEvalWebInfo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ EvalCode: evalCode })
  });
  const data = await res.json();
  if (data.Success) {
    // API 回傳在 Data 欄位，包含 normalQues 與 evalQues
    evalData = data.Data || data.data || data.evalQues || data || {};
    console.log('=== Debug: 取得問卷題目 ===', evalData);
    renderQuestions();
  }
}

// 渲染題目
function renderQuestions() {
  const container = document.getElementById('q-container');
  container.innerHTML = '';
  
  // 取得所有題目
  const evalQues = Array.isArray(evalData.evalQues) ? evalData.evalQues : [];
  const normalQues = Array.isArray(evalData.normalQues) ? evalData.normalQues : [];
  
  // 把所有題目依照 quesText 分組
  const questionsBySection = {};
  
  // 先處理 evalQues
  evalQues.forEach(q => {
    if (!q.quesText) return;
    if (!questionsBySection[q.quesText]) {
      questionsBySection[q.quesText] = [];
    }
    questionsBySection[q.quesText].push({...q, isEval: true});
  });
  
  // 再處理 normalQues
  normalQues.forEach(q => {
    if (!q.quesText) return;
    if (!questionsBySection[q.quesText]) {
      questionsBySection[q.quesText] = [];
    }
    questionsBySection[q.quesText].push({...q, isEval: false});
  });
  
  function numberToChinese(num) {
    if (typeof num !== 'number' || num < 1 || num > 99 || !Number.isInteger(num)) {
      return num.toString(); 
    }
    const chineseNums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const unit = '十';
    if (num < 10) {
      return chineseNums[num];
    } else if (num === 10) {
      return unit;
    } else if (num < 20) {
      // 11 到 19: 「十一」, 「十二」, ...
      return unit + chineseNums[num % 10];
    } else {
      // 20 到 99: 「二十」, 「二十一」, ...
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return chineseNums[tens] + unit + (ones !== 0 ? chineseNums[ones] : '');
    }
}
  // 依照分區渲染題目
  let globalIndex = 0;
  let sectionIndex = 1;
  Object.entries(questionsBySection).forEach(([sectionName, questions]) => {
    // 建立分區標題
    const sectionDiv = document.createElement('div');
    sectionDiv.classList.add('section', 'mb-4');
    sectionDiv.innerHTML = `<h3 class="section-title mb-3 bg-light p-2 rounded">${numberToChinese(sectionIndex)}、${sectionName}</h3>`;
    container.appendChild(sectionDiv);
    sectionIndex++;
    
    // 排序題目：evalQues 優先，然後依照 ID 排序
    questions.sort((a, b) => {
      if (a.isEval !== b.isEval) return a.isEval ? -1 : 1;
      return a.id - b.id;
    });
    
    // 渲染該分區的所有題目
    const questionsDiv = document.createElement('div');
    questionsDiv.classList.add('questions-group', 'ps-3');
    sectionDiv.appendChild(questionsDiv);

    questions.forEach(q => {
      const div = document.createElement('div');
      div.classList.add('q-item', 'mb-4');
      const type = q.quesType === "01" ? "radio" : "checkbox";
      const qId = q.ID ?? q.id;
      const opts = Array.isArray(q.options) ? q.options : [];

      div.innerHTML = `
        <div class="q-title">${globalIndex++}. ${q.quesTitle || ''}</div>
        ${q.quesTitleAdd ? `<div class="q-subtitle">${q.quesTitleAdd}</div>` : ''}
        ${opts.map(opt => {
          const optId = opt.id ?? opt.ID;
          const optValue = opt.optionValue ?? opt.OptionValue ?? '';
          const optText = opt.optionText ?? opt.OptionText ?? '';
          const firstItem = Array.isArray(opt.optionItems) && opt.optionItems.length ? opt.optionItems[0] : null;
          const itemAttrs = firstItem ? `data-item-id="${firstItem.id ?? firstItem.ID}" data-item-value="${firstItem.itemValue ?? firstItem.ItemValue}" data-item-text="${firstItem.itemText ?? firstItem.ItemText}"` : '';
          return `
            <div class="form-check q-option">
              <input class="form-check-input" type="${type}" id="q${globalIndex}-${firstItem.itemValue ?? firstItem.ItemValue}" name="q${qId}" value="${optId}" data-option-value="${optValue}" data-option-text="${optText}" ${itemAttrs}>
              <label class="form-check-label" for="q${globalIndex}-${firstItem.itemValue ?? firstItem.ItemValue}">
                ${optText}
              </label>
            </div>
          `;
        }).join('')}
      `;
      questionsDiv.appendChild(div);
    });
  });
}

// 回傳一個「題目陣列」，自動處理 evalData 可能的不同結構
function getAllQuestions() {
  if (Array.isArray(evalData)) return evalData;
  const normal = Array.isArray(evalData.normalQues) ? evalData.normalQues : [];
  const evalq = Array.isArray(evalData.evalQues) ? evalData.evalQues : [];
  // 如果兩者都空，檢查是否 API 把題目放在其他欄位（如 data 或 Data）
  if (!normal.length && !evalq.length) {
    const candidate = evalData.data || evalData.Data || evalData.evalQues || evalData;
    if (Array.isArray(candidate)) return candidate;
  }
  return [...normal, ...evalq];
}

// 取得使用者在「行業別」題目的選項文字（optionText），用於 InsertEvalCustomerInfo 的 IndustrialClass
function getSelectedIndustryText() {
  try {
    // 暫時沒值
    return '暫時沒值';
  } catch (e) {
    return undefined;
  }
}


// 根據題型更新答案列表
function updateAnswerList(list, type, answer) {
  let index = -1;
  
  // 根據題型決定如何找尋已存在的答案
  switch(type) {
    case '01':  // 單選：同一題目只保留一個答案
    case 'radio':
      index = list.findIndex(item => item.quesID === answer.quesID);
      break;
    case '02':  // 多選：同一題目可以有多個答案，但相同選項要更新
    case '03':  // 需要同時比對題目和選項
      index = list.findIndex(item => 
        item.quesID === answer.quesID && 
        item.ansOptionID === answer.ansOptionID
      );
      break;
  }

  // 如果找到已存在的答案就更新，否則新增
  if (index !== -1) {
    list[index] = answer;
  } else {
    list.push(answer);
  }
  return list;
}

// 送出資料
async function handleSubmit(e) {
  e.preventDefault();
    const ansList = [];
  const allQues = getAllQuestions();
  
  console.log('=== Debug: 所有題目 ===', allQues);
  
  allQues.forEach((q, index) => {
    console.log(`\n=== 處理第 ${index + 1} 題 ===`);
    console.log('題目資訊:', { 
      quesTitle: q.quesTitle,
      id: q.id, 
      ID: q.ID, 
      quesType: q.quesType,
      options: q.options
    });
    
    const qId = q.id ?? q.ID;
    const type = q.quesType;
    const inputs = document.getElementsByName('q' + qId);
    
    console.log(`找到的 input 元素數量: ${inputs.length}`);
    
    const checkedInputs = Array.from(inputs).filter(inp => inp.checked);
    console.log(`已勾選的選項數量: ${checkedInputs.length}`);
    
    if (checkedInputs.length === 0) {
      console.log(`警告：第 ${index + 1} 題 (ID: ${qId}) 沒有勾選任何選項`);
      return;  // 跳過未勾選的題目
    }
    
      // 處理每個勾選的選項
      checkedInputs.forEach(inp => {
        // 檢查必要欄位
        if (!qId || !inp.value) {
          console.error(`跳過無效選項：題目ID=${qId}, 選項ID=${inp.value}`);
          return;
        }

        const answer = {
          QuesID: Number(qId),
          AnsOptionID: Number(inp.value),
          Value: inp.dataset.optionValue ? Number(inp.dataset.optionValue) : undefined
        };

        // 如果有 itemId，加入 AnsOptionItemID
        if (inp.dataset.itemId) {
          answer.AnsOptionItemID = Number(inp.dataset.itemId);
        }

        // 如果有 itemValue，優先使用它作為 Value
        if (inp.dataset.itemValue) {
          answer.Value = Number(inp.dataset.itemValue);
        }

        // 處理文字欄位
        if (inp.dataset.itemText) {
          answer.Text = inp.dataset.itemText;
        } else if (inp.dataset.optionText) {
          answer.Text = inp.dataset.optionText;
        }

        // 移除所有 undefined 值的屬性
        Object.keys(answer).forEach(key => 
          answer[key] === undefined && delete answer[key]
        );

        console.log(`題目 ${qId} 加入答案:`, answer);
        ansList.push(answer);
      });
  });

  // 假設先送客戶資訊
  const custRes = await fetch('https://aiep.digiwin.com/dae/api/Eval/InsertEvalCustomerInfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
    body: JSON.stringify({
      EvalCode: evalCode,
      Name: '測試',
      Job: 'PM',
      JobClass: '技術',
      Company: '公司',
      Email: 'hongchechen@digiwin.com',
      Phone: '0912345678',
      // 嘗試從題目中找出行業別題目的選項文字，並放進 IndustrialClass
      IndustrialClass: getSelectedIndustryText()
    })
  });
  const custData = await custRes.json();
  if (!custData.Success) return Swal.fire('錯誤', `${custData.ErrorMsg}  新增客戶失敗`, 'error');
  customerID = custData.Data.customerID;

  // 送答題結果
  const payload = {
    EvalCode: evalCode,
    CustomerID: Number(customerID),
    AnsList: ansList.map(ans => {
      const mapped = {
        QuesID: Number(ans.QuesID),
        AnsOptionID: Number(ans.AnsOptionID)
      };
      
      if (ans.AnsOptionItemID) {
        mapped.AnsOptionItemID = Number(ans.AnsOptionItemID);
      }
      
      if (ans.Value !== undefined) {
        mapped.Value = Number(ans.Value);
      }
      
      // 只有在有 itemText 時才加入 Text 欄位
      if (ans.itemText) {
        mapped.Text = String(ans.itemText);
      }
      
      return mapped;
    })
  };
  
  // 過濾掉無效答案並確保所有必填題目都有答案
  payload.AnsList = payload.AnsList.filter(ans => 
    ans.QuesID != null && 
    ans.AnsOptionID != null && 
    !isNaN(ans.QuesID) && 
    !isNaN(ans.AnsOptionID)
  );
  
  // 檢查必填題目是否都有答案
  const normalQues = Array.isArray(evalData.normalQues) ? evalData.normalQues : [];
  const requiredQuesIds = normalQues.map(q => q.id || q.ID);  // 假設一般題目都是必填
  const hasAllRequired = requiredQuesIds.every(qid => 
    payload.AnsList.some(ans => Number(ans.QuesID) === Number(qid))
  );
  
  if (!hasAllRequired) {
    // return Swal.fire('錯誤', '尚有必填題目未作答，請檢查後再送出', 'error');
  }
//   const payload = {
//   "CustomerID": 345,
//   "EvalCode": "20240331IPC001",
//   "AnsList": [
//     {
//       "QuesID": 7,
//       "AnsOptionID": 26,
//       "Value": 2
//     },
//     {
//       "QuesID": 8,
//       "AnsOptionID": 30,
//       "Value": 3
//     },
//     {
//       "QuesID": 5,
//       "AnsOptionID": 18,
//       "AnsOptionItemID": 57,
//       "Value": 2,
//       "Text": "7.50%"
//     },
//     {
//       "QuesID": 5,
//       "AnsOptionID": 19,
//       "AnsOptionItemID": 63,
//       "Value": 1,
//       "Text": "4.9%"
//     },
//     {
//       "QuesID": 5,
//       "AnsOptionID": 20,
//       "AnsOptionItemID": 68,
//       "Value": 1,
//       "Text": "9.1%"
//     },
//     {
//       "QuesID": 6,
//       "AnsOptionID": 22,
//       "AnsOptionItemID": 70,
//       "Value": 2
//     }
//   ]
// };
  
  // Debug: 檢查送出的資料結構
  console.log('InsertEvalReport payload:', JSON.stringify(payload, null, 2));
  console.log('Original questions:', allQues);
  
  const repRes = await fetch('https://aiep.digiwin.com/dae/api/Eval/InsertEvalReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
    body: JSON.stringify(payload)
  });
  const repData = await repRes.json();
  
  // Debug: 檢查回應
  console.log('InsertEvalReport response:', repData);
  
  if (!repData.Success) {
    console.error('InsertEvalReport error:', { 
      ErrorCode: repData.ErrorCode,
      ErrorMsg: repData.ErrorMsg,
      payload 
    });
    return Swal.fire('錯誤', `${repData.ErrorMsg} (${repData.ErrorCode}) 送出答案失敗`, 'error');
  }

  // 寄送信件
  const SendEvalMailPayload = {
    EvalCode: evalCode,
    CustomerID: Number(customerID)
  };
  console.log('SendEvalMail payload:', SendEvalMailPayload);
  const mailRes = await fetch('https://aiep.digiwin.com/dae/api/Eval/SendEvalMail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` },
    body: JSON.stringify(SendEvalMailPayload)
  });
  const mailData = await mailRes.json();
  console.log('SendEvalMail response:', mailData);
  // if (!mailData.Success) {
  //   return Swal.fire('錯誤', `${mailData.ErrorMsg} 寄送信件失敗`, 'error');
  // }
  
  // DES 加密所需的 key 與 iv
  const key = CryptoJS.enc.Utf8.parse('yek0527k');
  const iv = CryptoJS.enc.Utf8.parse('dSC2019v');

    // 加密 EvalCode 與 CustomerID，並做 URL 編碼，提供結果頁連結
    const encryptedEvalCodeStr = CryptoJS.DES.encrypt(String(evalCode), key, { iv: iv }).toString();
    const encryptedCustomerIDStr = CryptoJS.DES.encrypt(String(customerID), key, { iv: iv }).toString();
    const eEval = encodeURIComponent(encryptedEvalCodeStr);
    const eCust = encodeURIComponent(encryptedCustomerIDStr);

    const ReportLinks = `result.html?EvalCode=${eEval}&CustomerID=${eCust}`;
    console.log('ReportLinks:', ReportLinks);

    Swal.fire({
      title: '完成',
      icon: 'success',
      html: `<p>${mailData.Data?.message || '問卷已送出，請檢查信箱'}</p>
             <p><a href="${ReportLinks}" class="btn btn-primary">立即查看分析結果</a></p>`,
      showConfirmButton: false, 
      showCloseButton: false,
      focusConfirm: false,
      allowOutsideClick: false, 
      allowEscapeKey: false,
      // confirmButtonText: '關閉'
    });
  // } catch (err) {
    // console.error('加密或顯示結果頁連結時發生錯誤：', err);
    // 若加密失敗，仍顯示基本成功訊息
    // Swal.fire('完成', mailData.Data?.message || '問卷已送出，請檢查信箱', 'success');
  // }
}
