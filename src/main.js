import './index.css'
import Settings from './api/settings.json'
import Kits from './api/kits.json'
import Chart from 'chart.js/auto';

const app = document.getElementById("app");
let mainKit, dateStart, dateEnd;

window.onload = function () {
  select();
  getDates();
};

function select() {
  // select
  let select = document.getElementById('select');
  if (select) select.addEventListener('change', function(event) {
    mainKit = event.target.value;
    getKit(mainKit)
  });
  for (let i in Kits) {
    let opt = document.createElement('option');
    opt.value = Kits[i].id;
    opt.innerHTML = Kits[i].name;
    select.appendChild(opt);
  }
}

function getDates() {
  // get date
  dateEnd = new Date(new Date().getTime());
  dateStart = new Date(new Date().getTime());
  dateStart.setDate(new Date().getDate() - 7);
  // format date
  dateStart = dateStart.toISOString().split('T')[0];
  dateEnd = dateEnd.toISOString().split('T')[0];
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
  // chart
  for (let i in Settings.sensorsSelection) {
    let sensor = Settings.sensorsSelection[i];
    const sensorUrl = `https://api.smartcitizen.me/v0/devices/${mainKit}/readings?sensor_id=${sensor}&rollup=4h&from=${dateStart}&to=${dateEnd}`;
    https: fetch(sensorUrl)
    .then((res) => {
      return res.json();
    })
    .then((sensor) => {
      displayChart(sensor);
    });
  }
}

function displayChart(sensor) {
  let dataStruct = [];
  for (const reading of sensor.readings) {
    let dataItem = {
      x: reading[0],
      y: reading[1],
    };
    dataStruct.push(dataItem);
  }
  let chart = document.createElement("canvas");
  app.appendChild(chart);
  const myChart = new Chart(chart, {
    type: 'bar',
    data: {
      datasets: [{
        label: '# of Votes',
        data: dataStruct,
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
