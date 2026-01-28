async function ensureAuth() {
  let uid = localStorage.getItem('uid');

  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('uid', uid);
  }

  const res = await fetch(`${GAS_URL}?action=auth&uid=${uid}`);
  const json = await res.json();

  // ❌ ไม่ผ่าน auth → เงียบ
  if (!json || json.auth_status !== 'allow') {
    document.body.innerHTML = '';
    return false;
  }

  return true;
}