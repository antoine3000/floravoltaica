import './index.css'
import Settings from './api/settings.json'
import Kits from './api/kits.json'
import Chart from 'chart.js/auto'
import Litepicker from 'litepicker'
import 'chartjs-adapter-moment'


const app = document.getElementById("app");
let kitMain, kitSecond, sensorSecond, dateStart, dateEnd;

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
  select.innerHTML = `<option value="">Select a sensor kit</option>`;
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
  let elem = document.createElement("article");
  elem.classList.add("kit");
  let elemTitle = document.createElement("h1");
  elemTitle.classList.add("kit__title");
  let elemIntro = document.createElement("section");
  elemIntro.classList.add("kit__intro");
  let elemData = document.createElement("section");
  elemData.classList.add("kit__data");
  let last_update = new Date(kit.last_reading_at);
  
  elemTitle.innerHTML = `${kitName(kit.name, kit.id)}`;
  elemIntro.innerHTML =`<p>${kitDescription(kit.id)}</p>`
  elem.appendChild(elemIntro);
  elemData.innerHTML =
  `
  <h2>Last data capture</h2>
  <h5>Received: <span>${last_update}</span></h5>
  `
  app.appendChild(elemTitle);
  elem.appendChild(elemData);
  app.appendChild(elem);
  // sensors
  for (let y in Settings.sensors) {
    for (let i in kit.data.sensors) {
      if (kit.data.sensors[i].id == Settings.sensors[y].id) {
        let sensor = kit.data.sensors[i];
        if (sensor.value != null) {
          let elemSensor = document.createElement("section");
          for (let ii in Settings.sensorsSelection) {
            if (kit.data.sensors[i].id == Settings.sensorsSelection[ii].id) {
              elemSensor.classList.add("kit__sensor", "selected");
            } else {
              elemSensor.classList.add("kit__sensor");
            }
          }
          elemSensor.innerHTML =
          `
          <span class="name">${sensorName(sensor.name, sensor.id)}</span>
          <span class="value">${roundUp(sensor.value, 1)}</span>
          <span class="unit">${sensor.unit}</span>
          `
          elemData.appendChild(elemSensor);
        }
      }
    }
  }
  let dataTitle = document.createElement("section");
  dataTitle.classList.add("data-title");
  dataTitle.id = "data-title";
  dataTitle.innerHTML =
  `
  <h1>Data visualization</h1>
  <label>Select a date range</label>
  `;
  app.appendChild(dataTitle);
  getDates(kit);
  displaySensorSections(kit);
}

function displaySensorSections(kit) {
  for (let i in Settings.sensorsSelection) {
    displaySensorSection(kit, Settings.sensorsSelection[i].id);
  }
}

function displaySensorSection(kit, sensorId) {
  let sectionId = kit.id + "_" + sensorId;
  if (document.getElementById(sectionId)) {
    document.getElementById(sectionId).remove();  
  }
  // section
  let sensorSection = document.createElement("section");
  sensorSection.id = sectionId;
  sensorSection.classList.add('sensor__section');
  app.appendChild(sensorSection);
  // info
  let infoSection = document.createElement("section");
  infoSection.classList.add('sensor__info');
  infoSection.innerHTML =
  `
  <h2>${sensorName(sensorId, sensorId)}</h2>
  <p>${sensorDescription(sensorId)}</p>
  `;
  sensorSection.appendChild(infoSection);
  // select second sensor
  let selectLabel = document.createElement("label");
  selectLabel.classList.add('select__label');
  selectLabel.innerHTML = `Select a sensor for comparison`;
  infoSection.appendChild(selectLabel);
  let selectSection = document.createElement("section");
  selectSection.classList.add('sensor__select');
  infoSection.appendChild(selectSection);
  let select = document.createElement("select");
  select.innerHTML = `<option value="">Select a sensor for comparison</option>`;

  for (let i in Kits) {
    let optgroup = document.createElement('optgroup');
    optgroup.label = Kits[i].name;
    select.appendChild(optgroup);
    let kitUrl = `https://api.smartcitizen.me/v0/devices/${Kits[i].id}`;
    // sublist
    https: fetch(kitUrl)
    .then((res) => {
      return res.json();
    })
    .then((kit) => {
      for (let y in kit.data.sensors) {
        let sensor = kit.data.sensors[y];
        if (sensor.value != null) {
          let opt = document.createElement('option');
          opt.value = Kits[i].id + '-' + sensor.id;
          opt.innerHTML = sensorName(sensor.name, sensor.id);
          optgroup.appendChild(opt);
        }
      }
    });
  }

  let chartSection = document.createElement("section");
  infoSection.appendChild(select);
  select.addEventListener('change', function(event) {
    let value = event.target.value;
    kitSecond = value.split('-')[0];
    sensorSecond = value.split('-')[1];
    initCharts(chartSection, sensorId);
  });
  
  chartSection.classList.add('sensor__chart');
  sensorSection.appendChild(chartSection);
  initCharts(chartSection, sensorId);
}

function initCharts(elemSelf, sensor1) {
  let rollup;
  let diff = dateDiff(new Date(dateStart), new Date(dateEnd));
  if (diff.day <= 7) {
    rollup = 1
  } else if (diff.day > 7 && diff.day <= 30) {
    rollup = 6
  } else if (diff.day > 30 && diff.day <= 90) {
    rollup = 12
  } else {
    rollup = 24
  }
  let sensorUrl1 = `https://api.smartcitizen.me/v0/devices/${kitMain}/readings?sensor_id=${sensor1}&rollup=${rollup}h&from=${dateStart}&to=${dateEnd}`;
  let sensorUrl2 = sensorSecond ? `https://api.smartcitizen.me/v0/devices/${kitSecond}/readings?sensor_id=${sensorSecond}&rollup=${rollup}h&from=${dateStart}&to=${dateEnd}` : sensorUrl1;
  // clean
  let prevSibling = elemSelf.previousElementSibling;
  let prevElem = prevSibling.querySelector('.sensor__info--second');
  if (prevElem) prevElem.parentNode.removeChild(prevElem);
  // get data
  Promise.all([
    fetch(sensorUrl1),
    fetch(sensorUrl2)
    ]).then(function (responses) {
      return Promise.all(responses.map(function (response) {
        return response.json();
      }));
    }).then(function (sensor) {
      displayChart(elemSelf, sensor[0], sensor[1]);
    }).catch(function (error) {
      console.log(error);
    });
  }

  function displayChart(elemSelf, sensor1, sensor2) {
  // dom structure
  if (elemSelf) elemSelf.innerHTML = '';
  if (sensor1.device_id != sensor2.device_id || sensor1.sensor_id != sensor2.sensor_id) {
    let sensorInfo = document.createElement("section");
    sensorInfo.classList.add('sensor__info--second');
    sensorInfo.innerHTML =
    `
    <h2>& ${sensorName(sensor2.sensor_id, sensor2.sensor_id)} (${kitName(sensor2.device_id, sensor2.device_id)})</h2>
    <p>${sensorDescription(sensor2.sensor_id)}</p>
    `;
    let prevSibling = elemSelf.previousElementSibling;
    prevSibling.appendChild(sensorInfo);
  }
  let chart = document.createElement("canvas");
  elemSelf.appendChild(chart);
  // sensor data
  let sensor1DataStruct = [];
  for (const reading of sensor1.readings) {
    let dataItem = {
      x: reading[0],
      y: reading[1],
    };
    sensor1DataStruct.push(dataItem);
  }
  sensor1DataStruct.reverse();
  let sensor2DataStruct = [];
  for (const reading of sensor2.readings) {
    let dataItem = {
      x: reading[0],
      y: reading[1],
    };
    sensor2DataStruct.push(dataItem);
  }
  sensor2DataStruct.reverse();
  // chart data
  let chartData;
  if (sensorSecond) {
    chartData = {
      datasets: [{
        label: sensorName(sensor1.sensor_key, sensor1.sensor_id),
        data: sensor1DataStruct,
        borderColor: sensorColor(sensor1.sensor_id),
        backgroundColor: sensorColor(sensor1.sensor_id),
        yAxisID: 'y',
      },
      {
        label: sensorName(sensor2.sensor_key, sensor2.sensor_id),
        data: sensor2DataStruct,
        borderColor: "#1D4ED8",
        backgroundColor: "#1D4ED8",
        yAxisID: 'y1',
      }]
    }
  } else {
    chartData = {
      datasets: [{
        label: sensorName(sensor1.sensor_key, sensor1.sensor_id),
        data: sensor1DataStruct,
        borderColor: sensorColor(sensor1.sensor_id),
        backgroundColor: sensorColor(sensor1.sensor_id),
        yAxisID: 'y',
      }]
    }
  }
  const myChart = new Chart(chart, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      stacked: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: sensorName(sensor1.sensor_key, sensor1.sensor_id) + ' (V)',
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',  
          title: {
            display: true,
            text: sensorName(sensor2.sensor_key, sensor2.sensor_id),
          },
        },
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        }
      }
    }
  });
}

function sensorName(name, id) {
  let nameNew = Settings.sensors.filter(function(elem){
    if (id == elem.id && elem.title.length > 0)  return elem.title
  });
  if (nameNew.length > 0) {
    return nameNew[0].title
  } else {
    return name
  }
}

function sensorDescription(id) {
  let descNew = Settings.sensors.filter(function(elem){
    if (id == elem.id && elem.desc.length > 0)  return elem.desc
  });
  return descNew[0].desc
}

function sensorColor(id) {
  let colorNew = Settings.sensorsSelection.filter(function(elem){
    if (id == elem.id && elem.color.length > 0)  return elem.color
  });
  return colorNew[0].color
}

function kitName(name, id) {
  let nameNew = Kits.filter(function(elem){
    if (id == elem.id && elem.name.length > 0)  return elem.name
  });
  if (nameNew.length > 0) {
    return nameNew[0].name
  } else {
    return name
  }
}

function kitDescription(id) {
  let descNew = Kits.filter(function(elem){
    if (id == elem.id && elem.desc.length > 0)  return elem.desc
  });
  return descNew[0].desc
}

function roundUp(num, precision) {
  precision = Math.pow(10, precision)
  return Math.ceil(num * precision) / precision
}

function getDates(kit) {
  // get date
  dateEnd = new Date(new Date().getTime());
  dateStart = new Date(new Date().getTime());
  dateStart.setDate(new Date().getDate() - 15);
  // format date
  dateStart = dateStart.toISOString().split('T')[0];
  dateEnd = dateEnd.toISOString().split('T')[0];
  // range picker
  let picker = document.createElement("input");
  picker.id = "datepicker";
  picker.type = "text";
  let dataTitle = document.getElementById("data-title");
  dataTitle.appendChild(picker);
  new Litepicker({
    element: picker,
    singleMode: false,
    autoApply: true,
    delimiter: " → ",
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
        kitSecond, sensorSecond = null;
        displaySensorSections(kit);
      });
    }
  });
}

function dateDiff(date1, date2){
  var diff = {}
  var tmp = date2 - date1;
  tmp = Math.floor(tmp/1000);
  diff.sec = tmp % 60;
  tmp = Math.floor((tmp-diff.sec)/60);
  diff.min = tmp % 60;
  tmp = Math.floor((tmp-diff.min)/60);
  diff.hour = tmp % 24;
  tmp = Math.floor((tmp-diff.hour)/24);
  diff.day = tmp;
  return diff;
}
