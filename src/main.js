import './index.css'
import Settings from './api/settings.json'
import Kits from './api/kits.json'
import Chart from 'chart.js/auto'
import Litepicker from 'litepicker'


const app = document.getElementById("app");
let kitMain, dateStart, dateEnd;

window.onload = function () {
  select();
};

function select() {
  // select
  let select = document.getElementById('select');
  if (select) select.addEventListener('change', function(event) {
    kitMain = event.target.value;
    getKit(kitMain)
  });
  select.innerHTML = `<option value="">Please select a sensor kit</option>`;
  for (let i in Kits) {
    let opt = document.createElement('option');
    opt.value = Kits[i].id;
    opt.innerHTML = Kits[i].name;
    select.appendChild(opt);
  }
}

function getKit(id) {
  const kitUrl = `https://api.smartcitizen.me/v0/devices/${id}`;
  https: fetch(kitUrl)
  .then((res) => {
    return res.json();
  })
  .then((kit) => {
    displayKit(kit);
  });
}

function displayKit(kit) {
  app.innerHTML = "";
  // sensors
  for (let i in kit.data.sensors) {
    let sensor = kit.data.sensors[i];
    if (sensor.value != null) {
      let elem = document.createElement("article");
      elem.classList.add("kit");
      elem.innerHTML =
      `
      <span class="name">${sensor.name}</span>
      <span class="value">${sensor.value}</span>
      <span class="unit">${sensor.unit}</span>
      `
      app.appendChild(elem);
    }
  }
  let title = document.createElement("h1");
  title.innerHTML = `Selection`;
  app.appendChild(title);
  getDates();
  initCharts();  
}

function initCharts() {
  const canvas = document.querySelectorAll('canvas');
  for (var i = 0; i < canvas.length; i++) {
    canvas[i].remove()
  }
  for (let i in Settings.sensorsSelection) {
    let sensor = Settings.sensorsSelection[i];
    const sensorUrl1 = `https://api.smartcitizen.me/v0/devices/${kitMain}/readings?sensor_id=${sensor}&rollup=4h&from=${dateStart}&to=${dateEnd}`;
    const sensorUrl2 = `https://api.smartcitizen.me/v0/devices/${kitMain}/readings?sensor_id=50&rollup=4h&from=${dateStart}&to=${dateEnd}`;
    Promise.all([
      fetch(sensorUrl1),
      fetch(sensorUrl2)
    ]).then(function (responses) {
      return Promise.all(responses.map(function (response) {
        return response.json();
      }));
    }).then(function (sensor) {
      displayChart(sensor[0], sensor[1]);
    }).catch(function (error) {
      console.log(error);
    });
  }
}

function getDates() {
  // get date
  dateEnd = new Date(new Date().getTime());
  dateStart = new Date(new Date().getTime());
  dateStart.setDate(new Date().getDate() - 10);
  // format date
  dateStart = dateStart.toISOString().split('T')[0];
  dateEnd = dateEnd.toISOString().split('T')[0];
  // range picker
  let picker = document.createElement("input");
  picker.id = "datepicker";
  picker.type = "text";
  app.appendChild(picker);
  new Litepicker({
    element: picker,
    singleMode: false,
    startDate: dateStart,
    endDate: dateEnd,
    tooltipText: {
      one: 'day',
      other: 'days'
    },
    tooltipNumber: (totalDays) => {
      return totalDays - 1;
    },
    setup: (picker) => {
      picker.on('selected', (date1, date2) => {
        dateStart = date1.dateInstance.toISOString().split('T')[0];
        dateEnd = date2.dateInstance.toISOString().split('T')[0];
        initCharts();
      });
    }
  });
}


function displayChart(sensor1, sensor2) {
  let sensor1DataStruct = [];
  let sensor2DataStruct = [];
  for (const reading of sensor1.readings) {
    let dataItem = {
      x: reading[0],
      y: reading[1],
    };
    sensor1DataStruct.push(dataItem);
  }
  sensor1DataStruct.reverse();
  for (const reading of sensor2.readings) {
    let dataItem = {
      x: reading[0],
      y: reading[1],
    };
    sensor2DataStruct.push(dataItem);
  }
  sensor2DataStruct.reverse();
  let chart = document.createElement("canvas");
  app.appendChild(chart);
  const myChart = new Chart(chart, {
    type: 'line',
    data: {
      datasets: [{
        label: sensor1.sensor_key,
        data: sensor1DataStruct,
        borderColor: "rgba(255, 0, 0, 1)",
        backgroundColor: "rgba(255, 0, 0, 0.3)"
      },{
        label: sensor2.sensor_key,
        data: sensor2DataStruct,
        borderColor: "rgba(0, 0, 255, 1)",
        backgroundColor: "rgba(0, 0, 255, 0.3)"
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}
