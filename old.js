AnsList: [],
updateOrAddAnswer(state, { type, answer }) {
      let index = -1;
      if (type === '03') {
        // 如果是03类型，查找QuesID和AnsOptionID都匹配的元素
        index = state.AnsList.findIndex(
          (item) => item.QuesID === answer.QuesID && item.AnsOptionID === answer.AnsOptionID,
        );
      } else if (type === '01') {
        // 如果是01类型，只查找QuesID匹配的元素
        index = state.AnsList.findIndex((item) => item.QuesID === answer.QuesID);
      } else if (type === '02') {
        // 如果是01类型，只查找QuesID匹配的元素
        index = state.AnsList.findIndex(
          (item) => item.QuesID === answer.QuesID && item.AnsOptionID === answer.AnsOptionID,
        );
      } else if (type === 'radio') {
        index = state.AnsList.findIndex((item) => item.QuesID === answer.QuesID);
      }

      if (index !== -1) {
        // 如果找到了匹配的元素，就在原位置更新
        state.AnsList.splice(index, 1, answer);
      } else {
        // 如果没有找到匹配的元素，就添加新元素
        state.AnsList.push(answer);
      }
    },
mutations: {
    updateApiToken(state, token) {
      state.apitoken = token;
    },
    setData(state, payload) {
      console.log(payload);
      state.industryval = Array(payload.Data.evalQues.length).fill(null);
    },
    updateOrAddAnswer(state, { type, answer }) {
      let index = -1;
      if (type === '03') {
        // 如果是03类型，查找QuesID和AnsOptionID都匹配的元素
        index = state.AnsList.findIndex(
          (item) => item.QuesID === answer.QuesID && item.AnsOptionID === answer.AnsOptionID,
        );
      } else if (type === '01') {
        // 如果是01类型，只查找QuesID匹配的元素
        index = state.AnsList.findIndex((item) => item.QuesID === answer.QuesID);
      } else if (type === '02') {
        // 如果是01类型，只查找QuesID匹配的元素
        index = state.AnsList.findIndex(
          (item) => item.QuesID === answer.QuesID && item.AnsOptionID === answer.AnsOptionID,
        );
      } else if (type === 'radio') {
        index = state.AnsList.findIndex((item) => item.QuesID === answer.QuesID);
      }

      if (index !== -1) {
        // 如果找到了匹配的元素，就在原位置更新
        state.AnsList.splice(index, 1, answer);
      } else {
        // 如果没有找到匹配的元素，就添加新元素
        state.AnsList.push(answer);
      }
    },
    removeAnswer(state, { QuesID, AnsOptionID }) {
      const index = state.AnsList.findIndex(
        (item) => item.QuesID === QuesID && item.AnsOptionID === AnsOptionID,
      );
      if (index !== -1) {
        state.AnsList.splice(index, 1);
      }
    },
  },

  const hasExcludedIds = this.$store.state.InList.every((id) =>
        this.$store.state.AnsList.some((item) => item.QuesID === id),
      );

axios({
            method: 'post',
            url: 'https://aiep.digiwin.com/dae/api/Eval/InsertEvalReport',
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              Authorization: `Bearer ${this.$store.state.apitoken}`,
            },
            data: {
              CustomerID: res.data.Data.customerID,
              EvalCode: this.$store.state.EvalCode,
              AnsList: this.$store.state.AnsList,
            },
          })