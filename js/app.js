/* ================= GLOBAL ================= */
let imageBase64 = null;
let currentEditVid = null;

/* ================= API ================= */
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const json = await res.json();

    if (json && json.status === 'session_expired') {
      window.location.href = `${GAS_URL}?action=auth&uid=${USER_ID}`;
      return null;
    }
    return json;
  } catch (err) {
    console.error("Fetch error:", err);
    // กรณีที่ fetch พังเพราะ CORS หรือ Network
    return { status: 'error', message: err.message };
  }
}

async function loadCars() {
  const list = document.getElementById('carList');
  
  // 1. โชว์ Skeleton ระหว่างรอ
  if (list.innerHTML.trim() === "") renderSkeleton(3);

  // 2. ดึงข้อมูลครั้งเดียว (Single API Call)
  const json = await apiFetch(`${GAS_URL}?action=vehicles&uid=${USER_ID}`);
  if (!json || !json.vehicles) return;

  // 3. สร้าง HTML รวดเดียว
  let allCardsHTML = "";

  json.vehicles.forEach(v => {
    const img = v.imgId 
      ? `https://drive.google.com/thumbnail?id=${v.imgId}&sz=w400` 
      : 'https://via.placeholder.com/400x200?text=No+Image';
    // ต่อสตริง HTML ไปเรื่อยๆ
    allCardsHTML += `
      <div class="swipe-wrap" id="card-${v.vid}">
        <div class="swipe-actions">
          <div class="swipe-btn edit" onclick="editVehicle('${v.vid}')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
          </div>
          <div class="swipe-btn delete" onclick="deleteVehicle('${v.vid}')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
        </div>
        <div class="car-card compact swipe-content" onclick="openVehicle('${v.vid}')">
          <div class="car-thumb"><img src="${img}"></div>
          <div class="car-info">
            <div class="car-header-row">
               <span class="car-title">${v.name}</span>
               <span class="car-subtitle">(${v.brand || ''} ${v.model || ''})</span>
            </div>
            <div class="car-stats-row">
              <div class="car-stat">
                <span class="label">เลขไมล์ปัจจุบัน</span>
                <span class="value">${v.summary.last_odometer.toLocaleString()} <small>km</small></span>
              </div>
              <div class="car-stat text-right">
                <span class="label">ค่าใช้จ่ายรวม</span>
                <span class="value">${v.summary.total_cost.toLocaleString()} <small>฿</small></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  // 3. เมื่อลูปเสร็จ ข้อมูลพร้อมแล้ว ค่อยเปลี่ยนหน้าจอจาก Skeleton เป็น Card จริงรวดเดียว
  list.innerHTML = allCardsHTML;
}

function openVehicle(vid) {
  window.location.href = `vehicle.html?vid=${vid}`;
}

function openAddVehicle() {
  currentEditVid = null;
  // Reset Form
  document.getElementById('v_name').value = '';
  document.getElementById('v_brand').value = '';
  document.getElementById('v_model').value = '';
  document.getElementById('v_odometer').value = '';
  document.getElementById('v_type').value = 'FUEL'; // Default ให้ตรงกับ value ใน HTML
  
  // แก้ไขจุดที่ Error: ใช้ span แทน h3 ให้ตรงกับ HTML ของคุณ
  const headerSpan = document.querySelector('.sheet-header span');
  if (headerSpan) headerSpan.innerText = "เพิ่มรถใหม่";

  const btn = document.querySelector('.sheet-body button:last-child');
  if (btn) {
    btn.innerText = "บันทึกข้อมูล";
    btn.onclick = () => submitVehicle('add_vehicle');
  }

  const s = document.getElementById('addSheet');
  s.classList.remove('hidden');
  requestAnimationFrame(() => s.classList.add('show'));
}

function closeAddVehicle() {
  const s = document.getElementById('addSheet');
  s.classList.remove('show');
  setTimeout(() => {
    s.classList.add('hidden');
    // Clear ข้อมูลหลังปิด
    imageBase64 = null;
    currentEditVid = null;
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreview').classList.add('hidden');
  }, 300);
}

/* ================= VEHICLE ================= */
async function submitVehicle(mode = 'add_vehicle') {
  if (!v_name.value || !v_brand.value) {
    alert("กรุณากรอกชื่อและยี่ห้อรถ");
    return;
  }

  const btn = document.querySelector('.sheet-body button');
  const originalText = btn.innerText;
  btn.innerText = "กำลังประมวลผล...";
  btn.disabled = true;

  const data = {
    action: mode,
    uid: USER_ID,
    vid: currentEditVid, // จะเป็น NULL ถ้าเป็น add_vehicle
    name: v_name.value.trim(),
    brand: v_brand.value.trim(),
    model: v_model.value.trim(),
    vehicle_type: v_type.value.toUpperCase(),
    initial_odometer: Number(v_odometer.value) || 0,
    image_base64: imageBase64 // ถ้าไม่ได้เลือกใหม่ จะส่ง NULL ไป (Backend จะใช้รูปเดิม)
  };

  try {
    const json = await apiFetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (json && json.status === 'ok') {
      alert(mode === 'add_vehicle' ? 'เพิ่มรถเรียบร้อย' : 'แก้ไขข้อมูลสำเร็จ');
      closeAddVehicle();
      loadCars();
    } else {
      throw new Error(json?.message || 'Error');
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

function toBase64(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(file);
  });
}

/* ================= IMAGE ================= */
function resizeImage(base64, maxW, maxH, cb) {
  const img = new Image();
  img.onload = () => {
    let { width, height } = img;

    if (width > maxW || height > maxH) {
      const scale = Math.min(maxW / width, maxH / height);
      width *= scale;
      height *= scale;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    cb(canvas.toDataURL('image/png', 0.85));
  };
  img.src = base64;
}

/* ================= IMAGE HANDLER (UPDATED) ================= */
document.getElementById('vehicleImage').addEventListener('change', e => {
  const file = e.target.files[0];
  const preview = document.getElementById('imagePreview');

  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    // ใช้ฟังก์ชัน resizeImage ที่คุณมีอยู่แล้ว เพื่อบีบอัดให้เหลือขนาดไม่เกิน 800px
    resizeImage(event.target.result, 400, 300, (resizedBase64) => {
      imageBase64 = resizedBase64;
      preview.src = resizedBase64;
      preview.classList.remove('hidden');
    });
  };
  reader.readAsDataURL(file);
});

/* ================= NOTIFICATION ================= */
async function loadNotifications() {
  const json = await apiFetch(
    `${GAS_URL}?action=notifications&uid=${USER_ID}`
  );
  if (!json) return;
  alert(json.notifications.map(n => n[4] + '\n' + n[5]).join('\n\n'));
}

const THEMES = ['theme-dark'];

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'theme-dark');
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = localStorage.getItem('theme') || 'light';
  const next = current === 'light' ? 'theme-dark' : 'light';
  applyTheme(next);
}

function renderSkeleton(count = 3) {
  const list = document.getElementById('carList');
  list.innerHTML = '';

  for (let i = 0; i < count; i++) {
    list.innerHTML += `
      <div class="skeleton-wrap">
        <div class="car-card skeleton-card">
          <div class="skeleton skeleton-thumb"></div>
          <div style="flex:1">
            <div class="skeleton skeleton-line long"></div>
            <div class="skeleton skeleton-line short"></div>
          </div>
        </div>
      </div>
    `;
  }
}
let startX = 0;

document.addEventListener('touchstart', e => {
  const card = e.target.closest('.swipe-content');
  if (!card) return;
  startX = e.touches[0].clientX;
});

document.addEventListener('touchend', e => {
  const card = e.target.closest('.swipe-content');
  if (!card) return;

  const endX = e.changedTouches[0].clientX;
  const diff = endX - startX;

  card.style.transform =
    diff < -60 ? 'translateX(-128px)' : 'translateX(0)';
});

// init
applyTheme(localStorage.getItem('theme') || 'light');
/* ================= INIT ================= */
(async () => {
  const ok = await ensureAuth();
  if (!ok) return;
  loadCars();
})();

async function editVehicle(vid) {
  // 1. เปิด Sheet ทันที
  const s = document.getElementById('addSheet');
  s.classList.remove('hidden');
  requestAnimationFrame(() => s.classList.add('show'));

  // 2. ดึงข้อมูล "ที่มีอยู่แล้วบนหน้าจอ" มาโชว์ก่อน
  // ค้นหา Card element ของรถคันนี้
  const card = document.getElementById(`card-${vid}`);
  const name = card.querySelector('.car-title').innerText;
  const brandModel = card.querySelector('.car-subtitle').innerText; // เช่น (Toyota Corolla)
  const imgUrl = card.querySelector('.car-thumb img').src;

  // หยอดข้อมูลพื้นฐานลง Form ทันที
  document.getElementById('v_name').value = name;
  // ตัดวงเล็บออกเพื่อแยก Brand/Model (ถ้าต้องการความเป๊ะ)
  const bm = brandModel.replace('(', '').replace(')', '').split(' ');
  document.getElementById('v_brand').value = bm[0] || '';
  document.getElementById('v_model').value = bm[1] || '';
  
  // โชว์รูปที่มีอยู่แล้วก่อน
  const preview = document.getElementById('imagePreview');
  preview.src = imgUrl;
  preview.classList.remove('hidden');

  // ตั้งค่าปุ่มและ Header รอไว้
  const headerSpan = document.querySelector('.sheet-header span');
  headerSpan.innerText = "แก้ไขข้อมูลรถ";
  currentEditVid = vid;

  const btn = document.querySelector('.sheet-body button:last-child');
  btn.innerText = "บันทึกการแก้ไข";
  btn.onclick = () => submitVehicle('edit_vehicle');

  // 3. (Background) ค่อยไปโหลดข้อมูลเชิงลึกจาก Server มาทับ
  try {
    const json = await apiFetch(`${GAS_URL}?action=vehicles&uid=${USER_ID}`);
    const fullData = json.vehicles.find(v => v.vid === vid);
    
    if (fullData) {
      // อัปเดตข้อมูลที่เหลือ (เช่น Type และ Odometer ตัวจริง)
      document.getElementById('v_type').value = fullData.type ? fullData.type.toLowerCase() : 'fuel';
      document.getElementById('v_odometer').value = fullData.initial_odo || 0;
      
      // ถ้าในเครื่องมีรูปใหม่กว่า (Drive ID) ก็โหลดทับ
      if (fullData.imgId) {
        preview.src = `https://drive.google.com/thumbnail?id=${fullData.imgId}&sz=w400`;
      }
    }
  } catch (err) {
    console.warn("Background fetch failed, but user can still edit basic info.");
  }
}
async function editVehicle1(vid) {
  // 1. สั่งเด้งหน้าต่างขึ้นมาทันที (ไม่ต้องรอ API)
  const s = document.getElementById('addSheet');
  s.classList.remove('hidden');
  requestAnimationFrame(() => s.classList.add('show'));

  // 2. เปลี่ยนหัวข้อและแสดงสถานะว่ากำลังโหลดข้อมูลมาใส่
  const headerSpan = document.querySelector('.sheet-header span');
  if (headerSpan) headerSpan.innerText = "กำลังโหลดข้อมูล...";
  
  // ล้างค่าใน Form รอไว้ก่อน
  document.getElementById('v_name').value = '...';
  document.getElementById('v_brand').value = '...';

  try {
    // 3. ดึงข้อมูลจาก API (ยิงไปหา GAS)
    const json = await apiFetch(`${GAS_URL}?action=vehicles&uid=${USER_ID}`);
    const car = json.vehicles.find(v => v.vid === vid);
    
    if (!car) {
        alert("ไม่พบข้อมูลรถ");
        closeAddVehicle();
        return;
    }

    // 4. ข้อมูลมาแล้ว หยอดลง Form ทันที
    currentEditVid = vid;
    document.getElementById('v_name').value = car.name || '';
    document.getElementById('v_brand').value = car.brand || '';
    document.getElementById('v_model').value = car.model || '';
    document.getElementById('v_type').value = car.type ? car.type.toLowerCase() : 'fuel';
    document.getElementById('v_odometer').value = car.initial_odo || 0;
    
    // จัดการรูปภาพ Preview
    const preview = document.getElementById('imagePreview');
    if (car.imgId) {
      preview.src = `https://drive.google.com/thumbnail?id=${car.imgId}&sz=w400`;
      preview.classList.remove('hidden');
    }

    // 5. ปรับ Header และปุ่มให้พร้อมสำหรับการกด Save
    if (headerSpan) headerSpan.innerText = "แก้ไขข้อมูลรถ";
    const btn = document.querySelector('.sheet-body button:last-child');
    if (btn) {
      btn.innerText = "บันทึกการแก้ไข";
      btn.onclick = () => submitVehicle('edit_vehicle');
    }

  } catch (err) {
    console.error(err);
    alert("โหลดข้อมูลผิดพลาด");
    closeAddVehicle();
  }
}

async function deleteVehicle(vid) {
  if (!confirm('ลบรถคันนี้?')) return;
  // 1. ค้นหา HTML Element ของ Card นี้
  // เราจะหาปุ่มที่ถูกกด แล้วไล่ขึ้นไปหาตัวที่เป็น .swipe-wrap
  const btn = event.target.closest('.swipe-btn'); 
  const cardElement = event.target.closest('.swipe-wrap');

  if (cardElement) {
    // 2. ซ่อน Card ทันที (Optimistic Update)
    cardElement.style.transition = 'all 0.4s ease';
    cardElement.style.opacity = '0';
    cardElement.style.transform = 'translateX(-100%)';
    
    // หลังจาก Animation จบ ให้เอาออกไปเลยเพื่อให้พื้นที่ขยับขึ้นมา
    setTimeout(() => {
      cardElement.style.display = 'none';
    }, 400);
  }

  // 3. ส่งข้อมูลไปบอก Server เบื้องหลัง
  const data = {
    action: 'delete_vehicle',
    uid: USER_ID,
    vid: vid
  };

  try {
    const json = await apiFetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (json && json.status === 'ok') {
      //console.log(`Vehicle ${vid} is now inactive.`);
    } else {
      throw new Error(json?.message || 'Delete failed');
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการลบ: ' + err.message);
    // ถ้าลบไม่สำเร็จจริงๆ อาจจะโชว์ Card กลับมา (Optional)
    if (cardElement) {
      cardElement.style.display = 'block';
      cardElement.style.opacity = '1';
      cardElement.style.transform = 'translateX(0)';
    }
  }
}