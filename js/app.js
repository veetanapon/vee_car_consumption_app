// GAS_URL should be injected server-side or via build step

async function loadCars() {
  const res = await fetch(`${GAS_URL}?action=vehicles&uid=${USER_ID}`);//.then(r => r.json());
  const json = await res.json();
  const list = document.getElementById('carList');
  list.innerHTML = '';

  for (const v of json.vehicles) {
    const vid = v[0];
    const sum = await fetch(`${GAS_URL}?action=vehicle_summary&vid=${vid}`).then(r => r.json());

    const img = v[6]
      ? `https://drive.google.com/uc?id=${v[6]}`
      : 'https://via.placeholder.com/400x200?text=No+Image';


    list.innerHTML += `
      <div class="car-card">
        <img src="${img}" />
        <div class="car-name">${v[2]}</div>
        <div class="stats">
          <div class="stat">
            <span>เลขไมล์ล่าสุด</span>
            <strong>${sum.summary.last_odometer} km</strong>
          </div>
          <div class="stat">
            <span>ค่าใช้จ่ายรวม</span>
            <strong>฿${sum.summary.total_cost}</strong>
          </div>
        </div>
      </div>
    `;
  }
}


async function loadNotifications() {
  const res = await fetch(`${GAS_URL}?action=notifications&uid=${USER_ID}`);
  const json = await res.json();
  alert(json.notifications.map(n => n[4] + '\n' + n[5]).join('\n\n'));
}


(async () => {
  const ok = await ensureAuth();
  if (!ok) return;

  loadCars();
})();
