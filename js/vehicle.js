/* ================= GLOBAL ================= */
let CURRENT_VEHICLE_TYPE = "fuel";
let CURRENT_SUMMARY = null;
let ENERGY_SUBMITTING = false;
let LAST_ENERGY_HASH = null;

const FUEL_STATIONS_TH = ["PTT", "Bangchak", "Shell", "Caltex", "PT", "Susco"];
const EV_STATIONS_TH = [
  "PTT EV Station",
  "PEA VOLTA",
  "MEA EV",
  "Elex by EGAT",
  "iGreen+",
  "Altervim",
  "EA Anywhere",
  "EVolt",
  "ChargeNow",
  "Tesla Supercharger",
  "IONITY",
];

/* ================= VEHICLE PAGE ================= */
async function initVehiclePage() {
  const vid = new URLSearchParams(location.search).get("vid");
  if (!vid) return;

  const json = await apiFetch(`${GAS_URL}?action=vehicles&uid=${USER_ID}`);
  if (!json?.vehicles) return;

  const dropdown = document.getElementById("carDropdown");
  dropdown.innerHTML = "";

  json.vehicles.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.vid;
    opt.textContent = v.name;
    if (v.vid === vid) opt.selected = true;
    dropdown.appendChild(opt);
  });

  dropdown.onchange = (e) =>
    (location.href = `vehicle.html?vid=${e.target.value}`);
  loadVehicleDetail(vid);
}

function switchCar(vid) {
  window.location.href = `vehicle.html?vid=${vid}`;
}

function renderEnergyBar(logs) {
  const bar = document.getElementById("energyBar");
  if (!bar || !logs?.length) return;

  bar.innerHTML = "";

  const map = {};
  logs.forEach((l) => {
    const key = l.sub_type || l.type;
    map[key] = (map[key] || 0) + Number(l.amount);
  });

  const total = Object.values(map).reduce((a, b) => a + b, 0);
  if (!total) return;

  Object.entries(map).forEach(([k, v]) => {
    const div = document.createElement("div");
    div.className = `bar ${k.toLowerCase()}`;
    div.style.width = `${(v / total) * 100}%`;
    div.textContent = Math.round((v / total) * 100) + "%";
    bar.appendChild(div);
  });
}

//document.addEventListener('DOMContentLoaded', initVehiclePage);
async function loadVehicleDetail(vid) {
  const res = await apiFetch(`
    ${GAS_URL}?action=vehicle_detail_full&vid=${vid}`
  );
  if (!res) return;
  const { vehicle, summary, logs } = res;
  
  CURRENT_VEHICLE_TYPE = vehicle.type === "EV" ? "ev" : "fuel";
  CURRENT_SUMMARY = summary;
  
  vehicleImage.src = vehicle.imgId
    ? `https://drive.google.com/thumbnail?id=${vehicle.imgId}&sz=w800`
    : "";

  vehicleTitle.innerText = `${vehicle.brand} ${vehicle.model}`;
  lastOdo.innerText = summary.last_odometer + " km";
  totalCost.innerText = summary.total_cost + " ฿";

  const distance = summary.last_odometer - vehicle.initial_odo;
  totalDistance.innerText = distance + " km";
//   energyCount.innerText = s.length;
  energyCount.innerText = (summary.sum_qty).toFixed(2) + " " + (vehicle.type === "EV" ? "kWh" : "Liter");
  avgCost.innerText =
    distance > 0 ? (summary.total_cost / distance).toFixed(2) + " ฿" : "-";

  fuelList.innerHTML = logs.slice(0, 5).map((l) => `
    <div class="fuel-item">
      ${l.type} • ${l.amount} ${l.unit} • ฿${l.cost}
    </div>
  `,).join("");

  renderEnergyBar(logs);
}

//---------------------------- Energy FAB Sheet ---------------------------//
function openEnergySheet(type) {
  const sheet = document.getElementById("energySheet");
  if (!sheet) return;

  sheet.classList.remove("hidden");
  requestAnimationFrame(() => {
    sheet.classList.add("show");
    applyEnergyTypeUI(type);
    autoSetDate();
  });
//   applyEnergyTypeUI(type);
//   autoSetDate();

//   sheet.classList.remove("hidden");
//   requestAnimationFrame(() => sheet.classList.add("show"));
}

function closeEnergySheet() {
  const sheet = document.getElementById("energySheet");
  if (!sheet) return;
  sheet.classList.remove("show");
  setTimeout(() => {
    sheet.classList.add("hidden");
    resetEnergyForm();
    ENERGY_SUBMITTING = false;
    LAST_ENERGY_HASH = null;
  }, 300);
}

/* ===== SHOW / HIDE ตามประเภทรถ ===== */
function applyEnergyTypeUI(type) {
  const etype = document.getElementById("e_etype");
  const ftype = document.getElementById("e_ftype");
  const unitLabel = document.getElementById("e_unit_label");
  const station = document.getElementById("e_station_name");
  const eTypeInput = document.getElementById("e_type");

  if (!etype || !ftype || !unitLabel || !station || !eTypeInput) return;
  station.innerHTML = `<option value="">เลือกสถานี</option>`;
  const list = type === "ev" ? EV_STATIONS_TH : FUEL_STATIONS_TH;
  list.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    station.appendChild(opt);
  });
  if (type === "ev") {
    etype.style.display = "block";
    ftype.style.display = "none";
    unitLabel.innerText = "kWh";
    eTypeInput.value = "ev";
  } else {
    etype.style.display = "none";
    ftype.style.display = "block";
    unitLabel.innerText = "Liter";
    eTypeInput.value = "fuel";
  }
}

function calcTotal() {
  const qty = Number(document.getElementById("e_qty")?.value || 0);
  const price = Number(document.getElementById("e_price_per_unit")?.value || 0);
  const total = qty * price;
  const label = document.getElementById("e_total_price_label");
  if (label) label.innerText = total.toFixed(2) + " ฿";
}

/* ===== วันที่ปัจจุบัน ===== */
function autoSetDate() {
  //   const now = new Date();
  //   const iso = now.toISOString().slice(0, 16);
  //   e_date.value = getLocalDatetimeValue();
  //   e_createdAt.value = now.toISOString();
  const el = document.getElementById("e_date");
  if (el) el.value = getLocalDatetimeValue();
}

/* ===== Submit (ตัวอย่าง) ===== */
async function submitEnergy() {
  if (ENERGY_SUBMITTING) return;

  if (!validateOdometer(CURRENT_SUMMARY.last_odometer)) return;

  const payload = {
    action: "add_energy_log",
    uid: USER_ID,
    vid: new URLSearchParams(location.search).get("vid"),
    energy_type: e_type.value,
    fuel_type: e_type.value==='ev'?'':e_ftype.value,
    charge_type: e_type.value==='ev'?e_etype.value:'',
    odometer_km: Number(e_odometer.value),
    quantity: Number(e_qty.value),
    unit: e_unit_label.innerText,
    price_per_unit: Number(e_price_per_unit.value),
    total_price: Number(e_total_price_label.innerText.replace(" ฿", "")),
    isFull: false,//e_isfull.checked,
    station_name: e_station_name.value,
    note: e_notes.value,
    logged_at: e_date.value,
  };

  const hash = JSON.stringify(payload);
  if (hash === LAST_ENERGY_HASH) {
    alert("⚠️ ข้อมูลซ้ำ ยังไม่ได้เปลี่ยนแปลง");
    return;
  }

  ENERGY_SUBMITTING = true;
  LAST_ENERGY_HASH = hash;

  const btn = document.querySelector(".sheet-body button");
  btn.disabled = true;
  btn.innerText = "กำลังบันทึก...";

  try {
    const res = await apiFetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res || res.status !== "ok") {
      throw new Error("API error");
    }

    alert("✅ บันทึกเรียบร้อย");
    closeEnergySheet();
    loadVehicleDetail(payload.vid); // refresh summary
  } catch (err) {
    console.error(err);
    alert("❌ บันทึกไม่สำเร็จ");
  } finally {
    btn.disabled = false;
    btn.innerText = "บันทึก";
    ENERGY_SUBMITTING = false;
  }
}

function fillStationOptions(type) {
  const select = document.getElementById("e_station_name");
  select.innerHTML = "";

  const list = type === "ev" ? EV_STATIONS_TH : FUEL_STATIONS_TH;

  list.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}
function validateOdometer(currentOdo) {
  const input = Number(document.getElementById("e_odometer")?.value || 0);
  if (input < currentOdo) {
    alert("❌ เลขไมล์น้อยกว่าครั้งก่อน");
    return false;
  }
  return true;
}
function getLocalDatetimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 16);
}
function resetEnergyForm() {
  e_station_name.value = "";
  e_etype.value = "dc";
  e_ftype.value = "g95";
  e_odometer.value = "";
  e_qty.value = "";
  e_price_per_unit.value = "";
  e_total_price_label.innerText = "0.00 ฿";
  e_notes.value = "";
  autoSetDate();
}


document.addEventListener("DOMContentLoaded", async () => {
  const ok = await ensureAuth?.();
  if (!ok) return;

  initVehiclePage();

  ["e_qty", "e_price_per_unit"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", calcTotal);
  });
});