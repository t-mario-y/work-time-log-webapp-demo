//勤怠時間を携帯webからログ取れるアプリを作る
//画面切り替えは特にrouterは使わない。
//昼休み時間(1hで計算)
const REST_SECONDS = 3600;

const vm = new Vue({
  components: {
    vuejsDatepicker
  },
  data: {
    currentPage: "list",
    workObjList: [], //データの格納場所。宣言時は空
    updateRecord: {
      //作成/更新レコード
      id: null,
      date: null,
      startTime: null,
      endTime: null,
      workingTime: null
    },
    updateMode: "insert"
  },
  watch: {
    "updateRecord.startTime": function() {
      this.calcWorkTime();
    },
    "updateRecord.endTime": function() {
      this.calcWorkTime();
    }
  },
  computed: {},
  filters: {
    //時間長をHH:mmに変換(スクラッチ)
    showDuration: function(seconds) {
      let hour = Math.floor(seconds / 3600);
      let minutes = Math.floor(seconds / 60) % 60;
      //hourを0埋め
      if (hour < 10) {
        hour = `0${hour}`;
      }
      if (minutes < 10) {
        minutes = `0${minutes}`;
      }
      return `${hour}h ${minutes}min`;
    }
  },
  created: function() {
    this.select();
  },
  mounted: function() {
    this.adjustDatePicker();
  },
  methods: {
    adjustDatePicker() {
      //TODO 悪い実装(コンポーネントに実装すべき)
      const target = document.getElementById("samplePicker");
      if (target == null) {
        return;
      }
      target.classList.add("input");
      target.style.width = "150px";
    },
    startInsert() {
      this.initUpdateRecord();
      this.updateMode = "insert";
      this.transPage("edit");
    },
    startUpdate(targetObj) {
      this.updateRecord.id = targetObj.id;
      this.updateRecord.date = targetObj.date;
      this.updateRecord.startTime = targetObj.startTime;
      this.updateRecord.endTime = targetObj.endTime;
      this.calcWorkTime();
      this.updateMode = "update";
      this.transPage("edit");
    },
    //ページ遷移
    transPage(pageKind) {
      //TODO 悪い実装(JSがanimationに関与している)
      if (this.currentPage === "list") {
        document.getElementById("listPage").style.display = "none";
      }
      if (this.currentPage === "edit") {
        document.getElementById("editPage").style.display = "none";
      }
      this.currentPage = pageKind;
    },
    //日付表示
    customFormatter(date) {
      //moment.jsでフォーマットする
      return moment(date).format("YYYY/MM/DD");
    },
    //更新レコードの初期化
    initUpdateRecord() {
      this.updateRecord.date = moment(new Date()).format("YYYY/MM/DD");
      this.updateRecord.startTime = "09:00";
      this.updateRecord.endTime = "17:30";
      this.calcWorkTime();
    },
    //開始時間/終了時間から勤務時間を算出してセットする
    calcWorkTime() {
      let _start = moment(this.updateRecord.startTime, "HH:mm");
      let _end = moment(this.updateRecord.endTime, "HH:mm");
      this.updateRecord.workingTime =
        _end.diff(_start, "seconds") - REST_SECONDS;
    },
    //Web APIへのアクセス
    select() {
      const tenDaysBefore = moment(new Date())
        .add(-10, "day")
        .format("YYYY-MM-DD");
      axios
        .get(AIRTABLE_API_URI, {
          headers: {
            Authorization: `Bearer ${AIRTABLE_API_KEY}`
          },
          params: {
            maxRecords: 100,
            view: "Grid view",
            filterByFormula: `IS_AFTER(date , '${tenDaysBefore}')`
          }
        })
        .then(response => {
          //devTool上での確認用 console.log(response.data.records);
          console.log(`data fetched successfully.`);
          //vm.$data.workObjList の形式に変換して代入する
          const tmpArray = [];
          response.data.records.forEach(function(record) {
            let tmp = {
              id: record.id,
              date: record.fields.date,
              startTime: record.fields.startTime,
              endTime: record.fields.endTime,
              workingTime: record.fields.workingTime
            };
            tmpArray.push(tmp);
          });
          this.workObjList = tmpArray;
        })
        .catch(error => {
          console.log(error);
        });
    },
    executeInsert() {
      const target = this.updateRecord;
      axios
        .post(
          AIRTABLE_API_URI,
          //第2引数:登録データ
          {
            fields: {
              date: moment(target.date).format("YYYY/MM/DD"),
              startTime: target.startTime,
              endTime: target.endTime,
              workingTime: target.workingTime
            }
          },
          //第3引数:付加情報(headers等)
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        )
        .then(response => {
          console.log(`Insert succeeded in Vue.js : ${response.data.id}`);
          //再表示
          this.select();
          this.transPage("list");
        })
        .catch(error => {
          console.log(error);
        });
    },
    executeUpdate() {
      const target = this.updateRecord;
      axios
        .patch(
          //リクエストURL(末尾に更新レコードのidが付く)
          AIRTABLE_API_URI + `/${target.id}`,
          //第2引数:更新データ
          {
            fields: {
              date: target.date,
              startTime: target.startTime,
              endTime: target.endTime,
              workingTime: target.workingTime
            }
          },
          //第3引数:付加情報(headers等)
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        )
        .then(response => {
          console.log(`Update succeeded in Vue.js : ${response.data.id}`);
          //再表示
          this.select();
          this.transPage("list");
        })
        .catch(error => {
          console.log(error);
        });
    },
    executeDelete() {
      const target = this.updateRecord;
      axios
        .delete(
          //リクエストURL(末尾に更新レコードのidが付く)
          AIRTABLE_API_URI + `/${target.id}`,
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`
            }
          }
        )
        .then(response => {
          console.log(`Delete succeeded in Vue.js : ${response.data.id}`);
          //再表示
          this.select();
          this.transPage("list");
        })
        .catch(error => {
          console.log(error);
        });
    }
  }
}).$mount("#myApp");
