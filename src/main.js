import './index.css'
import settings from './api/settings.json'
import kits from './api/kits.json'

window.onload = function () {
  select();
};

function select() {
  // select
  let select = document.getElementById('select');
  if (select) select.addEventListener('change', function(event) {
    getKit(event.target.value)
  });
  for (let i in kits) {
    let opt = document.createElement('option');
    opt.value = kits[i].id;
    opt.innerHTML = kits[i].name;
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
  const app = document.getElementById("app");
  app.innerHTML = "";
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
}
